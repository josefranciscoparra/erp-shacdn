import { randomBytes } from "crypto";

import { NextRequest, NextResponse } from "next/server";

import { features } from "@/config/features";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateFileHash } from "@/lib/signatures/hash";
import { createSignaturePendingNotification } from "@/lib/signatures/notifications";
import { signatureStorageService } from "@/lib/signatures/storage";
import { createSignatureRequestSchema, signatureRequestFiltersSchema } from "@/lib/validations/signature";

export const runtime = "nodejs";

/**
 * GET /api/signatures/requests
 * Lista todas las solicitudes de firma (vista HR/Admin)
 */
export async function GET(request: NextRequest) {
  if (!features.signatures) {
    return NextResponse.json({ error: "El módulo de firmas está deshabilitado" }, { status: 503 });
  }

  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Solo HR_ADMIN, ORG_ADMIN y SUPER_ADMIN pueden ver todas las solicitudes
    const allowedRoles = ["HR_ADMIN", "ORG_ADMIN", "SUPER_ADMIN"];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    // Obtener parámetros de consulta
    const searchParams = request.nextUrl.searchParams;
    const filters = signatureRequestFiltersSchema.parse({
      status: searchParams.get("status") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      dateFrom: searchParams.get("dateFrom") ?? undefined,
      dateTo: searchParams.get("dateTo") ?? undefined,
      page: Number.parseInt(searchParams.get("page") ?? "1"),
      limit: Number.parseInt(searchParams.get("limit") ?? "10"),
      search: searchParams.get("search") ?? undefined,
    });

    // Construir filtros para Prisma
    const whereClause: any = {
      orgId: session.user.orgId,
    };

    if (filters.status) {
      whereClause.status = filters.status;
    }

    // Construir filtros del documento de forma combinada
    const documentFilters: any = {};

    if (filters.category) {
      documentFilters.category = filters.category;
    }

    if (filters.search) {
      documentFilters.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (Object.keys(documentFilters).length > 0) {
      whereClause.document = documentFilters;
    }

    if (filters.dateFrom || filters.dateTo) {
      whereClause.createdAt = {};
      if (filters.dateFrom) {
        whereClause.createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        whereClause.createdAt.lte = new Date(filters.dateTo);
      }
    }

    // Obtener solicitudes con paginación
    const [requests, totalCount] = await Promise.all([
      prisma.signatureRequest.findMany({
        where: whereClause,
        include: {
          document: {
            select: {
              id: true,
              title: true,
              description: true,
              category: true,
              originalFileUrl: true,
              fileSize: true,
              version: true,
              createdAt: true,
            },
          },
          signers: {
            include: {
              employee: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  employeeNumber: true,
                },
              },
            },
            orderBy: { order: "asc" },
          },
          _count: {
            select: {
              signers: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.signatureRequest.count({ where: whereClause }),
    ]);

    // Transformar fechas para el cliente
    const transformedRequests = requests.map((req) => ({
      ...req,
      createdAt: req.createdAt.toISOString(),
      completedAt: req.completedAt?.toISOString() ?? null,
      expiresAt: req.expiresAt.toISOString(),
      document: {
        ...req.document,
        createdAt: req.document.createdAt.toISOString(),
      },
      signers: req.signers.map((signer) => ({
        ...signer,
        signedAt: signer.signedAt?.toISOString() ?? null,
        rejectedAt: signer.rejectedAt?.toISOString() ?? null,
        consentGivenAt: signer.consentGivenAt?.toISOString() ?? null,
        createdAt: signer.createdAt.toISOString(),
        updatedAt: signer.updatedAt.toISOString(),
      })),
    }));

    return NextResponse.json({
      requests: transformedRequests,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / filters.limit),
      },
    });
  } catch (error) {
    console.error("❌ Error al obtener solicitudes de firma:", error);
    console.error("Stack trace:", error instanceof Error ? error.stack : "No stack trace");
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/signatures/requests
 * Crea una nueva solicitud de firma con documento
 */
export async function POST(request: NextRequest) {
  if (!features.signatures) {
    return NextResponse.json({ error: "El módulo de firmas está deshabilitado" }, { status: 503 });
  }

  try {
    const session = await auth();
    if (!session?.user?.orgId || !session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Solo HR_ADMIN, ORG_ADMIN y SUPER_ADMIN pueden crear solicitudes
    const allowedRoles = ["HR_ADMIN", "ORG_ADMIN", "SUPER_ADMIN"];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const formData = await request.formData();

    // Validar datos
    const data = createSignatureRequestSchema.parse({
      documentId: formData.get("documentId"),
      policy: formData.get("policy") ?? "SES",
      expiresAt: new Date(formData.get("expiresAt") as string),
      signers: JSON.parse(formData.get("signers") as string),
    });

    // Verificar que el documento existe y pertenece a la organización
    const document = await prisma.signableDocument.findUnique({
      where: { id: data.documentId },
    });

    if (!document || document.orgId !== session.user.orgId) {
      return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
    }

    // Verificar que todos los empleados existen y pertenecen a la organización
    const employeeIds = data.signers.map((s) => s.employeeId);
    const employees = await prisma.employee.findMany({
      where: {
        id: { in: employeeIds },
        orgId: session.user.orgId,
      },
      include: {
        user: {
          select: {
            id: true,
          },
        },
      },
    });

    if (employees.length !== employeeIds.length) {
      return NextResponse.json({ error: "Uno o más empleados no fueron encontrados" }, { status: 400 });
    }

    // Crear la solicitud de firma con los firmantes
    const signatureRequest = await prisma.signatureRequest.create({
      data: {
        orgId: session.user.orgId,
        documentId: data.documentId,
        policy: data.policy,
        expiresAt: data.expiresAt,
        status: "PENDING",
        signers: {
          create: data.signers.map((signer) => ({
            employeeId: signer.employeeId,
            order: signer.order,
            status: "PENDING",
            signToken: randomBytes(32).toString("hex"), // Token único para firma
          })),
        },
      },
      include: {
        document: true,
        signers: {
          include: {
            employee: {
              include: {
                user: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Crear notificaciones para cada firmante
    const notificationPromises = signatureRequest.signers.map((signer) => {
      if (!signer.employee.user) return null;

      return createSignaturePendingNotification({
        orgId: session.user.orgId,
        userId: signer.employee.user.id,
        documentTitle: signatureRequest.document.title,
        requestId: signatureRequest.id,
        expiresAt: signatureRequest.expiresAt,
      });
    });

    await Promise.all(notificationPromises.filter(Boolean));

    return NextResponse.json(
      {
        success: true,
        request: {
          ...signatureRequest,
          createdAt: signatureRequest.createdAt.toISOString(),
          expiresAt: signatureRequest.expiresAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("❌ Error al crear solicitud de firma:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

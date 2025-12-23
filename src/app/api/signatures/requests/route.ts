import { randomBytes } from "crypto";

import { NextRequest, NextResponse } from "next/server";

import { Prisma, Role } from "@prisma/client";

import { features } from "@/config/features";
import { auth } from "@/lib/auth";
import { computeEffectivePermissions } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import {
  createSignatureRequestSchema,
  signatureRequestFiltersSchema,
  type SignatureRequestStatus,
} from "@/lib/validations/signature";

export const runtime = "nodejs";

/**
 * GET /api/signatures/requests
 * Lista todas las solicitudes de firma (permiso manage_documents)
 */
export async function GET(request: NextRequest) {
  if (!features.signatures) {
    return NextResponse.json({ error: "El módulo de firmas está deshabilitado" }, { status: 503 });
  }

  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.orgId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const effectivePermissions = await computeEffectivePermissions({
      role: session.user.role as Role,
      orgId: session.user.orgId,
      userId: session.user.id,
    });

    if (!effectivePermissions.has("manage_documents")) {
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
    const whereClause: Prisma.SignatureRequestWhereInput = {
      orgId: session.user.orgId,
    };

    if (filters.status) {
      whereClause.status = filters.status;
    }

    const andFilters: Prisma.SignatureRequestWhereInput[] = [];

    if (filters.category) {
      andFilters.push({ document: { category: filters.category } });
    }

    if (filters.search) {
      const search = filters.search.trim();
      if (search.length > 0) {
        andFilters.push({
          OR: [
            { document: { title: { contains: search, mode: "insensitive" } } },
            { document: { description: { contains: search, mode: "insensitive" } } },
            {
              signers: {
                some: {
                  employee: {
                    OR: [
                      { firstName: { contains: search, mode: "insensitive" } },
                      { lastName: { contains: search, mode: "insensitive" } },
                      { employeeNumber: { contains: search, mode: "insensitive" } },
                      { email: { contains: search, mode: "insensitive" } },
                    ],
                  },
                },
              },
            },
          ],
        });
      }
    }

    if (filters.employeeId) {
      andFilters.push({ signers: { some: { employeeId: filters.employeeId } } });
    }

    if (filters.dateFrom || filters.dateTo) {
      const dateFilter: Prisma.SignatureRequestWhereInput["createdAt"] = {};
      if (filters.dateFrom) {
        dateFilter.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        dateFilter.lte = new Date(filters.dateTo);
      }
      andFilters.push({ createdAt: dateFilter });
    }

    if (andFilters.length > 0) {
      whereClause.AND = andFilters;
    }

    // Obtener solicitudes con paginación
    const [requests, totalCount, statusCounts] = await Promise.all([
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
      prisma.signatureRequest.groupBy({
        by: ["status"],
        where: { orgId: session.user.orgId },
        _count: { status: true },
      }),
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

    const summaryByStatus: Record<SignatureRequestStatus, number> = {
      PENDING: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      REJECTED: 0,
      EXPIRED: 0,
    };

    statusCounts.forEach((item) => {
      switch (item.status as SignatureRequestStatus) {
        case "PENDING":
          summaryByStatus.PENDING = item._count.status;
          break;
        case "IN_PROGRESS":
          summaryByStatus.IN_PROGRESS = item._count.status;
          break;
        case "COMPLETED":
          summaryByStatus.COMPLETED = item._count.status;
          break;
        case "REJECTED":
          summaryByStatus.REJECTED = item._count.status;
          break;
        case "EXPIRED":
          summaryByStatus.EXPIRED = item._count.status;
          break;
        default:
          break;
      }
    });

    return NextResponse.json({
      requests: transformedRequests,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / filters.limit),
      },
      summary: {
        total: totalCount,
        byStatus: summaryByStatus,
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

    const effectivePermissions = await computeEffectivePermissions({
      role: session.user.role as Role,
      orgId: session.user.orgId,
      userId: session.user.id,
    });

    if (!effectivePermissions.has("manage_documents")) {
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

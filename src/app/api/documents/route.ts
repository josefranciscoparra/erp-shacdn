import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { documentFiltersSchema } from "@/lib/validations/document";
import { features } from "@/config/features";

export async function GET(request: NextRequest) {
  if (!features.documents) {
    return NextResponse.json(
      { error: "El módulo de documentos está deshabilitado" },
      { status: 503 }
    );
  }

  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener parámetros de consulta
    const searchParams = request.nextUrl.searchParams;
    const filters = documentFiltersSchema.parse({
      employeeId: searchParams.get("employeeId") || undefined,
      documentKind: searchParams.get("documentKind") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "20"),
      search: searchParams.get("search") || undefined,
    });

    // Construir filtros para Prisma
    const whereClause: any = {
      orgId: session.user.orgId,
    };

    if (filters.employeeId) {
      whereClause.employeeId = filters.employeeId;
    }

    if (filters.documentKind) {
      whereClause.kind = filters.documentKind;
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

    if (filters.search) {
      whereClause.OR = [
        { fileName: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
        {
          employee: {
            OR: [
              { firstName: { contains: filters.search, mode: "insensitive" } },
              { lastName: { contains: filters.search, mode: "insensitive" } },
              { employeeNumber: { contains: filters.search, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    // Obtener documentos con paginación
    const [documents, totalCount] = await Promise.all([
      prisma.employeeDocument.findMany({
        where: whereClause,
        include: {
          uploadedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeNumber: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.employeeDocument.count({ where: whereClause }),
    ]);

    // Transformar fechas para el cliente
    const transformedDocuments = documents.map((doc) => ({
      ...doc,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      documents: transformedDocuments,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / filters.limit),
      },
    });
  } catch (error) {
    console.error("❌ Error al obtener documentos:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

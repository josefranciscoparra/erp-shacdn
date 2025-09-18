import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { documentFiltersSchema } from "@/lib/validations/document";

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id: employeeId } = await params;
    
    // Validar que el empleado existe y pertenece a la organización
    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        orgId: session.user.orgId,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
    }

    // Obtener parámetros de consulta
    const searchParams = request.nextUrl.searchParams;
    const filters = documentFiltersSchema.parse({
      employeeId,
      documentKind: searchParams.get("documentKind") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "10"),
      search: searchParams.get("search") || undefined,
    });

    // Construir filtros para Prisma
    const whereClause: any = {
      employeeId,
      orgId: session.user.orgId,
    };

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id: employeeId } = await params;
    const { searchParams } = request.nextUrl;
    const documentId = searchParams.get("documentId");

    if (!documentId) {
      return NextResponse.json({ error: "ID de documento requerido" }, { status: 400 });
    }

    // Verificar que el documento existe y pertenece a la organización
    const document = await prisma.employeeDocument.findFirst({
      where: {
        id: documentId,
        employeeId,
        orgId: session.user.orgId,
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
    }

    // TODO: Eliminar archivo del storage
    // await documentStorageService.deleteDocument(document.storageUrl);

    // Eliminar registro de la base de datos
    await prisma.employeeDocument.delete({
      where: { id: documentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error al eliminar documento:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { documentStorageService } from "@/lib/storage";
import { finalizeStoredFileDeletion, markStoredFileAsDeleted } from "@/lib/storage/storage-ledger";
import { documentFiltersSchema } from "@/lib/validations/document";
import { isModuleAvailableForOrg } from "@/server/guards/module-availability";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const orgId = session.user.activeOrgId ?? session.user.orgId;
    const documentsAvailable = await isModuleAvailableForOrg(orgId, "documents");
    if (!documentsAvailable) {
      return NextResponse.json({ error: "El módulo de documentos está deshabilitado" }, { status: 403 });
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
      documentKind: searchParams.get("documentKind") ?? undefined,
      dateFrom: searchParams.get("dateFrom") ?? undefined,
      dateTo: searchParams.get("dateTo") ?? undefined,
      page: parseInt(searchParams.get("page") ?? "1"),
      limit: parseInt(searchParams.get("limit") ?? "10"),
      search: searchParams.get("search") ?? undefined,
    });

    // Construir filtros para Prisma
    // Excluir documentos eliminados (deletedAt != null van a la Papelera Legal)
    const whereClause: any = {
      employeeId,
      orgId: session.user.orgId,
      deletedAt: null, // Solo documentos activos
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

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const orgId = session.user.activeOrgId ?? session.user.orgId;
    const documentsAvailable = await isModuleAvailableForOrg(orgId, "documents");
    if (!documentsAvailable) {
      return NextResponse.json({ error: "El módulo de documentos está deshabilitado" }, { status: 403 });
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
      include: {
        storedFile: true,
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
    }

    // NUEVO FLUJO: Papelera Legal (soft delete)
    // El documento se mueve a la papelera, NO se elimina físicamente hasta que expire la retención

    if (document.storedFileId && document.storedFile) {
      // 1. Soft delete del StoredFile (siempre permitido excepto legalHold)
      let markedFile;
      try {
        markedFile = await markStoredFileAsDeleted(document.storedFileId, session.user.id);
      } catch (storageError) {
        console.error("⚠️ Error al marcar archivo como eliminado:", storageError);
        return NextResponse.json(
          {
            error:
              storageError instanceof Error
                ? storageError.message
                : "No se puede eliminar el documento por obligación legal",
          },
          { status: 409 },
        );
      }

      // 2. Soft delete del EmployeeDocument (mover a papelera)
      await prisma.employeeDocument.update({
        where: { id: documentId },
        data: {
          deletedAt: new Date(),
          deletedById: session.user.id,
        },
      });

      // 3. Best-effort purge físico - Solo si no hay retención activa
      let purged = false;
      try {
        await documentStorageService.deleteDocument(document.storageUrl);
        await finalizeStoredFileDeletion(markedFile);
        purged = true;
      } catch {
        // Best-effort: si falla el purge, el archivo queda en papelera
        console.info("📁 Documento movido a papelera (retención vigente o purge fallido)");
      }

      // Si se purgó completamente, eliminar el EmployeeDocument
      if (purged) {
        await prisma.employeeDocument.delete({
          where: { id: documentId },
        });
        return NextResponse.json({ success: true, message: "Documento eliminado permanentemente" });
      }

      // Retornar mensaje de papelera con fecha de retención
      const retainUntil = document.storedFile.retainUntil;
      return NextResponse.json({
        success: true,
        message: retainUntil
          ? `Documento movido a la papelera. Se conservará hasta ${retainUntil.toLocaleDateString("es-ES")} por retención legal.`
          : "Documento movido a la papelera.",
        movedToTrash: true,
        retainUntil: retainUntil?.toISOString() ?? null,
      });
    }

    // Documentos legacy sin ledger - eliminar directamente
    if (!document.storedFileId) {
      try {
        await documentStorageService.deleteDocument(document.storageUrl);
      } catch (storageError) {
        console.error("⚠️ Error al eliminar del storage (legacy):", storageError);
      }
    }

    await prisma.employeeDocument.delete({
      where: { id: documentId },
    });

    return NextResponse.json({ success: true, message: "Documento eliminado" });
  } catch (error) {
    console.error("❌ Error al eliminar documento:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

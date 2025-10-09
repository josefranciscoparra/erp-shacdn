import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { documentStorageService } from "@/lib/storage";
import { documentKindSchema } from "@/lib/validations/document";
import { z } from "zod";

// Tipos de documentos que los empleados pueden subir
const EMPLOYEE_ALLOWED_DOCUMENT_TYPES = ["MEDICAL", "CERTIFICATE", "OTHER"] as const;

// Límites por tipo de documento
const EMPLOYEE_UPLOAD_LIMITS: Record<string, number> = {
  MEDICAL: 50,      // Máximo 50 justificantes médicos
  CERTIFICATE: 50,  // Máximo 50 certificados
  OTHER: 100,       // Máximo 100 otros documentos
};

// Schema para validar form data
const uploadFormSchema = z.object({
  documentKind: documentKindSchema.refine(
    (kind) => EMPLOYEE_ALLOWED_DOCUMENT_TYPES.includes(kind as any),
    { message: "Tipo de documento no permitido para empleados" }
  ),
  description: z.string().optional(),
});

/**
 * GET /api/me/documents
 * Obtiene los documentos del empleado autenticado
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.orgId || !session?.user?.employeeId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener parámetros de consulta
    const searchParams = request.nextUrl.searchParams;
    const documentKind = searchParams.get("documentKind");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Construir filtros para Prisma
    const whereClause: any = {
      employeeId: session.user.employeeId,
      orgId: session.user.orgId,
    };

    if (documentKind) {
      whereClause.kind = documentKind;
    }

    if (search) {
      whereClause.OR = [
        { fileName: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
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
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.employeeDocument.count({ where: whereClause }),
    ]);

    // Transformar fechas para el cliente
    const transformedDocuments = documents.map((doc) => ({
      ...doc,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      canDelete: doc.uploadedById === session.user.id &&
                 EMPLOYEE_ALLOWED_DOCUMENT_TYPES.includes(doc.kind as any),
    }));

    return NextResponse.json({
      documents: transformedDocuments,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("❌ Error al obtener documentos:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

/**
 * POST /api/me/documents
 * Permite al empleado subir documentos de tipos permitidos
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.orgId || !session?.user?.employeeId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const documentKind = formData.get("documentKind") as string;
    const description = formData.get("description") as string | null;

    // Validar archivo
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
    }

    // Validar datos del formulario
    const validationResult = uploadFormSchema.safeParse({
      documentKind,
      description: description || undefined,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Datos inválidos",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { documentKind: validDocumentKind, description: validDescription } =
      validationResult.data;

    // Verificar límite de documentos por tipo
    const currentCount = await prisma.employeeDocument.count({
      where: {
        employeeId: session.user.employeeId,
        orgId: session.user.orgId,
        kind: validDocumentKind,
      },
    });

    const limit = EMPLOYEE_UPLOAD_LIMITS[validDocumentKind] || 100;
    if (currentCount >= limit) {
      return NextResponse.json(
        {
          error: `Has alcanzado el límite de ${limit} documentos de tipo ${validDocumentKind}`,
        },
        { status: 400 }
      );
    }

    // Validar archivo
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "El archivo es demasiado grande (máximo 10MB)" },
        { status: 400 }
      );
    }

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Tipo de archivo no permitido. Solo se permiten PDF, DOC, DOCX, JPG, PNG, WEBP",
        },
        { status: 400 }
      );
    }

    // Subir archivo al storage
    const uploadResult = await documentStorageService.uploadEmployeeDocument(
      session.user.orgId,
      session.user.employeeId,
      file,
      validDocumentKind,
      {
        uploadedBy: session.user.name || session.user.email,
        uploadedById: session.user.id,
      }
    );

    // Guardar metadata en la base de datos
    const document = await prisma.employeeDocument.create({
      data: {
        kind: validDocumentKind,
        fileName: file.name,
        storageUrl: uploadResult.path,
        fileSize: uploadResult.size,
        mimeType: uploadResult.mimeType,
        description: validDescription,
        orgId: session.user.orgId,
        employeeId: session.user.employeeId,
        uploadedById: session.user.id,
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Transformar fechas para el cliente
    const transformedDocument = {
      ...document,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
      canDelete: true, // El empleado puede eliminar lo que subió
    };

    return NextResponse.json({
      success: true,
      document: transformedDocument,
    });
  } catch (error) {
    console.error("❌ Error al subir documento:", error);

    // Manejar errores específicos del storage
    if (error instanceof Error) {
      if (error.message.includes("Tipo de archivo no permitido")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (error.message.includes("demasiado grande")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/me/documents
 * Permite al empleado eliminar documentos que él mismo subió
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.orgId || !session?.user?.employeeId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const documentId = searchParams.get("documentId");

    if (!documentId) {
      return NextResponse.json(
        { error: "ID de documento requerido" },
        { status: 400 }
      );
    }

    // Verificar que el documento existe y fue subido por el empleado actual
    const document = await prisma.employeeDocument.findFirst({
      where: {
        id: documentId,
        employeeId: session.user.employeeId,
        orgId: session.user.orgId,
        uploadedById: session.user.id, // Solo puede eliminar lo que subió
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Documento no encontrado o no tienes permiso para eliminarlo" },
        { status: 404 }
      );
    }

    // Verificar que sea un tipo de documento que el empleado puede eliminar
    if (!EMPLOYEE_ALLOWED_DOCUMENT_TYPES.includes(document.kind as any)) {
      return NextResponse.json(
        { error: "No tienes permiso para eliminar este tipo de documento" },
        { status: 403 }
      );
    }

    // Eliminar archivo del storage
    try {
      await documentStorageService.deleteDocument(document.storageUrl);
    } catch (storageError) {
      console.error("⚠️ Error al eliminar del storage:", storageError);
      // Continuar aunque falle el borrado del storage
    }

    // Eliminar registro de la base de datos
    await prisma.employeeDocument.delete({
      where: { id: documentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error al eliminar documento:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

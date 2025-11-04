import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getStorageProvider } from "@/lib/storage";
import { getAuthenticatedEmployee } from "@/server/actions/shared/get-authenticated-employee";

/**
 * POST /api/expenses/[id]/attachments
 * Sube un adjunto a un gasto
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: expenseId } = await params;
    const { employee } = await getAuthenticatedEmployee();

    // Verificar que el gasto existe y pertenece al empleado
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
    });

    if (!expense) {
      return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 });
    }

    if (expense.employeeId !== employee.id) {
      return NextResponse.json(
        { error: "No tienes permisos para adjuntar archivos a este gasto" },
        { status: 403 }
      );
    }

    if (expense.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Solo se pueden adjuntar archivos a gastos en borrador" },
        { status: 400 }
      );
    }

    // Obtener el archivo del FormData
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó ningún archivo" }, { status: 400 });
    }

    // Validar tamaño (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "El archivo no puede exceder 10MB" },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de archivo no permitido. Solo se permiten imágenes (JPEG, PNG, WebP) y PDF" },
        { status: 400 }
      );
    }

    // Generar path para el archivo
    const timestamp = Date.now();
    const extension = file.name.split(".").pop();
    const sanitizedName = file.name
      .replace(`.${extension}`, "")
      .replace(/[^a-zA-Z0-9.-]/g, "_")
      .toLowerCase();
    const finalFileName = `${timestamp}-${sanitizedName}.${extension}`;
    const filePath = `org-${employee.orgId}/expenses/${expenseId}/attachments/${finalFileName}`;

    // Subir archivo al storage
    const storageProvider = getStorageProvider();
    const uploadResult = await storageProvider.upload(file, filePath, {
      mimeType: file.type,
      metadata: {
        orgId: employee.orgId,
        expenseId,
        employeeId: employee.id,
        originalName: file.name,
      },
    });

    // Crear registro en la base de datos
    const attachment = await prisma.expenseAttachment.create({
      data: {
        url: uploadResult.url,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        expenseId,
      },
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    console.error("Error en POST /api/expenses/[id]/attachments:", error);
    return NextResponse.json(
      { error: "Error al subir archivo" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/expenses/[id]/attachments
 * Obtiene los adjuntos de un gasto
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: expenseId } = await params;
    const { employee, user } = await getAuthenticatedEmployee();

    // Verificar que el gasto existe
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        approvals: {
          select: {
            approverId: true,
          },
        },
      },
    });

    if (!expense) {
      return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 });
    }

    // Validar permisos: solo el owner o el aprobador pueden ver los adjuntos
    const isOwner = expense.employeeId === employee.id;
    const isApprover = expense.approvals.some((approval) => approval.approverId === user.id);

    if (!isOwner && !isApprover) {
      return NextResponse.json(
        { error: "No tienes permisos para ver los adjuntos de este gasto" },
        { status: 403 }
      );
    }

    // Obtener adjuntos
    const attachments = await prisma.expenseAttachment.findMany({
      where: { expenseId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(attachments);
  } catch (error) {
    console.error("Error en GET /api/expenses/[id]/attachments:", error);
    return NextResponse.json(
      { error: "Error al obtener adjuntos" },
      { status: 500 }
    );
  }
}

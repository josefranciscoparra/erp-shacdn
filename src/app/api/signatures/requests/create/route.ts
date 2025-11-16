import { randomBytes } from "crypto";

import { NextRequest, NextResponse } from "next/server";

import { features } from "@/config/features";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSignaturePendingNotification } from "@/lib/signatures/notifications";

export const runtime = "nodejs";

/**
 * POST /api/signatures/requests/create
 * Crea una nueva SignatureRequest con resolución de empleados
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
    const documentId = formData.get("documentId") as string;
    const policy = formData.get("policy") as string;
    const expiresAtStr = formData.get("expiresAt") as string;
    const recipientType = formData.get("recipientType") as "ALL" | "DEPARTMENTS" | "SPECIFIC";

    if (!documentId || !policy || !expiresAtStr || !recipientType) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    const expiresAt = new Date(expiresAtStr);

    // Verificar que el documento existe y pertenece a la organización
    const document = await prisma.signableDocument.findUnique({
      where: { id: documentId },
    });

    if (!document || document.orgId !== session.user.orgId) {
      return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
    }

    // Resolver empleados según el tipo de destinatario
    let employeeIds: string[] = [];

    if (recipientType === "ALL") {
      // Todos los empleados activos de la organización
      const employees = await prisma.employee.findMany({
        where: {
          orgId: session.user.orgId,
          active: true,
        },
        select: { id: true },
      });
      employeeIds = employees.map((emp) => emp.id);
    } else if (recipientType === "DEPARTMENTS") {
      // Empleados de departamentos específicos
      const departmentIdsStr = formData.get("departmentIds") as string;
      if (!departmentIdsStr) {
        return NextResponse.json({ error: "Debes seleccionar al menos un departamento" }, { status: 400 });
      }

      const departmentIds = JSON.parse(departmentIdsStr) as string[];

      const employees = await prisma.employee.findMany({
        where: {
          orgId: session.user.orgId,
          active: true,
          contracts: {
            some: {
              departmentId: { in: departmentIds },
              status: "ACTIVE",
            },
          },
        },
        select: { id: true },
        distinct: ["id"],
      });
      employeeIds = employees.map((emp) => emp.id);
    } else if (recipientType === "SPECIFIC") {
      // Empleados específicos
      const employeeIdsStr = formData.get("employeeIds") as string;
      if (!employeeIdsStr) {
        return NextResponse.json({ error: "Debes seleccionar al menos un empleado" }, { status: 400 });
      }

      employeeIds = JSON.parse(employeeIdsStr) as string[];

      // Verificar que los empleados existen, pertenecen a la organización y están activos
      const employees = await prisma.employee.findMany({
        where: {
          id: { in: employeeIds },
          orgId: session.user.orgId,
          active: true,
        },
        select: { id: true },
      });

      if (employees.length !== employeeIds.length) {
        return NextResponse.json(
          { error: "Uno o más empleados no fueron encontrados o están inactivos" },
          { status: 400 },
        );
      }
    }

    if (employeeIds.length === 0) {
      return NextResponse.json({ error: "No se encontraron empleados para esta solicitud" }, { status: 400 });
    }

    // Crear la solicitud de firma con los firmantes
    const signatureRequest = await prisma.signatureRequest.create({
      data: {
        orgId: session.user.orgId,
        documentId,
        policy,
        expiresAt,
        status: "PENDING",
        signers: {
          create: employeeIds.map((empId, index) => ({
            employeeId: empId,
            order: index + 1,
            status: "PENDING",
            signToken: randomBytes(32).toString("hex"),
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
                  select: { id: true },
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
          id: signatureRequest.id,
          signerCount: signatureRequest.signers.length,
          expiresAt: signatureRequest.expiresAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("❌ Error al crear solicitud de firma:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

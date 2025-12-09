import { randomBytes } from "crypto";

import { NextRequest, NextResponse } from "next/server";

import type { SecondSignerRole } from "@prisma/client";

import { features } from "@/config/features";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveSecondSigner } from "@/lib/signatures/double-signature";
import { createSignaturePendingNotification } from "@/lib/signatures/notifications";

export const runtime = "nodejs";

const uniqueValues = (values: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    result.push(value);
  }

  return result;
};

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
    const additionalSignerIdsStr = formData.get("additionalSignerEmployeeIds") as string | null;
    let additionalSignerEmployeeIds: string[] = [];
    if (additionalSignerIdsStr) {
      try {
        const parsed = JSON.parse(additionalSignerIdsStr);
        if (Array.isArray(parsed)) {
          additionalSignerEmployeeIds = parsed.filter((value): value is string => typeof value === "string");
        }
      } catch (error) {
        console.error("Error parsing additionalSignerEmployeeIds", error);
        return NextResponse.json({ error: "Formato inválido para firmantes adicionales" }, { status: 400 });
      }
    }

    // Campos para doble firma
    const requireDoubleSignature = formData.get("requireDoubleSignature") === "true";
    const secondSignerRole = formData.get("secondSignerRole") as SecondSignerRole | null;
    const secondSignerUserId = formData.get("secondSignerUserId") as string | null;

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

    const recipientEmployeeIds = uniqueValues(employeeIds);

    const recipients = await prisma.employee.findMany({
      where: {
        id: { in: recipientEmployeeIds },
        orgId: session.user.orgId,
        active: true,
        user: { isNot: null },
      },
      select: {
        id: true,
        user: {
          select: { id: true },
        },
      },
    });

    if (recipients.length !== recipientEmployeeIds.length) {
      return NextResponse.json(
        { error: "Uno o más destinatarios no tienen usuario activo o no pertenecen a tu organización" },
        { status: 400 },
      );
    }

    const recipientUserMap = new Map(recipients.map((recipient) => [recipient.id, recipient.user!.id]));

    const uniqueAdditionalSignerIds = uniqueValues(additionalSignerEmployeeIds);
    const additionalSigners = uniqueAdditionalSignerIds.length
      ? await prisma.employee.findMany({
          where: {
            id: { in: uniqueAdditionalSignerIds },
            orgId: session.user.orgId,
            active: true,
            user: { isNot: null },
          },
          select: { id: true },
        })
      : [];

    if (additionalSigners.length < uniqueAdditionalSignerIds.length) {
      return NextResponse.json(
        { error: "Uno o más firmantes adicionales no son válidos o no tienen usuario activo" },
        { status: 400 },
      );
    }

    const validAdditionalSignerIds = new Set(additionalSigners.map((signer) => signer.id));

    const createdRequests = [];

    for (const empId of recipientEmployeeIds) {
      const signersData: Array<{
        employeeId: string;
        order: number;
      }> = [];
      const addedSignerIds = new Set<string>();

      const pushSigner = (employeeId: string) => {
        if (addedSignerIds.has(employeeId)) {
          return;
        }
        addedSignerIds.add(employeeId);
        signersData.push({
          employeeId,
          order: signersData.length + 1,
        });
      };

      pushSigner(empId);

      let secondSignerMissing = false;

      if (requireDoubleSignature && secondSignerRole) {
        const secondSigner = await resolveSecondSigner(
          empId,
          secondSignerRole,
          secondSignerUserId ?? undefined,
          session.user.orgId,
        );

        if (secondSigner.missing || !secondSigner.userId || !secondSigner.employeeId) {
          secondSignerMissing = true;
        } else {
          pushSigner(secondSigner.employeeId);
        }
      }

      for (const signerId of uniqueAdditionalSignerIds) {
        if (!validAdditionalSignerIds.has(signerId)) {
          continue;
        }
        pushSigner(signerId);
      }

      const signatureRequest = await prisma.signatureRequest.create({
        data: {
          orgId: session.user.orgId,
          documentId,
          policy,
          expiresAt,
          status: "PENDING",
          secondSignerMissing,
          signers: {
            create: signersData.map((signer) => ({
              order: signer.order,
              status: "PENDING",
              employeeId: signer.employeeId,
              signToken: randomBytes(32).toString("hex"),
            })),
          },
        },
      });

      createdRequests.push(signatureRequest);

      const recipientUserId = recipientUserMap.get(empId);
      if (recipientUserId) {
        await createSignaturePendingNotification({
          orgId: session.user.orgId,
          userId: recipientUserId,
          documentTitle: document.title,
          requestId: signatureRequest.id,
          expiresAt: signatureRequest.expiresAt,
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        request: {
          id: createdRequests[0]?.id, // Devolvemos el ID del primero por compatibilidad
          count: createdRequests.length,
          signerCount: createdRequests.length, // Total de solicitudes creadas
          expiresAt: createdRequests[0]?.expiresAt.toISOString(),
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

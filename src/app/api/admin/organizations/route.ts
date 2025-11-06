import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { Prisma } from "@prisma/client";
import { z } from "zod";

import { auth, updateSession } from "@/lib/auth";
import { generateOrganizationPrefix } from "@/lib/employee-numbering";
import { prisma } from "@/lib/prisma";
import { createOrganizationSchema, updateOrganizationSchema } from "@/validators/organization";

export const runtime = "nodejs";

const switchOrganizationSchema = z.object({
  orgId: z.string().min(1, "El identificador de la organización es obligatorio"),
});

const toggleOrganizationSchema = z.object({
  id: z.string().min(1, "El identificador es obligatorio"),
  active: z.boolean(),
});

const toggleChatSchema = z.object({
  id: z.string().min(1, "El identificador es obligatorio"),
  chatEnabled: z.boolean(),
});

function ensureSuperAdmin(role: string | undefined) {
  if (role !== "SUPER_ADMIN") {
    throw new Error("FORBIDDEN");
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
      ensureSuperAdmin(session.user.role);
    } catch {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const organizations = await prisma.organization.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        vat: true,
        active: true,
        chatEnabled: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            users: true,
            employees: true,
          },
        },
      },
    });

    return NextResponse.json({
      organizations,
      activeOrgId: session.user.orgId,
    });
  } catch (error) {
    console.error("Error al obtener organizaciones:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    try {
      ensureSuperAdmin(session.user.role);
    } catch {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const body = await request.json();
    const { action, data } = body as {
      action?: string;
      data?: unknown;
    };

    if (!action) {
      return NextResponse.json({ error: "Acción no proporcionada" }, { status: 400 });
    }

    switch (action) {
      case "create": {
        const payload = createOrganizationSchema.parse(data);

        // Generar prefijo automáticamente si no se proporcionó
        const employeeNumberPrefix = payload.employeeNumberPrefix ?? generateOrganizationPrefix(payload.name);

        const organization = await prisma.organization.create({
          data: {
            name: payload.name,
            vat: payload.vat ?? null,
            active: payload.active,
            hierarchyType: payload.hierarchyType,
            employeeNumberPrefix,
            allowedEmailDomains: payload.allowedEmailDomains ?? [],
          },
        });

        await revalidatePath("/dashboard/admin/organizations");
        return NextResponse.json({ organization });
      }

      case "update": {
        const payload = updateOrganizationSchema.parse(data);
        const { id, name, vat, active, hierarchyType, employeeNumberPrefix, allowedEmailDomains } = payload;

        const organization = await prisma.organization.update({
          where: { id },
          data: {
            ...(name !== undefined ? { name } : {}),
            ...(vat !== undefined ? { vat } : {}),
            ...(active !== undefined ? { active } : {}),
            ...(hierarchyType !== undefined ? { hierarchyType } : {}),
            ...(employeeNumberPrefix !== undefined ? { employeeNumberPrefix } : {}),
            ...(allowedEmailDomains !== undefined ? { allowedEmailDomains } : {}),
          },
        });

        await revalidatePath("/dashboard/admin/organizations");
        return NextResponse.json({ organization });
      }

      case "toggle-active": {
        const payload = toggleOrganizationSchema.parse(data);

        const organization = await prisma.organization.update({
          where: { id: payload.id },
          data: { active: payload.active },
        });

        await revalidatePath("/dashboard/admin/organizations");
        return NextResponse.json({ organization });
      }

      case "toggle-chat": {
        const payload = toggleChatSchema.parse(data);

        const organization = await prisma.organization.update({
          where: { id: payload.id },
          data: { chatEnabled: payload.chatEnabled },
          select: {
            id: true,
            name: true,
            vat: true,
            active: true,
            chatEnabled: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        await revalidatePath("/dashboard/admin/organizations");
        await revalidatePath("/dashboard/chat");
        return NextResponse.json({ organization });
      }

      case "switch": {
        const payload = switchOrganizationSchema.parse(data ?? body);

        const organization = await prisma.organization.findUnique({
          where: { id: payload.orgId },
          select: {
            id: true,
            active: true,
            name: true,
          },
        });

        if (!organization) {
          return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
        }

        await prisma.user.update({
          where: { id: session.user.id },
          data: { orgId: organization.id },
        });

        await updateSession({
          user: {
            orgId: organization.id,
          },
        });

        return NextResponse.json({
          success: true,
          organization,
        });
      }

      default:
        return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error en acción de organizaciones:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json({ error: "Ya existe una organización con ese NIF/CIF" }, { status: 409 });
      }
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 422 });
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

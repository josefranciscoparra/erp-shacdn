import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const orgId = session.user.orgId;
    const { id } = await params;

    const costCenter = await prisma.costCenter.findFirst({
      where: {
        id,
        orgId,
      },
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
        timezone: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!costCenter) {
      return NextResponse.json({ error: "Centro de coste no encontrado" }, { status: 404 });
    }

    return NextResponse.json(costCenter);
  } catch (error) {
    console.error("Error al obtener centro de coste:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const orgId = session.user.orgId;
    const { id } = await params;
    const body = await request.json();

    const existingCostCenter = await prisma.costCenter.findFirst({
      where: {
        id,
        orgId,
      },
    });

    if (!existingCostCenter) {
      return NextResponse.json({ error: "Centro de coste no encontrado" }, { status: 404 });
    }

    const { name, code, address, timezone, active } = body;
    const normalizedTimezone = typeof timezone === "string" && timezone.trim() !== "" ? timezone : undefined;

    if (!name) {
      return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
    }

    if (code && code !== existingCostCenter.code) {
      const existingCode = await prisma.costCenter.findFirst({
        where: {
          orgId,
          code,
          id: { not: id },
        },
      });

      if (existingCode) {
        return NextResponse.json({ error: "Ya existe un centro de coste con este código" }, { status: 400 });
      }
    }

    const updatedCostCenter = await prisma.costCenter.update({
      where: { id },
      data: {
        name,
        code: code ?? null,
        address: address ?? null,
        ...(normalizedTimezone ? { timezone: normalizedTimezone } : {}),
        active: active !== undefined ? active : existingCostCenter.active,
      },
    });

    return NextResponse.json(updatedCostCenter);
  } catch (error) {
    console.error("Error al actualizar centro de coste:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const orgId = session.user.orgId;
    const { id } = await params;

    const existingCostCenter = await prisma.costCenter.findFirst({
      where: {
        id,
        orgId,
      },
      include: {
        departments: {
          where: { active: true },
          select: { id: true },
        },
      },
    });

    if (!existingCostCenter) {
      return NextResponse.json({ error: "Centro de coste no encontrado" }, { status: 404 });
    }

    if (existingCostCenter.departments.length > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar un centro de coste que tiene departamentos asociados" },
        { status: 400 },
      );
    }

    await prisma.costCenter.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json({ message: "Centro de coste eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar centro de coste:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

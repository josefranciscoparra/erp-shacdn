import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateEmailDomain } from "@/lib/validations/email-domain";
import { nifNieSchema } from "@/lib/validations/employee";

export const runtime = "nodejs";

const validationSchema = z.object({
  email: z.string().trim().email().optional(),
  nifNie: nifNieSchema.optional(),
});

type ValidationIssue = {
  field: "email" | "nifNie";
  message: string;
};

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = validationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.issues }, { status: 400 });
    }

    const { email, nifNie } = parsed.data;
    const issues: ValidationIssue[] = [];

    if (!email && !nifNie) {
      return NextResponse.json({ ok: true, issues });
    }

    if (email) {
      const organization = await prisma.organization.findUnique({
        where: { id: session.user.orgId },
        select: { allowedEmailDomains: true },
      });

      if (!organization) {
        return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
      }

      const emailValidation = validateEmailDomain(email, organization.allowedEmailDomains);
      if (!emailValidation.valid) {
        issues.push({
          field: "email",
          message: emailValidation.error ?? "Email inválido",
        });
      }

      const existingUser = await prisma.user.findFirst({
        where: {
          email: {
            equals: email,
            mode: "insensitive",
          },
        },
        select: { id: true },
      });

      if (existingUser) {
        issues.push({
          field: "email",
          message: "Ya existe un usuario con este email en TimeNow. Usa otro correo o recupera la cuenta existente.",
        });
      }
    }

    if (nifNie) {
      const existingEmployee = await prisma.employee.findFirst({
        where: {
          orgId: session.user.orgId,
          nifNie,
        },
        select: { id: true },
      });

      if (existingEmployee) {
        issues.push({
          field: "nifNie",
          message: "Ya existe un empleado con este NIF/NIE en tu organización",
        });
      }
    }

    return NextResponse.json({ ok: issues.length === 0, issues });
  } catch (error) {
    console.error("Error validando datos de empleado:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

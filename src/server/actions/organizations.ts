"use server";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { prisma } from "@/lib/prisma";

import { getAuthenticatedUser } from "./shared/get-authenticated-employee";

const ExpenseModeSchema = z.enum(["PRIVATE", "PUBLIC", "MIXED"]);

export async function updateOrganizationExpenseMode(mode: "PRIVATE" | "PUBLIC" | "MIXED") {
  try {
    const { orgId, role } = await getAuthenticatedUser();

    if (!["SUPER_ADMIN", "ORG_ADMIN", "HR_ADMIN"].includes(role)) {
      return { success: false, error: "No tienes permisos" };
    }

    // Validar input
    const validatedMode = ExpenseModeSchema.parse(mode);

    await prisma.organization.update({
      where: { id: orgId },
      data: { expenseMode: validatedMode },
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Error updating expense mode:", error);
    return { success: false, error: "Error al actualizar configuración" };
  }
}

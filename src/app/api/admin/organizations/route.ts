import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { Prisma, PresenceType, SchedulePeriodType, ScheduleTemplateType, TimeSlotType } from "@prisma/client";
import { z } from "zod";

import { auth, updateSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createDefaultWhistleblowingCategories } from "@/lib/whistleblowing-defaults";
import { generateOrganizationPrefix } from "@/services/employees";
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

const seedBasicsSchema = z.object({
  id: z.string().min(1, "El identificador es obligatorio"),
  defaults: z
    .object({
      costCenterName: z.string().trim().min(1).optional(),
      departmentName: z.string().trim().min(1).optional(),
      scheduleName: z.string().trim().min(1).optional(),
    })
    .optional(),
});

function ensureSuperAdmin(role: string | undefined) {
  if (role !== "SUPER_ADMIN") {
    throw new Error("FORBIDDEN");
  }
}

/**
 * Formatea bytes a formato legible (KB, MB, GB)
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
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

    const orgsRaw = await prisma.organization.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        vat: true,
        active: true,
        chatEnabled: true,
        storageUsedBytes: true,
        storageLimitBytes: true,
        storageReservedBytes: true,
        hierarchyType: true,
        createdAt: true,
        updatedAt: true,
        annualPtoDays: true,
        employeeNumberPrefix: true,
        allowedEmailDomains: true,
        _count: {
          select: {
            users: true,
            employees: true,
            departments: true,
            costCenters: true,
            scheduleTemplates: true,
          },
        },
      },
    });

    // Convertir BigInt a Number para serialización JSON
    const organizations = orgsRaw.map((org) => ({
      ...org,
      storageUsedBytes: Number(org.storageUsedBytes),
      storageLimitBytes: Number(org.storageLimitBytes),
      storageReservedBytes: Number(org.storageReservedBytes),
    }));

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

        // Crear categorías de whistleblowing predeterminadas
        await createDefaultWhistleblowingCategories(organization.id);

        await revalidatePath("/dashboard/admin/organizations");
        return NextResponse.json({ organization });
      }

      case "update": {
        const payload = updateOrganizationSchema.parse(data);
        const { id, name, vat, active, hierarchyType, employeeNumberPrefix, allowedEmailDomains, storageLimitBytes } =
          payload;

        // Si se está actualizando el límite de storage, validar que no sea menor al uso actual
        if (storageLimitBytes !== undefined) {
          const currentOrg = await prisma.organization.findUnique({
            where: { id },
            select: { storageUsedBytes: true, storageReservedBytes: true },
          });
          const currentUsage = currentOrg
            ? Number(currentOrg.storageUsedBytes) + Number(currentOrg.storageReservedBytes)
            : 0;
          if (storageLimitBytes < currentUsage) {
            return NextResponse.json(
              {
                error: `El nuevo límite (${formatBytes(storageLimitBytes)}) no puede ser menor al uso actual (${formatBytes(currentUsage)})`,
              },
              { status: 400 },
            );
          }
        }

        const orgUpdated = await prisma.organization.update({
          where: { id },
          data: {
            ...(name !== undefined ? { name } : {}),
            ...(vat !== undefined ? { vat } : {}),
            ...(active !== undefined ? { active } : {}),
            ...(hierarchyType !== undefined ? { hierarchyType } : {}),
            ...(employeeNumberPrefix !== undefined ? { employeeNumberPrefix } : {}),
            ...(allowedEmailDomains !== undefined ? { allowedEmailDomains } : {}),
            ...(storageLimitBytes !== undefined ? { storageLimitBytes: BigInt(storageLimitBytes) } : {}),
          },
        });

        // Convertir BigInt a Number para serialización JSON
        const organization = {
          ...orgUpdated,
          storageUsedBytes: Number(orgUpdated.storageUsedBytes),
          storageLimitBytes: Number(orgUpdated.storageLimitBytes),
          storageReservedBytes: Number(orgUpdated.storageReservedBytes),
        };

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

      case "seed-basics": {
        const payload = seedBasicsSchema.parse(data);

        const organization = await prisma.organization.findUnique({
          where: { id: payload.id },
          select: { id: true, name: true },
        });

        if (!organization) {
          return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
        }

        const createdEntities = await prisma.$transaction(async (tx) => {
          const entities: {
            costCenter?: { id: string; name: string };
            department?: { id: string; name: string };
            scheduleTemplate?: { id: string; name: string };
          } = {};

          const defaultCostCenterName = payload.defaults?.costCenterName ?? "Centro principal";
          const defaultDepartmentName = payload.defaults?.departmentName ?? "Departamento general";
          const defaultScheduleName = payload.defaults?.scheduleName ?? "Horario oficina 9-18h";

          let primaryCostCenter = await tx.costCenter.findFirst({
            where: { orgId: organization.id },
            orderBy: { createdAt: "asc" },
            select: { id: true, name: true },
          });

          if (!primaryCostCenter) {
            primaryCostCenter = await tx.costCenter.create({
              data: {
                name: defaultCostCenterName,
                description: "Centro base creado automáticamente para arrancar la organización.",
                orgId: organization.id,
              },
              select: { id: true, name: true },
            });
            entities.costCenter = primaryCostCenter;
          }

          const hasDepartments = await tx.department.count({
            where: { orgId: organization.id },
          });

          if (hasDepartments === 0) {
            const department = await tx.department.create({
              data: {
                name: defaultDepartmentName,
                description: "Departamento inicial para asignar empleados importados.",
                orgId: organization.id,
                costCenterId: primaryCostCenter?.id,
              },
              select: { id: true, name: true },
            });
            entities.department = department;
          }

          const hasSchedules = await tx.scheduleTemplate.count({
            where: { orgId: organization.id },
          });

          if (hasSchedules === 0) {
            const workDayPatterns = Array.from({ length: 7 }).map((_, index) => {
              const isWorkingDay = index >= 1 && index <= 5; // Lunes a viernes
              return {
                dayOfWeek: index,
                isWorkingDay,
                ...(isWorkingDay
                  ? {
                      timeSlots: {
                        create: [
                          {
                            startTimeMinutes: 9 * 60,
                            endTimeMinutes: 14 * 60,
                            slotType: TimeSlotType.WORK,
                            presenceType: PresenceType.MANDATORY,
                            countsAsWork: true,
                            description: "Trabajo de mañana",
                          },
                          {
                            startTimeMinutes: 14 * 60,
                            endTimeMinutes: 15 * 60,
                            slotType: TimeSlotType.BREAK,
                            presenceType: PresenceType.MANDATORY,
                            countsAsWork: false,
                            description: "Pausa comida",
                          },
                          {
                            startTimeMinutes: 15 * 60,
                            endTimeMinutes: 18 * 60,
                            slotType: TimeSlotType.WORK,
                            presenceType: PresenceType.MANDATORY,
                            countsAsWork: true,
                            description: "Trabajo de tarde",
                          },
                        ],
                      },
                    }
                  : {}),
              };
            });

            const scheduleTemplate = await tx.scheduleTemplate.create({
              data: {
                name: defaultScheduleName,
                description: "Horario fijo laboral (L-V 09:00-18:00 con pausa de comida).",
                templateType: ScheduleTemplateType.FIXED,
                orgId: organization.id,
                periods: {
                  create: {
                    periodType: SchedulePeriodType.REGULAR,
                    name: "Horario regular",
                    workDayPatterns: {
                      create: workDayPatterns,
                    },
                  },
                },
              },
              select: { id: true, name: true },
            });

            entities.scheduleTemplate = scheduleTemplate;
          }

          return entities;
        });

        await revalidatePath("/dashboard/admin/organizations");

        return NextResponse.json({
          success: true,
          created: {
            costCenter: Boolean(createdEntities.costCenter),
            department: Boolean(createdEntities.department),
            scheduleTemplate: Boolean(createdEntities.scheduleTemplate),
          },
          entities: createdEntities,
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

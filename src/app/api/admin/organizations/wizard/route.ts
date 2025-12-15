import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import {
  HierarchyType,
  PresenceType,
  Prisma,
  SchedulePeriodType,
  ScheduleTemplateType,
  TimeSlotType,
} from "@prisma/client";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createDefaultWhistleblowingCategories } from "@/lib/whistleblowing-defaults";
import { createDefaultAbsenceTypes } from "@/server/actions/absence-types";
import { generateOrganizationPrefix } from "@/services/employees";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const wizardSchema = z.object({
  organization: z.object({
    name: z.string().min(1, "El nombre de la organización es obligatorio"),
    vat: z.string().trim().optional(),
    hierarchyType: z.nativeEnum(HierarchyType),
    annualPtoDays: z.number().int().min(0).max(60),
    employeeNumberPrefix: z.string().min(2).max(6).optional().or(z.literal("")),
    allowedEmailDomains: z.array(z.string().trim().toLowerCase()).optional(),
  }),
  catalogs: z.object({
    costCenter: z.object({
      name: z.string().min(1, "El centro de trabajo necesita nombre"),
      code: z.string().trim().optional(),
      description: z.string().trim().optional(),
      timezone: z.string().trim().optional(),
    }),
    department: z.object({
      name: z.string().min(1, "El departamento necesita nombre"),
      description: z.string().trim().optional(),
    }),
    schedule: z.object({
      name: z.string().min(1),
      description: z.string().trim().optional(),
      startTime: z.string().regex(timeRegex, "Hora de inicio inválida"),
      endTime: z.string().regex(timeRegex, "Hora de fin inválida"),
      breakStart: z.string().regex(timeRegex).optional().or(z.literal("")),
      breakEnd: z.string().regex(timeRegex).optional().or(z.literal("")),
    }),
  }),
  notes: z.string().max(1000).optional(),
});

function ensureSuperAdmin(role: string | undefined) {
  if (role !== "SUPER_ADMIN") {
    throw new Error("FORBIDDEN");
  }
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map((value) => Number.parseInt(value, 10));
  return hours * 60 + minutes;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    ensureSuperAdmin(session.user.role);

    const body = await request.json();
    const payload = wizardSchema.parse(body);
    const providedPrefix = payload.organization.employeeNumberPrefix
      ? payload.organization.employeeNumberPrefix.trim().toUpperCase()
      : "";
    const prefix = providedPrefix.length > 0 ? providedPrefix : generateOrganizationPrefix(payload.organization.name);

    const allowedEmailDomains = (payload.organization.allowedEmailDomains ?? []).filter((domain) => Boolean(domain));
    const costCenterTimezone = payload.catalogs.costCenter.timezone ?? "Europe/Madrid";

    const startMinutes = timeToMinutes(payload.catalogs.schedule.startTime);
    const endMinutes = timeToMinutes(payload.catalogs.schedule.endTime);

    if (endMinutes <= startMinutes) {
      return NextResponse.json(
        { error: "La hora de fin debe ser posterior a la hora de inicio del horario." },
        { status: 400 },
      );
    }

    const breakSlots: { start: number; end: number }[] = [];
    if (payload.catalogs.schedule.breakStart || payload.catalogs.schedule.breakEnd) {
      if (!payload.catalogs.schedule.breakStart || !payload.catalogs.schedule.breakEnd) {
        return NextResponse.json(
          { error: "Debes indicar inicio y fin de la pausa si quieres añadirla." },
          { status: 400 },
        );
      }
      const breakStartMinutes = timeToMinutes(payload.catalogs.schedule.breakStart);
      const breakEndMinutes = timeToMinutes(payload.catalogs.schedule.breakEnd);
      if (breakEndMinutes <= breakStartMinutes) {
        return NextResponse.json({ error: "La pausa debe tener fin posterior al inicio." }, { status: 400 });
      }
      if (breakStartMinutes <= startMinutes || breakEndMinutes >= endMinutes) {
        return NextResponse.json(
          { error: "La pausa debe ocurrir dentro del horario laboral (después del inicio y antes del fin)." },
          { status: 400 },
        );
      }

      breakSlots.push({ start: breakStartMinutes, end: breakEndMinutes });
    }

    const workSlots = [
      {
        start: startMinutes,
        end: endMinutes,
      },
    ];

    const organization = await prisma.organization.create({
      data: {
        name: payload.organization.name,
        vat: payload.organization.vat ?? null,
        hierarchyType: payload.organization.hierarchyType,
        active: true,
        annualPtoDays: payload.organization.annualPtoDays,
        employeeNumberPrefix: prefix,
        allowedEmailDomains,
      },
    });

    const catalogEntities = await prisma
      .$transaction(async (tx) => {
        const costCenter = await tx.costCenter.create({
          data: {
            name: payload.catalogs.costCenter.name,
            code: payload.catalogs.costCenter.code ?? null,
            description: payload.catalogs.costCenter.description ?? null,
            timezone: costCenterTimezone,
            orgId: organization.id,
          },
        });

        const department = await tx.department.create({
          data: {
            name: payload.catalogs.department.name,
            description: payload.catalogs.department.description ?? null,
            orgId: organization.id,
            costCenterId: costCenter.id,
          },
        });

        const positionLevel = await tx.positionLevel.create({
          data: {
            name: "Nivel general",
            code: "L1",
            description: "Nivel jerárquico base generado automáticamente.",
            order: 1,
            orgId: organization.id,
          },
        });

        const position = await tx.position.create({
          data: {
            title: "Puesto general",
            description: "Puesto base para importar empleados.",
            orgId: organization.id,
            levelId: positionLevel.id,
          },
        });

        const scheduleTemplate = await tx.scheduleTemplate.create({
          data: {
            name: payload.catalogs.schedule.name,
            description: payload.catalogs.schedule.description ?? "Horario generado en el asistente guiado.",
            templateType: ScheduleTemplateType.FIXED,
            orgId: organization.id,
            periods: {
              create: {
                periodType: SchedulePeriodType.REGULAR,
                name: "Horario regular",
                workDayPatterns: {
                  create: Array.from({ length: 7 }).map((_, index) => {
                    const isWorkingDay = index >= 1 && index <= 5;
                    return {
                      dayOfWeek: index,
                      isWorkingDay,
                      ...(isWorkingDay
                        ? {
                            timeSlots: {
                              create: [
                                {
                                  startTimeMinutes: workSlots[0].start,
                                  endTimeMinutes: workSlots[0].end,
                                  slotType: TimeSlotType.WORK,
                                  presenceType: PresenceType.MANDATORY,
                                  countsAsWork: true,
                                  description: "Jornada",
                                },
                                ...(breakSlots.length
                                  ? [
                                      {
                                        startTimeMinutes: breakSlots[0].start,
                                        endTimeMinutes: breakSlots[0].end,
                                        slotType: TimeSlotType.BREAK,
                                        presenceType: PresenceType.MANDATORY,
                                        countsAsWork: false,
                                        description: "Pausa",
                                      },
                                    ]
                                  : []),
                              ],
                            },
                          }
                        : {}),
                    };
                  }),
                },
              },
            },
          },
        });

        await tx.organizationSetupJob.create({
          data: {
            orgId: organization.id,
            status: "COMPLETED",
            createdById: session.user.id,
            payload,
            notes: payload.notes,
          },
        });

        return { costCenter, department, positionLevel, position, scheduleTemplate };
      })
      .catch(async (txError) => {
        await prisma.organization.delete({ where: { id: organization.id } }).catch(() => undefined);
        throw txError;
      });

    await createDefaultWhistleblowingCategories(organization.id);
    try {
      await createDefaultAbsenceTypes(organization.id);
    } catch (absenceError) {
      console.warn("[wizard] No se pudieron crear los tipos de ausencia por defecto:", absenceError);
    }

    let setupJobRecorded = false;
    const setupJobModel = (prisma as unknown as { organizationSetupJob?: typeof prisma.organization })
      .organizationSetupJob;

    if (setupJobModel?.create) {
      try {
        await setupJobModel.create({
          data: {
            orgId: organization.id,
            status: "COMPLETED",
            createdById: session.user.id,
            payload,
            notes: payload.notes,
          },
        });
        setupJobRecorded = true;
      } catch (jobError) {
        if (jobError instanceof Prisma.PrismaClientKnownRequestError && jobError.code === "P2021") {
          console.warn(
            "[wizard] organization_setup_jobs no existe aún. Ejecuta `npx prisma db push` o aplica la migración.",
          );
        } else {
          throw jobError;
        }
      }
    } else {
      console.warn(
        "[wizard] El cliente Prisma no tiene organizationSetupJob. Ejecuta `npx prisma generate` tras actualizar el schema.",
      );
    }

    await revalidatePath("/dashboard/admin/organizations");

    return NextResponse.json({
      success: true,
      organization,
      ...catalogEntities,
      setupJobRecorded,
    });
  } catch (error) {
    console.error("Error en wizard de organización:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 422 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        const metaTarget = (error.meta ?? {}) as { target?: unknown };
        const target = Array.isArray(metaTarget.target) ? metaTarget.target.join(", ") : "los campos únicos";
        return NextResponse.json({ error: `Ya existe una organización con esos datos (${target}).` }, { status: 409 });
      }
      if (error.code === "P2021") {
        return NextResponse.json(
          {
            error:
              "Falta la tabla organization_setup_jobs en la base de datos. Ejecuta `npx prisma db push` o aplica la última migración.",
          },
          { status: 500 },
        );
      }
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const fallbackMessage = error instanceof Error ? error.message : "Error interno del servidor";
    return NextResponse.json({ error: fallbackMessage }, { status: 500 });
  }
}

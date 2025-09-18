# 📚 ERP Implementation Guide - Part 3: Servicios de Fichaje y Control Horario

## ⏰ Sistema de Fichaje Completo

### TimeClock Router (tRPC)

```typescript
// src/server/api/routers/timeclock.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { validateTimeEntry, checkFraud, calculateWorkday } from "@/server/services/timeclock.service";

export const timeclockRouter = createTRPCRouter({
  // Estado actual del empleado
  getCurrentStatus: protectedProcedure.query(async ({ ctx }) => {
    const employeeId = ctx.session.user.employeeId;

    if (!employeeId) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Usuario no asociado a empleado",
      });
    }

    // Buscar última entrada
    const lastEntry = await ctx.prisma.timeEntry.findFirst({
      where: {
        employeeId,
        timestamp: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
      orderBy: { timestamp: "desc" },
    });

    // Obtener resumen del día
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const summary = await ctx.prisma.workdaySummary.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: today,
        },
      },
    });

    // Calcular tiempo trabajado hasta ahora
    let currentSessionMinutes = 0;
    if (lastEntry?.type === "IN" || lastEntry?.type === "BREAK_END") {
      const now = new Date();
      currentSessionMinutes = Math.floor((now.getTime() - lastEntry.timestamp.getTime()) / 60000);
    }

    return {
      isWorking: lastEntry?.type === "IN" || lastEntry?.type === "BREAK_END",
      isOnBreak: lastEntry?.type === "BREAK_START",
      lastEntry,
      todayMinutes: (summary?.workedMinutes || 0) + currentSessionMinutes,
      todayEntries: await ctx.prisma.timeEntry.findMany({
        where: {
          employeeId,
          timestamp: { gte: today },
        },
        orderBy: { timestamp: "asc" },
      }),
    };
  }),

  // Fichar entrada/salida
  clockInOut: protectedProcedure
    .input(
      z.object({
        type: z.enum(["IN", "OUT", "BREAK_START", "BREAK_END"]),
        timestamp: z.date().optional(),
        terminalId: z.string().optional(),
        location: z
          .object({
            lat: z.number(),
            lng: z.number(),
            accuracy: z.number(),
          })
          .optional(),
        photoUrl: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const employeeId = ctx.session.user.employeeId;

      if (!employeeId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Usuario no asociado a empleado",
        });
      }

      const timestamp = input.timestamp || new Date();

      // Validar secuencia lógica
      const validation = await validateTimeEntry(employeeId, input.type, timestamp);

      if (!validation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: validation.error,
        });
      }

      // Verificar terminal si se proporciona
      let terminal = null;
      if (input.terminalId) {
        terminal = await ctx.prisma.timeClockTerminal.findFirst({
          where: {
            id: input.terminalId,
            active: true,
            costCenter: {
              employees: {
                some: { id: employeeId },
              },
            },
          },
        });

        if (!terminal) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Terminal no válido para este empleado",
          });
        }
      }

      // Crear entrada con transacción
      const entry = await ctx.prisma.$transaction(async (tx) => {
        // Crear time entry
        const timeEntry = await tx.timeEntry.create({
          data: {
            employeeId,
            type: input.type,
            timestamp,
            source: input.terminalId ? "KIOSK" : "WEB",
            terminalId: input.terminalId,
            ipAddress: ctx.req.headers["x-forwarded-for"] as string,
            userAgent: ctx.req.headers["user-agent"] as string,
            geoLocation: input.location,
            photoUrl: input.photoUrl,
            notes: input.notes,
          },
        });

        // Ejecutar verificaciones antifraude
        const fraudChecks = await checkFraud(timeEntry, terminal);

        for (const check of fraudChecks) {
          await tx.antiFraudCheck.create({
            data: {
              timeEntryId: timeEntry.id,
              checkType: check.type,
              result: check.result,
              score: check.score,
              details: check.details,
            },
          });

          // Si falla alguna verificación crítica
          if (check.result === "FAIL" && check.critical) {
            await tx.timeEntry.update({
              where: { id: timeEntry.id },
              data: {
                isValid: false,
                validationErrors: {
                  push: `Fallo en verificación: ${check.type}`,
                },
              },
            });
          }
        }

        // Si es OUT, calcular jornada
        if (input.type === "OUT") {
          await calculateWorkday(employeeId, timestamp);
        }

        // Audit log
        await tx.auditLog.create({
          data: {
            action: `TIMECLOCK_${input.type}`,
            entityType: "TimeEntry",
            entityId: timeEntry.id,
            userId: ctx.session.user.id,
            orgId: ctx.orgId,
            metadata: {
              employeeId,
              timestamp: timestamp.toISOString(),
              source: timeEntry.source,
            },
          },
        });

        return timeEntry;
      });

      return entry;
    }),

  // Fichaje con PIN (Kiosco)
  clockWithPin: protectedProcedure
    .input(
      z.object({
        employeeCode: z.string(),
        pin: z.string().length(4),
        terminalId: z.string(),
        type: z.enum(["IN", "OUT"]),
        photoUrl: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verificar terminal
      const terminal = await ctx.prisma.timeClockTerminal.findFirst({
        where: {
          id: input.terminalId,
          active: true,
          mode: "KIOSK",
        },
      });

      if (!terminal) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Terminal no encontrado",
        });
      }

      // Verificar empleado y PIN
      const employee = await ctx.prisma.employee.findFirst({
        where: {
          orgId: ctx.orgId,
          employeeCode: input.employeeCode,
          status: "ACTIVE",
        },
      });

      if (!employee) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Empleado no encontrado",
        });
      }

      // Verificar PIN (almacenado encriptado)
      const validPin = await verifyPin(employee.id, input.pin);

      if (!validPin) {
        // Log intento fallido
        await ctx.prisma.auditLog.create({
          data: {
            action: "TIMECLOCK_PIN_FAILED",
            entityType: "Employee",
            entityId: employee.id,
            orgId: ctx.orgId,
            metadata: { terminalId: input.terminalId },
          },
        });

        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "PIN incorrecto",
        });
      }

      // Crear fichaje
      const entry = await ctx.prisma.timeEntry.create({
        data: {
          employeeId: employee.id,
          type: input.type,
          timestamp: new Date(),
          source: "KIOSK",
          terminalId: input.terminalId,
          photoUrl: input.photoUrl,
          ipAddress: ctx.req.headers["x-forwarded-for"] as string,
        },
      });

      return {
        success: true,
        employee: {
          name: `${employee.firstName} ${employee.lastName}`,
          photo: employee.photoUrl,
        },
        entry,
      };
    }),

  // Obtener fichajes del día/semana/mes
  getEntries: protectedProcedure
    .input(
      z.object({
        employeeId: z.string().optional(),
        startDate: z.date(),
        endDate: z.date(),
        includeInvalid: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Determinar empleado
      const employeeId = input.employeeId || ctx.session.user.employeeId;

      if (!employeeId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Empleado no especificado",
        });
      }

      // Verificar permisos
      if (input.employeeId && input.employeeId !== ctx.session.user.employeeId) {
        const canViewAll = await ctx.can("TIMECLOCK_VIEW_ALL");
        const canViewTeam = await ctx.can("TIMECLOCK_VIEW_TEAM");

        if (!canViewAll && !canViewTeam) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Sin permisos para ver estos fichajes",
          });
        }
      }

      const entries = await ctx.prisma.timeEntry.findMany({
        where: {
          employeeId,
          timestamp: {
            gte: input.startDate,
            lte: input.endDate,
          },
          ...(input.includeInvalid ? {} : { isValid: true }),
        },
        include: {
          terminal: true,
          antiFraudChecks: true,
        },
        orderBy: { timestamp: "desc" },
      });

      return entries;
    }),

  // Resumen de jornadas
  getWorkdaySummaries: protectedProcedure
    .input(
      z.object({
        employeeId: z.string().optional(),
        startDate: z.date(),
        endDate: z.date(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const employeeId = input.employeeId || ctx.session.user.employeeId;

      const summaries = await ctx.prisma.workdaySummary.findMany({
        where: {
          employeeId,
          date: {
            gte: input.startDate,
            lte: input.endDate,
          },
        },
        orderBy: { date: "desc" },
      });

      // Calcular totales
      const totals = summaries.reduce(
        (acc, summary) => ({
          workedMinutes: acc.workedMinutes + summary.workedMinutes,
          overtimeMinutes: acc.overtimeMinutes + summary.overtimeMinutes,
          nightMinutes: acc.nightMinutes + summary.nightMinutes,
          holidayMinutes: acc.holidayMinutes + summary.holidayMinutes,
        }),
        { workedMinutes: 0, overtimeMinutes: 0, nightMinutes: 0, holidayMinutes: 0 },
      );

      return {
        summaries,
        totals,
        averagePerDay: summaries.length > 0 ? Math.round(totals.workedMinutes / summaries.length) : 0,
      };
    }),

  // Corregir fichaje (managers/RRHH)
  correctEntry: protectedProcedure
    .use(withPermission("TIMECLOCK_EDIT"))
    .input(
      z.object({
        entryId: z.string(),
        timestamp: z.date(),
        reason: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const original = await ctx.prisma.timeEntry.findUnique({
        where: { id: input.entryId },
      });

      if (!original) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Fichaje no encontrado",
        });
      }

      // Actualizar con auditoría
      const updated = await ctx.prisma.$transaction(async (tx) => {
        // Actualizar entrada
        const entry = await tx.timeEntry.update({
          where: { id: input.entryId },
          data: {
            timestamp: input.timestamp,
            editedBy: ctx.session.user.id,
            editedAt: new Date(),
            notes: input.reason,
          },
        });

        // Audit log detallado
        await tx.auditLog.create({
          data: {
            action: "TIMECLOCK_CORRECTED",
            entityType: "TimeEntry",
            entityId: entry.id,
            userId: ctx.session.user.id,
            orgId: ctx.orgId,
            metadata: {
              original: original.timestamp,
              new: input.timestamp,
              reason: input.reason,
            },
          },
        });

        // Recalcular jornada
        await calculateWorkday(entry.employeeId, entry.timestamp);

        return entry;
      });

      return updated;
    }),

  // Aprobar jornadas (batch)
  approveWorkdays: protectedProcedure
    .use(withPermission("TIMECLOCK_APPROVE"))
    .input(
      z.object({
        employeeIds: z.array(z.string()),
        startDate: z.date(),
        endDate: z.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const approved = await ctx.prisma.workdaySummary.updateMany({
        where: {
          employeeId: { in: input.employeeIds },
          date: {
            gte: input.startDate,
            lte: input.endDate,
          },
          approved: false,
        },
        data: {
          approved: true,
          approvedBy: ctx.session.user.id,
          approvedAt: new Date(),
        },
      });

      // Audit log
      await ctx.prisma.auditLog.create({
        data: {
          action: "WORKDAYS_APPROVED",
          userId: ctx.session.user.id,
          orgId: ctx.orgId,
          metadata: {
            count: approved.count,
            employeeIds: input.employeeIds,
            period: {
              start: input.startDate,
              end: input.endDate,
            },
          },
        },
      });

      return { approved: approved.count };
    }),
});
```

### Servicio de Control Horario

```typescript
// src/server/services/timeclock.service.ts
import { prisma } from "@/server/db/client";
import type { TimeEntry, TimeClockTerminal } from "@prisma/client";

// Validar secuencia de fichajes
export async function validateTimeEntry(
  employeeId: string,
  type: string,
  timestamp: Date,
): Promise<{ valid: boolean; error?: string }> {
  // Obtener último fichaje del día
  const today = new Date(timestamp);
  today.setHours(0, 0, 0, 0);

  const lastEntry = await prisma.timeEntry.findFirst({
    where: {
      employeeId,
      timestamp: { gte: today },
    },
    orderBy: { timestamp: "desc" },
  });

  if (!lastEntry) {
    // Primera entrada del día debe ser IN
    if (type !== "IN") {
      return {
        valid: false,
        error: "Primera entrada del día debe ser entrada (IN)",
      };
    }
    return { valid: true };
  }

  // Validar secuencia lógica
  const validTransitions: Record<string, string[]> = {
    IN: ["OUT", "BREAK_START"],
    OUT: ["IN"],
    BREAK_START: ["BREAK_END"],
    BREAK_END: ["OUT", "BREAK_START"],
  };

  if (!validTransitions[lastEntry.type].includes(type)) {
    return {
      valid: false,
      error: `No puedes hacer ${type} después de ${lastEntry.type}`,
    };
  }

  // Validar tiempo mínimo entre fichajes (anti-duplicados)
  const timeDiff = timestamp.getTime() - lastEntry.timestamp.getTime();
  if (timeDiff < 60000) {
    // 1 minuto
    return {
      valid: false,
      error: "Debe esperar al menos 1 minuto entre fichajes",
    };
  }

  return { valid: true };
}

// Sistema antifraude
export async function checkFraud(entry: TimeEntry, terminal: TimeClockTerminal | null): Promise<FraudCheck[]> {
  const checks: FraudCheck[] = [];

  // 1. Verificación de IP (si hay terminal con whitelist)
  if (terminal?.ipWhitelist.length > 0 && entry.ipAddress) {
    const ipAllowed = terminal.ipWhitelist.includes(entry.ipAddress);
    checks.push({
      type: "IP_CHECK",
      result: ipAllowed ? "PASS" : "WARNING",
      score: ipAllowed ? 1.0 : 0.5,
      details: {
        ip: entry.ipAddress,
        whitelist: terminal.ipWhitelist,
      },
      critical: false,
    });
  }

  // 2. Geofencing
  if (terminal?.geoFence && entry.geoLocation) {
    const distance = calculateDistance(
      terminal.geoFence.lat,
      terminal.geoFence.lng,
      entry.geoLocation.lat,
      entry.geoLocation.lng,
    );

    const withinFence = distance <= terminal.geoFence.radius;
    checks.push({
      type: "GEO_FENCE",
      result: withinFence ? "PASS" : "WARNING",
      score: withinFence ? 1.0 : 0.3,
      details: {
        distance,
        maxRadius: terminal.geoFence.radius,
      },
      critical: false,
    });
  }

  // 3. Tolerancia horaria (fichaje muy temprano/tarde)
  const hour = entry.timestamp.getHours();
  if (hour < 6 || hour > 22) {
    checks.push({
      type: "TOLERANCE",
      result: "WARNING",
      score: 0.7,
      details: {
        hour,
        message: "Fichaje fuera de horario habitual",
      },
      critical: false,
    });
  }

  // 4. Patrón de fichajes sospechoso
  const recentEntries = await prisma.timeEntry.findMany({
    where: {
      employeeId: entry.employeeId,
      timestamp: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 días
      },
    },
    orderBy: { timestamp: "desc" },
    take: 20,
  });

  // Detectar patrones exactos (mismo minuto todos los días)
  const minutes = recentEntries.map((e) => e.timestamp.getMinutes());
  const sameMinute = minutes.every((m) => m === minutes[0]);

  if (sameMinute && recentEntries.length > 5) {
    checks.push({
      type: "PATTERN",
      result: "WARNING",
      score: 0.5,
      details: {
        pattern: "Mismo minuto exacto últimos días",
        entries: recentEntries.length,
      },
      critical: false,
    });
  }

  // 5. Verificación facial (si hay foto)
  if (entry.photoUrl && terminal?.photoRequired) {
    // Aquí integrarías con servicio de reconocimiento facial
    // Por ahora simulamos
    checks.push({
      type: "SELFIE",
      result: "PASS",
      score: 0.95,
      details: {
        confidence: 0.95,
        photoUrl: entry.photoUrl,
      },
      critical: true,
    });
  }

  // 6. Duplicados
  const duplicate = await prisma.timeEntry.findFirst({
    where: {
      employeeId: entry.employeeId,
      type: entry.type,
      timestamp: {
        gte: new Date(entry.timestamp.getTime() - 5 * 60 * 1000),
        lte: new Date(entry.timestamp.getTime() + 5 * 60 * 1000),
      },
      id: { not: entry.id },
    },
  });

  if (duplicate) {
    checks.push({
      type: "DUPLICATE",
      result: "FAIL",
      score: 0,
      details: {
        duplicateId: duplicate.id,
        timestamp: duplicate.timestamp,
      },
      critical: true,
    });
  }

  return checks;
}

// Calcular jornada diaria
export async function calculateWorkday(employeeId: string, date: Date): Promise<void> {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  // Obtener todos los fichajes del día
  const entries = await prisma.timeEntry.findMany({
    where: {
      employeeId,
      timestamp: {
        gte: dayStart,
        lte: dayEnd,
      },
      isValid: true,
    },
    orderBy: { timestamp: "asc" },
  });

  if (entries.length === 0) return;

  // Calcular minutos trabajados
  let workedMinutes = 0;
  let breakMinutes = 0;
  let nightMinutes = 0;
  let currentIn: Date | null = null;
  let currentBreak: Date | null = null;

  for (const entry of entries) {
    switch (entry.type) {
      case "IN":
        currentIn = entry.timestamp;
        break;

      case "OUT":
        if (currentIn) {
          const minutes = Math.floor((entry.timestamp.getTime() - currentIn.getTime()) / 60000);
          workedMinutes += minutes;

          // Calcular minutos nocturnos (22:00 - 06:00)
          nightMinutes += calculateNightMinutes(currentIn, entry.timestamp);

          currentIn = null;
        }
        break;

      case "BREAK_START":
        currentBreak = entry.timestamp;
        break;

      case "BREAK_END":
        if (currentBreak) {
          const minutes = Math.floor((entry.timestamp.getTime() - currentBreak.getTime()) / 60000);
          breakMinutes += minutes;
          currentBreak = null;
        }
        break;
    }
  }

  // Si quedó abierto, cerrar con hora actual (máximo fin del día)
  if (currentIn) {
    const endTime = new Date() > dayEnd ? dayEnd : new Date();
    const minutes = Math.floor((endTime.getTime() - currentIn.getTime()) / 60000);
    workedMinutes += minutes;
    nightMinutes += calculateNightMinutes(currentIn, endTime);
  }

  // Obtener horario esperado del empleado
  const contract = await prisma.employmentContract.findFirst({
    where: {
      employeeId,
      active: true,
      startDate: { lte: date },
      OR: [{ endDate: null }, { endDate: { gte: date } }],
    },
  });

  const scheduledMinutes = contract
    ? Math.round((Number(contract.weeklyHours) * 60) / 5) // Asumimos 5 días laborables
    : 480; // 8 horas por defecto

  // Calcular horas extra
  const overtimeMinutes = Math.max(0, workedMinutes - scheduledMinutes);

  // Verificar si es festivo
  const holiday = await prisma.holiday.findFirst({
    where: {
      date: dayStart,
      calendar: {
        orgId: (
          await prisma.employee.findUnique({
            where: { id: employeeId },
            select: { orgId: true },
          })
        )?.orgId,
      },
    },
  });

  const holidayMinutes = holiday ? workedMinutes : 0;

  // Determinar estado
  let status: WorkdayStatus = "COMPLETE";
  if (entries.length === 0) {
    status = "MISSING_IN";
  } else if (!entries.find((e) => e.type === "OUT")) {
    status = "MISSING_OUT";
  } else if (workedMinutes < scheduledMinutes * 0.9) {
    status = "INCOMPLETE";
  } else if (holiday) {
    status = "HOLIDAY";
  }

  // Guardar o actualizar resumen
  await prisma.workdaySummary.upsert({
    where: {
      employeeId_date: {
        employeeId,
        date: dayStart,
      },
    },
    create: {
      employeeId,
      date: dayStart,
      scheduledMinutes,
      workedMinutes,
      breakMinutes,
      overtimeMinutes,
      nightMinutes,
      holidayMinutes,
      firstEntry: entries[0]?.timestamp,
      lastExit: entries.find((e) => e.type === "OUT")?.timestamp,
      status,
      incidents: detectIncidents(entries, scheduledMinutes),
    },
    update: {
      scheduledMinutes,
      workedMinutes,
      breakMinutes,
      overtimeMinutes,
      nightMinutes,
      holidayMinutes,
      firstEntry: entries[0]?.timestamp,
      lastExit: entries.find((e) => e.type === "OUT")?.timestamp,
      status,
      incidents: detectIncidents(entries, scheduledMinutes),
    },
  });
}

// Calcular minutos nocturnos
function calculateNightMinutes(start: Date, end: Date): number {
  let nightMinutes = 0;
  const current = new Date(start);

  while (current < end) {
    const hour = current.getHours();
    if (hour >= 22 || hour < 6) {
      nightMinutes++;
    }
    current.setMinutes(current.getMinutes() + 1);
  }

  return nightMinutes;
}

// Detectar incidencias
function detectIncidents(entries: TimeEntry[], scheduledMinutes: number): any[] {
  const incidents = [];

  // Llegada tarde
  const firstIn = entries.find((e) => e.type === "IN");
  if (firstIn) {
    const expectedTime = new Date(firstIn.timestamp);
    expectedTime.setHours(9, 0, 0, 0); // Asumimos entrada a las 9

    if (firstIn.timestamp > expectedTime) {
      const lateMinutes = Math.floor((firstIn.timestamp.getTime() - expectedTime.getTime()) / 60000);
      incidents.push({
        type: "LATE_ARRIVAL",
        minutes: lateMinutes,
        timestamp: firstIn.timestamp,
      });
    }
  }

  // Salida temprana
  const lastOut = entries.findLast((e) => e.type === "OUT");
  if (lastOut) {
    const expectedEnd = new Date(lastOut.timestamp);
    expectedEnd.setHours(18, 0, 0, 0); // Asumimos salida a las 18

    if (lastOut.timestamp < expectedEnd) {
      const earlyMinutes = Math.floor((expectedEnd.getTime() - lastOut.timestamp.getTime()) / 60000);
      incidents.push({
        type: "EARLY_DEPARTURE",
        minutes: earlyMinutes,
        timestamp: lastOut.timestamp,
      });
    }
  }

  // Pausas excesivas
  let totalBreaks = 0;
  for (let i = 0; i < entries.length - 1; i++) {
    if (entries[i].type === "BREAK_START" && entries[i + 1].type === "BREAK_END") {
      totalBreaks += Math.floor((entries[i + 1].timestamp.getTime() - entries[i].timestamp.getTime()) / 60000);
    }
  }

  if (totalBreaks > 60) {
    // Más de 1 hora de pausas
    incidents.push({
      type: "EXCESSIVE_BREAKS",
      minutes: totalBreaks,
    });
  }

  return incidents;
}

// Calcular distancia entre coordenadas (Haversine)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Radio de la Tierra en metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distancia en metros
}

interface FraudCheck {
  type: string;
  result: "PASS" | "FAIL" | "WARNING" | "SKIP";
  score: number;
  details: any;
  critical: boolean;
}

type WorkdayStatus = "COMPLETE" | "INCOMPLETE" | "MISSING_IN" | "MISSING_OUT" | "HOLIDAY" | "ABSENCE" | "ERROR";
```

### Componentes UI de Fichaje

```typescript
// src/components/features/timeclock/clock-widget.tsx
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Coffee, LogIn, LogOut, MapPin, Camera } from "lucide-react"
import { api } from "@/lib/trpc/client"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export function ClockWidget() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [location, setLocation] = useState<GeolocationCoordinates | null>(null)
  const [photo, setPhoto] = useState<string | null>(null)

  const { data: status, refetch } = api.timeclock.getCurrentStatus.useQuery()
  const clockMutation = api.timeclock.clockInOut.useMutation({
    onSuccess: () => {
      toast.success("Fichaje registrado correctamente")
      refetch()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  // Actualizar reloj cada segundo
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Obtener ubicación
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => setLocation(position.coords),
        (error) => console.error("Error obteniendo ubicación:", error)
      )
    }
  }, [])

  const handleClock = async (type: "IN" | "OUT" | "BREAK_START" | "BREAK_END") => {
    const data: any = { type }

    if (location) {
      data.location = {
        lat: location.latitude,
        lng: location.longitude,
        accuracy: location.accuracy,
      }
    }

    if (photo) {
      data.photoUrl = photo
    }

    clockMutation.mutate(data)
  }

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Reloj */}
        <div className="text-center">
          <div className="text-4xl font-bold">
            {format(currentTime, "HH:mm:ss")}
          </div>
          <div className="text-muted-foreground">
            {format(currentTime, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
          </div>
        </div>

        {/* Estado actual */}
        <div className="flex justify-center">
          {status?.isWorking ? (
            <Badge variant="default" className="text-lg px-4 py-2">
              <Clock className="mr-2 h-4 w-4" />
              Trabajando - {formatMinutes(status.todayMinutes)}
            </Badge>
          ) : status?.isOnBreak ? (
            <Badge variant="secondary" className="text-lg px-4 py-2">
              <Coffee className="mr-2 h-4 w-4" />
              En pausa
            </Badge>
          ) : (
            <Badge variant="outline" className="text-lg px-4 py-2">
              Fuera de servicio
            </Badge>
          )}
        </div>

        {/* Botones de fichaje */}
        <div className="grid grid-cols-2 gap-4">
          {!status?.isWorking && !status?.isOnBreak && (
            <Button
              size="lg"
              className="col-span-2"
              onClick={() => handleClock("IN")}
              disabled={clockMutation.isPending}
            >
              <LogIn className="mr-2" />
              Entrada
            </Button>
          )}

          {status?.isWorking && (
            <>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => handleClock("BREAK_START")}
                disabled={clockMutation.isPending}
              >
                <Coffee className="mr-2" />
                Iniciar Pausa
              </Button>
              <Button
                size="lg"
                variant="destructive"
                onClick={() => handleClock("OUT")}
                disabled={clockMutation.isPending}
              >
                <LogOut className="mr-2" />
                Salida
              </Button>
            </>
          )}

          {status?.isOnBreak && (
            <Button
              size="lg"
              className="col-span-2"
              onClick={() => handleClock("BREAK_END")}
              disabled={clockMutation.isPending}
            >
              <Clock className="mr-2" />
              Reanudar Trabajo
            </Button>
          )}
        </div>

        {/* Indicadores */}
        <div className="flex justify-center gap-4 text-sm text-muted-foreground">
          {location && (
            <div className="flex items-center">
              <MapPin className="mr-1 h-3 w-3" />
              Ubicación detectada
            </div>
          )}
          {photo && (
            <div className="flex items-center">
              <Camera className="mr-1 h-3 w-3" />
              Foto capturada
            </div>
          )}
        </div>

        {/* Resumen del día */}
        {status?.todayEntries && status.todayEntries.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">Registros de hoy</h4>
            <div className="space-y-1 text-sm">
              {status.todayEntries.map((entry) => (
                <div key={entry.id} className="flex justify-between">
                  <span className="text-muted-foreground">
                    {entry.type === "IN" && "Entrada"}
                    {entry.type === "OUT" && "Salida"}
                    {entry.type === "BREAK_START" && "Inicio pausa"}
                    {entry.type === "BREAK_END" && "Fin pausa"}
                  </span>
                  <span>{format(new Date(entry.timestamp), "HH:mm")}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
```

---

**Continúa en PART 4: Sistema PTO y Vacaciones →**

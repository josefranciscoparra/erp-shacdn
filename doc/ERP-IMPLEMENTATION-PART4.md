# 📚 ERP Implementation Guide - Part 4: Sistema PTO y Vacaciones

## 🏖️ Sistema Completo de PTO (Paid Time Off)

### PTO Router (tRPC)

```typescript
// src/server/api/routers/pto.ts
import { z } from "zod"
import { createTRPCRouter, protectedProcedure, withPermission } from "@/server/api/trpc"
import { TRPCError } from "@trpc/server"
import { 
  calculatePTODays,
  checkPTOConflicts,
  processPTOAccrual,
  validatePTORequest 
} from "@/server/services/pto.service"
import { addDays, differenceInBusinessDays } from "date-fns"

export const ptoRouter = createTRPCRouter({
  // Obtener balance de PTO
  getBalance: protectedProcedure
    .input(z.object({
      employeeId: z.string().optional(),
      year: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const employeeId = input.employeeId || ctx.session.user.employeeId
      const year = input.year || new Date().getFullYear()
      
      if (!employeeId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Empleado no especificado",
        })
      }
      
      // Obtener tipos de ausencia disponibles
      const absenceTypes = await ctx.prisma.absenceType.findMany({
        where: {
          orgId: ctx.orgId,
          active: true,
        },
      })
      
      // Obtener balances
      const balances = await ctx.prisma.ptoBalance.findMany({
        where: {
          employeeId,
          year,
        },
      })
      
      // Mapear con tipos y calcular disponibles
      const balanceDetails = await Promise.all(
        absenceTypes.map(async (type) => {
          const balance = balances.find(b => b.typeId === type.id) || {
            accruedDays: 0,
            usedDays: 0,
            pendingDays: 0,
            carryoverDays: 0,
            adjustmentDays: 0,
          }
          
          const availableDays = 
            Number(balance.accruedDays) + 
            Number(balance.carryoverDays) + 
            Number(balance.adjustmentDays) -
            Number(balance.usedDays) - 
            Number(balance.pendingDays)
          
          return {
            typeId: type.id,
            typeName: type.name,
            typeCode: type.code,
            color: type.color,
            ...balance,
            availableDays,
          }
        })
      )
      
      return {
        year,
        employeeId,
        balances: balanceDetails,
        totals: {
          totalAccrued: balanceDetails.reduce((sum, b) => sum + Number(b.accruedDays), 0),
          totalUsed: balanceDetails.reduce((sum, b) => sum + Number(b.usedDays), 0),
          totalAvailable: balanceDetails.reduce((sum, b) => sum + b.availableDays, 0),
        },
      }
    }),

  // Crear solicitud de PTO
  createRequest: protectedProcedure
    .input(z.object({
      typeId: z.string(),
      startDate: z.date(),
      endDate: z.date(),
      startPeriod: z.enum(["FULL_DAY", "MORNING", "AFTERNOON"]).default("FULL_DAY"),
      endPeriod: z.enum(["FULL_DAY", "MORNING", "AFTERNOON"]).default("FULL_DAY"),
      reason: z.string().optional(),
      attachments: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const employeeId = ctx.session.user.employeeId
      
      if (!employeeId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Usuario no asociado a empleado",
        })
      }
      
      // Validar fechas
      if (input.startDate > input.endDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "La fecha de inicio no puede ser posterior a la de fin",
        })
      }
      
      // Obtener empleado con manager
      const employee = await ctx.prisma.employee.findUnique({
        where: { id: employeeId },
        include: { 
          manager: true,
          department: true,
        },
      })
      
      if (!employee) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Empleado no encontrado",
        })
      }
      
      // Obtener tipo de ausencia
      const absenceType = await ctx.prisma.absenceType.findFirst({
        where: {
          id: input.typeId,
          orgId: ctx.orgId,
          active: true,
        },
      })
      
      if (!absenceType) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tipo de ausencia no válido",
        })
      }
      
      // Calcular días totales
      const totalDays = calculatePTODays(
        input.startDate,
        input.endDate,
        input.startPeriod,
        input.endPeriod
      )
      
      // Validar balance disponible
      const year = input.startDate.getFullYear()
      const balance = await ctx.prisma.ptoBalance.findUnique({
        where: {
          employeeId_year_typeId: {
            employeeId,
            year,
            typeId: input.typeId,
          },
        },
      })
      
      const availableDays = balance
        ? Number(balance.accruedDays) + 
          Number(balance.carryoverDays) + 
          Number(balance.adjustmentDays) -
          Number(balance.usedDays) - 
          Number(balance.pendingDays)
        : 0
      
      if (availableDays < totalDays) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `No tienes suficientes días disponibles. Disponible: ${availableDays}, Solicitado: ${totalDays}`,
        })
      }
      
      // Validar días mínimos de antelación
      const daysUntilStart = Math.floor(
        (input.startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
      
      if (daysUntilStart < absenceType.minNoticeDays) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Este tipo de ausencia requiere ${absenceType.minNoticeDays} días de antelación`,
        })
      }
      
      // Verificar conflictos y políticas
      const conflicts = await checkPTOConflicts({
        employeeId,
        departmentId: employee.departmentId,
        startDate: input.startDate,
        endDate: input.endDate,
        orgId: ctx.orgId,
      })
      
      if (conflicts.hasConflicts) {
        throw new TRPCError({
          code: "CONFLICT",
          message: conflicts.message || "Hay conflictos con esta solicitud",
        })
      }
      
      // Crear solicitud con transacción
      const request = await ctx.prisma.$transaction(async (tx) => {
        // Generar número de solicitud
        const count = await tx.ptoRequest.count({
          where: { employeeId },
        })
        const requestNumber = `PTO-${employeeId.slice(-6)}-${count + 1}`
        
        // Crear solicitud
        const pto = await tx.ptoRequest.create({
          data: {
            requestNumber,
            employeeId,
            typeId: input.typeId,
            startDate: input.startDate,
            endDate: input.endDate,
            startPeriod: input.startPeriod,
            endPeriod: input.endPeriod,
            totalDays,
            reason: input.reason,
            attachments: input.attachments || [],
            status: "PENDING",
            approverId: employee.managerId,
          },
        })
        
        // Actualizar balance pendiente
        if (balance) {
          await tx.ptoBalance.update({
            where: {
              employeeId_year_typeId: {
                employeeId,
                year,
                typeId: input.typeId,
              },
            },
            data: {
              pendingDays: {
                increment: totalDays,
              },
            },
          })
        }
        
        // Crear notificación para el manager
        if (employee.managerId) {
          await tx.notification.create({
            data: {
              recipientId: employee.managerId,
              type: "PTO_REQUEST",
              title: "Nueva solicitud de ausencia",
              message: `${employee.firstName} ${employee.lastName} ha solicitado ${totalDays} días de ${absenceType.name}`,
              data: {
                requestId: pto.id,
                employeeId,
              },
            },
          })
        }
        
        // Audit log
        await tx.auditLog.create({
          data: {
            action: "PTO_REQUEST_CREATED",
            entityType: "PtoRequest",
            entityId: pto.id,
            userId: ctx.session.user.id,
            orgId: ctx.orgId,
            metadata: {
              days: totalDays,
              dates: { start: input.startDate, end: input.endDate },
            },
          },
        })
        
        return pto
      })
      
      return request
    }),

  // Obtener solicitudes
  getRequests: protectedProcedure
    .input(z.object({
      employeeId: z.string().optional(),
      status: z.enum(["DRAFT", "PENDING", "APPROVED", "REJECTED", "CANCELLED"]).optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      page: z.number().default(1),
      limit: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      const where: any = {
        ...(input.employeeId && { employeeId: input.employeeId }),
        ...(input.status && { status: input.status }),
      }
      
      // Filtro de fechas
      if (input.startDate || input.endDate) {
        where.OR = [
          {
            startDate: {
              gte: input.startDate,
              lte: input.endDate,
            },
          },
          {
            endDate: {
              gte: input.startDate,
              lte: input.endDate,
            },
          },
        ]
      }
      
      // Verificar permisos
      const canViewAll = await ctx.can("PTO_VIEW_ALL")
      const canViewTeam = await ctx.can("PTO_VIEW_TEAM")
      
      if (!canViewAll && !canViewTeam) {
        // Solo puede ver las suyas
        where.employeeId = ctx.session.user.employeeId
      } else if (canViewTeam && !canViewAll) {
        // Puede ver las de su equipo
        const teamMembers = await ctx.prisma.employee.findMany({
          where: { managerId: ctx.session.user.employeeId },
          select: { id: true },
        })
        where.employeeId = {
          in: [ctx.session.user.employeeId, ...teamMembers.map(m => m.id)],
        }
      }
      
      const [total, requests] = await ctx.prisma.$transaction([
        ctx.prisma.ptoRequest.count({ where }),
        ctx.prisma.ptoRequest.findMany({
          where,
          include: {
            employee: {
              select: {
                firstName: true,
                lastName: true,
                photoUrl: true,
              },
            },
            type: true,
            approver: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { createdAt: "desc" },
        }),
      ])
      
      return {
        requests,
        pagination: {
          total,
          page: input.page,
          limit: input.limit,
          totalPages: Math.ceil(total / input.limit),
        },
      }
    }),

  // Aprobar/Rechazar solicitud
  reviewRequest: protectedProcedure
    .input(z.object({
      requestId: z.string(),
      action: z.enum(["APPROVE", "REJECT"]),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Obtener solicitud
      const request = await ctx.prisma.ptoRequest.findUnique({
        where: { id: input.requestId },
        include: {
          employee: true,
          type: true,
        },
      })
      
      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Solicitud no encontrada",
        })
      }
      
      // Verificar permisos
      const canApproveAll = await ctx.can("PTO_APPROVE_ALL")
      const canApproveTeam = await ctx.can("PTO_APPROVE_TEAM")
      const isManager = request.approverId === ctx.session.user.employeeId
      
      if (!canApproveAll && (!canApproveTeam || !isManager)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No tienes permisos para aprobar esta solicitud",
        })
      }
      
      // Verificar estado actual
      if (request.status !== "PENDING") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Solo se pueden revisar solicitudes pendientes",
        })
      }
      
      // Procesar aprobación/rechazo
      const updated = await ctx.prisma.$transaction(async (tx) => {
        const newStatus = input.action === "APPROVE" ? "APPROVED" : "REJECTED"
        
        // Actualizar solicitud
        const pto = await tx.ptoRequest.update({
          where: { id: input.requestId },
          data: {
            status: newStatus,
            approverId: ctx.session.user.employeeId,
            approvedAt: new Date(),
            approverNotes: input.notes,
          },
        })
        
        // Actualizar balance
        const year = request.startDate.getFullYear()
        const balance = await tx.ptoBalance.findUnique({
          where: {
            employeeId_year_typeId: {
              employeeId: request.employeeId,
              year,
              typeId: request.typeId,
            },
          },
        })
        
        if (balance) {
          if (input.action === "APPROVE") {
            // Mover de pendiente a usado
            await tx.ptoBalance.update({
              where: { id: balance.id },
              data: {
                pendingDays: {
                  decrement: request.totalDays,
                },
                usedDays: {
                  increment: request.totalDays,
                },
              },
            })
          } else {
            // Liberar días pendientes
            await tx.ptoBalance.update({
              where: { id: balance.id },
              data: {
                pendingDays: {
                  decrement: request.totalDays,
                },
              },
            })
          }
        }
        
        // Crear notificación para el empleado
        await tx.notification.create({
          data: {
            recipientId: request.employee.userId!,
            type: "PTO_RESPONSE",
            title: `Solicitud ${newStatus === "APPROVED" ? "aprobada" : "rechazada"}`,
            message: `Tu solicitud de ${request.totalDays} días de ${request.type.name} ha sido ${newStatus === "APPROVED" ? "aprobada" : "rechazada"}`,
            data: {
              requestId: pto.id,
              status: newStatus,
            },
          },
        })
        
        // Audit log
        await tx.auditLog.create({
          data: {
            action: `PTO_REQUEST_${input.action}D`,
            entityType: "PtoRequest",
            entityId: pto.id,
            userId: ctx.session.user.id,
            orgId: ctx.orgId,
            metadata: {
              notes: input.notes,
              employeeId: request.employeeId,
            },
          },
        })
        
        return pto
      })
      
      return updated
    }),

  // Cancelar solicitud
  cancelRequest: protectedProcedure
    .input(z.object({
      requestId: z.string(),
      reason: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const request = await ctx.prisma.ptoRequest.findUnique({
        where: { id: input.requestId },
      })
      
      if (!request) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Solicitud no encontrada",
        })
      }
      
      // Verificar que es el propietario o tiene permisos
      const isOwner = request.employeeId === ctx.session.user.employeeId
      const canManage = await ctx.can("PTO_APPROVE_ALL")
      
      if (!isOwner && !canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No puedes cancelar esta solicitud",
        })
      }
      
      // Solo se pueden cancelar solicitudes pendientes o aprobadas futuras
      if (request.status === "REJECTED" || request.status === "CANCELLED") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Esta solicitud ya está cancelada o rechazada",
        })
      }
      
      if (request.status === "APPROVED" && request.startDate < new Date()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "No se pueden cancelar ausencias ya iniciadas",
        })
      }
      
      // Cancelar con transacción
      const cancelled = await ctx.prisma.$transaction(async (tx) => {
        // Actualizar solicitud
        const pto = await tx.ptoRequest.update({
          where: { id: input.requestId },
          data: {
            status: "CANCELLED",
            cancelledBy: ctx.session.user.id,
            cancelledAt: new Date(),
            cancelReason: input.reason,
          },
        })
        
        // Liberar días del balance
        const year = request.startDate.getFullYear()
        const balance = await tx.ptoBalance.findUnique({
          where: {
            employeeId_year_typeId: {
              employeeId: request.employeeId,
              year,
              typeId: request.typeId,
            },
          },
        })
        
        if (balance) {
          if (request.status === "PENDING") {
            // Liberar días pendientes
            await tx.ptoBalance.update({
              where: { id: balance.id },
              data: {
                pendingDays: {
                  decrement: request.totalDays,
                },
              },
            })
          } else if (request.status === "APPROVED") {
            // Devolver días usados
            await tx.ptoBalance.update({
              where: { id: balance.id },
              data: {
                usedDays: {
                  decrement: request.totalDays,
                },
              },
            })
          }
        }
        
        // Audit log
        await tx.auditLog.create({
          data: {
            action: "PTO_REQUEST_CANCELLED",
            entityType: "PtoRequest",
            entityId: pto.id,
            userId: ctx.session.user.id,
            orgId: ctx.orgId,
            metadata: { reason: input.reason },
          },
        })
        
        return pto
      })
      
      return cancelled
    }),

  // Calendario de ausencias del equipo
  getTeamCalendar: protectedProcedure
    .input(z.object({
      departmentId: z.string().optional(),
      month: z.number(),
      year: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const startDate = new Date(input.year, input.month - 1, 1)
      const endDate = new Date(input.year, input.month, 0)
      
      // Determinar alcance
      let employeeIds: string[] = []
      
      if (input.departmentId) {
        const employees = await ctx.prisma.employee.findMany({
          where: {
            departmentId: input.departmentId,
            orgId: ctx.orgId,
            status: "ACTIVE",
          },
          select: { id: true },
        })
        employeeIds = employees.map(e => e.id)
      } else {
        // Mi equipo
        const team = await ctx.prisma.employee.findMany({
          where: {
            managerId: ctx.session.user.employeeId,
            status: "ACTIVE",
          },
          select: { id: true },
        })
        employeeIds = team.map(e => e.id)
      }
      
      // Obtener ausencias aprobadas
      const absences = await ctx.prisma.ptoRequest.findMany({
        where: {
          employeeId: { in: employeeIds },
          status: "APPROVED",
          OR: [
            {
              startDate: {
                gte: startDate,
                lte: endDate,
              },
            },
            {
              endDate: {
                gte: startDate,
                lte: endDate,
              },
            },
          ],
        },
        include: {
          employee: {
            select: {
              firstName: true,
              lastName: true,
              photoUrl: true,
            },
          },
          type: {
            select: {
              name: true,
              color: true,
              icon: true,
            },
          },
        },
      })
      
      // Formatear para calendario
      const events = absences.map(absence => ({
        id: absence.id,
        title: `${absence.employee.firstName} ${absence.employee.lastName}`,
        start: absence.startDate,
        end: absence.endDate,
        color: absence.type.color,
        type: absence.type.name,
        employeePhoto: absence.employee.photoUrl,
        allDay: absence.startPeriod === "FULL_DAY" && absence.endPeriod === "FULL_DAY",
      }))
      
      return {
        month: input.month,
        year: input.year,
        events,
        statistics: {
          totalAbsences: absences.length,
          totalDays: absences.reduce((sum, a) => sum + Number(a.totalDays), 0),
          byType: absences.reduce((acc, a) => {
            acc[a.type.name] = (acc[a.type.name] || 0) + 1
            return acc
          }, {} as Record<string, number>),
        },
      }
    }),
})
```

### Servicio de PTO

```typescript
// src/server/services/pto.service.ts
import { prisma } from "@/server/db/client"
import { 
  differenceInBusinessDays, 
  eachDayOfInterval,
  isWeekend,
  addMonths,
  startOfYear,
  endOfYear 
} from "date-fns"

// Calcular días de PTO
export function calculatePTODays(
  startDate: Date,
  endDate: Date,
  startPeriod: "FULL_DAY" | "MORNING" | "AFTERNOON",
  endPeriod: "FULL_DAY" | "MORNING" | "AFTERNOON"
): number {
  // Obtener días laborables
  const days = eachDayOfInterval({ start: startDate, end: endDate })
  const workDays = days.filter(day => !isWeekend(day))
  
  let totalDays = workDays.length
  
  // Ajustar por medios días
  if (startPeriod !== "FULL_DAY") totalDays -= 0.5
  if (endPeriod !== "FULL_DAY") totalDays -= 0.5
  
  return totalDays
}

// Verificar conflictos de PTO
export async function checkPTOConflicts(params: {
  employeeId: string
  departmentId: string | null
  startDate: Date
  endDate: Date
  orgId: string
}): Promise<{
  hasConflicts: boolean
  message?: string
  details?: any
}> {
  const { employeeId, departmentId, startDate, endDate, orgId } = params
  
  // 1. Verificar solapamiento con otras solicitudes del empleado
  const overlapping = await prisma.ptoRequest.findFirst({
    where: {
      employeeId,
      status: { in: ["PENDING", "APPROVED"] },
      OR: [
        {
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
      ],
    },
  })
  
  if (overlapping) {
    return {
      hasConflicts: true,
      message: "Ya tienes una solicitud para estas fechas",
      details: { overlappingId: overlapping.id },
    }
  }
  
  // 2. Verificar ventanas negras (blackout periods)
  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
  })
  
  const blackouts = organization?.settings?.blackoutPeriods || []
  for (const blackout of blackouts) {
    const blackoutStart = new Date(blackout.start)
    const blackoutEnd = new Date(blackout.end)
    
    if (
      (startDate >= blackoutStart && startDate <= blackoutEnd) ||
      (endDate >= blackoutStart && endDate <= blackoutEnd)
    ) {
      return {
        hasConflicts: true,
        message: `Periodo bloqueado: ${blackout.reason}`,
        details: { blackout },
      }
    }
  }
  
  // 3. Verificar mínimos de servicio por departamento
  if (departmentId) {
    const departmentEmployees = await prisma.employee.count({
      where: {
        departmentId,
        status: "ACTIVE",
      },
    })
    
    const absencesInPeriod = await prisma.ptoRequest.count({
      where: {
        employee: { departmentId },
        status: "APPROVED",
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    })
    
    const minServiceLevel = organization?.settings?.minServiceLevel || 0.5
    const availableEmployees = departmentEmployees - absencesInPeriod - 1
    const serviceLevel = availableEmployees / departmentEmployees
    
    if (serviceLevel < minServiceLevel) {
      return {
        hasConflicts: true,
        message: `No hay suficiente cobertura en el departamento (mínimo ${minServiceLevel * 100}%)`,
        details: {
          departmentEmployees,
          absencesInPeriod,
          serviceLevel,
        },
      }
    }
  }
  
  // 4. Verificar límite máximo de ausencias simultáneas
  const maxSimultaneous = organization?.settings?.maxSimultaneousAbsences || 999
  const simultaneousAbsences = await prisma.ptoRequest.count({
    where: {
      employee: { orgId },
      status: "APPROVED",
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
  })
  
  if (simultaneousAbsences >= maxSimultaneous) {
    return {
      hasConflicts: true,
      message: `Límite de ausencias simultáneas alcanzado (máximo ${maxSimultaneous})`,
      details: { simultaneousAbsences },
    }
  }
  
  return { hasConflicts: false }
}

// Procesar devengo de PTO
export async function processPTOAccrual(
  employeeId: string,
  date: Date = new Date()
): Promise<void> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      contracts: {
        where: { active: true },
        take: 1,
      },
      organization: true,
    },
  })
  
  if (!employee || !employee.contracts[0]) return
  
  const contract = employee.contracts[0]
  const year = date.getFullYear()
  
  // Obtener tipos de ausencia con devengo
  const absenceTypes = await prisma.absenceType.findMany({
    where: {
      orgId: employee.orgId,
      active: true,
      isVacation: true,
    },
  })
  
  for (const type of absenceTypes) {
    // Buscar o crear balance
    const balance = await prisma.ptoBalance.upsert({
      where: {
        employeeId_year_typeId: {
          employeeId,
          year,
          typeId: type.id,
        },
      },
      create: {
        employeeId,
        year,
        typeId: type.id,
        accruedDays: 0,
        usedDays: 0,
        pendingDays: 0,
        carryoverDays: 0,
        adjustmentDays: 0,
      },
      update: {},
    })
    
    // Calcular devengo según política
    const policy = employee.organization.settings?.ptoPolicy || "MONTHLY"
    const annualDays = contract.vacationDays || 22
    
    if (policy === "ANNUAL") {
      // Devengo anual (al inicio del año)
      if (date.getMonth() === 0 && date.getDate() === 1) {
        await prisma.ptoBalance.update({
          where: { id: balance.id },
          data: {
            accruedDays: annualDays,
            lastAccrualDate: date,
          },
        })
      }
    } else if (policy === "MONTHLY") {
      // Devengo mensual
      const monthlyAccrual = annualDays / 12
      const lastAccrual = balance.lastAccrualDate || new Date(year, 0, 1)
      
      if (
        !balance.lastAccrualDate ||
        date.getMonth() !== lastAccrual.getMonth()
      ) {
        await prisma.ptoBalance.update({
          where: { id: balance.id },
          data: {
            accruedDays: {
              increment: monthlyAccrual,
            },
            lastAccrualDate: date,
          },
        })
      }
    } else if (policy === "PRORATA") {
      // Devengo proporcional
      const startOfYearDate = startOfYear(date)
      const daysWorked = differenceInBusinessDays(date, startOfYearDate)
      const totalWorkDays = 250 // Aproximadamente días laborables al año
      const accruedDays = (annualDays * daysWorked) / totalWorkDays
      
      await prisma.ptoBalance.update({
        where: { id: balance.id },
        data: {
          accruedDays: accruedDays,
          lastAccrualDate: date,
        },
      })
    }
  }
}

// Procesar arrastre de días (carryover)
export async function processCarryover(
  orgId: string,
  year: number
): Promise<void> {
  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
  })
  
  const maxCarryover = organization?.settings?.maxCarryoverDays || 5
  const carryoverDeadline = organization?.settings?.carryoverDeadline || "03-31"
  
  // Obtener todos los balances del año anterior
  const previousBalances = await prisma.ptoBalance.findMany({
    where: {
      year: year - 1,
      employee: {
        orgId,
        status: "ACTIVE",
      },
    },
  })
  
  for (const prevBalance of previousBalances) {
    const availableDays = 
      Number(prevBalance.accruedDays) + 
      Number(prevBalance.carryoverDays) + 
      Number(prevBalance.adjustmentDays) -
      Number(prevBalance.usedDays) - 
      Number(prevBalance.pendingDays)
    
    const carryoverDays = Math.min(availableDays, maxCarryover)
    
    if (carryoverDays > 0) {
      // Crear o actualizar balance del año actual
      await prisma.ptoBalance.upsert({
        where: {
          employeeId_year_typeId: {
            employeeId: prevBalance.employeeId,
            year,
            typeId: prevBalance.typeId,
          },
        },
        create: {
          employeeId: prevBalance.employeeId,
          year,
          typeId: prevBalance.typeId,
          accruedDays: 0,
          usedDays: 0,
          pendingDays: 0,
          carryoverDays,
          adjustmentDays: 0,
        },
        update: {
          carryoverDays,
        },
      })
    }
  }
}

// Validar solicitud de PTO
export async function validatePTORequest(params: {
  employeeId: string
  typeId: string
  startDate: Date
  endDate: Date
  orgId: string
}): Promise<{
  valid: boolean
  errors: string[]
}> {
  const errors: string[] = []
  
  // Validar fechas
  if (params.startDate < new Date()) {
    errors.push("No puedes solicitar días pasados")
  }
  
  if (params.startDate > params.endDate) {
    errors.push("La fecha de inicio debe ser anterior a la de fin")
  }
  
  // Validar tipo de ausencia
  const absenceType = await prisma.absenceType.findFirst({
    where: {
      id: params.typeId,
      orgId: params.orgId,
      active: true,
    },
  })
  
  if (!absenceType) {
    errors.push("Tipo de ausencia no válido")
  }
  
  // Validar empleado activo
  const employee = await prisma.employee.findFirst({
    where: {
      id: params.employeeId,
      orgId: params.orgId,
      status: "ACTIVE",
    },
  })
  
  if (!employee) {
    errors.push("Empleado no activo")
  }
  
  return {
    valid: errors.length === 0,
    errors,
  }
}
```

### Worker de Devengo Automático

```typescript
// src/server/jobs/pto-accrual.job.ts
import { CronJob } from "cron"
import { prisma } from "@/server/db/client"
import { processPTOAccrual, processCarryover } from "@/server/services/pto.service"

// Job diario para devengo
export const ptoAccrualJob = new CronJob(
  "0 2 * * *", // Todos los días a las 2 AM
  async () => {
    console.log("🏖️ Iniciando proceso de devengo PTO...")
    
    try {
      // Obtener todos los empleados activos
      const employees = await prisma.employee.findMany({
        where: { status: "ACTIVE" },
        select: { id: true },
      })
      
      // Procesar devengo para cada empleado
      for (const employee of employees) {
        await processPTOAccrual(employee.id)
      }
      
      console.log(`✅ Devengo procesado para ${employees.length} empleados`)
    } catch (error) {
      console.error("❌ Error en devengo PTO:", error)
    }
  },
  null,
  true,
  "Europe/Madrid"
)

// Job anual para arrastre
export const carryoverJob = new CronJob(
  "0 0 1 1 *", // 1 de enero a medianoche
  async () => {
    console.log("🔄 Iniciando proceso de arrastre anual...")
    
    try {
      const year = new Date().getFullYear()
      
      // Obtener todas las organizaciones
      const organizations = await prisma.organization.findMany({
        where: { active: true },
        select: { id: true },
      })
      
      // Procesar arrastre para cada organización
      for (const org of organizations) {
        await processCarryover(org.id, year)
      }
      
      console.log(`✅ Arrastre procesado para ${organizations.length} organizaciones`)
    } catch (error) {
      console.error("❌ Error en arrastre:", error)
    }
  },
  null,
  true,
  "Europe/Madrid"
)
```

---

**Continúa en PART 5: Nómina y Exportación →**
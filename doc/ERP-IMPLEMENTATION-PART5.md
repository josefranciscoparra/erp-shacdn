# 📚 ERP Implementation Guide - Part 5: Nómina, Exportación y Guía de Implementación

## 💰 Sistema de Nómina y Exportación

### Payroll Router (tRPC)

```typescript
// src/server/api/routers/payroll.ts
import { z } from "zod"
import { createTRPCRouter, protectedProcedure, withPermission } from "@/server/api/trpc"
import { TRPCError } from "@trpc/server"
import { generatePayrollExport, validatePayrollPeriod } from "@/server/services/payroll.service"
import { format } from "date-fns"

export const payrollRouter = createTRPCRouter({
  // Generar exportación de nómina
  generateExport: protectedProcedure
    .use(withPermission("PAYROLL_EXPORT"))
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
      costCenterIds: z.array(z.string()).optional(),
      employeeIds: z.array(z.string()).optional(),
      format: z.enum(["CSV", "EXCEL", "A3NOM", "SAGE", "CUSTOM"]).default("CSV"),
      includeDetails: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      // Validar periodo
      const validation = validatePayrollPeriod(input.startDate, input.endDate)
      if (!validation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: validation.error,
        })
      }
      
      // Determinar empleados a incluir
      let employeeFilter: any = { orgId: ctx.orgId }
      
      if (input.employeeIds?.length) {
        employeeFilter.id = { in: input.employeeIds }
      } else if (input.costCenterIds?.length) {
        employeeFilter.costCenterId = { in: input.costCenterIds }
      }
      
      // Obtener datos de empleados
      const employees = await ctx.prisma.employee.findMany({
        where: employeeFilter,
        include: {
          contracts: {
            where: {
              active: true,
              startDate: { lte: input.endDate },
              OR: [
                { endDate: null },
                { endDate: { gte: input.startDate } },
              ],
            },
          },
          costCenter: true,
          department: true,
          position: true,
        },
      })
      
      // Obtener resúmenes de jornadas
      const summaries = await ctx.prisma.workdaySummary.findMany({
        where: {
          employeeId: { in: employees.map(e => e.id) },
          date: {
            gte: input.startDate,
            lte: input.endDate,
          },
          approved: true, // Solo jornadas aprobadas
        },
      })
      
      // Obtener ausencias del periodo
      const absences = await ctx.prisma.ptoRequest.findMany({
        where: {
          employeeId: { in: employees.map(e => e.id) },
          status: "APPROVED",
          startDate: { lte: input.endDate },
          endDate: { gte: input.startDate },
        },
        include: {
          type: true,
        },
      })
      
      // Generar exportación
      const exportData = await generatePayrollExport({
        employees,
        summaries,
        absences,
        startDate: input.startDate,
        endDate: input.endDate,
        format: input.format,
        includeDetails: input.includeDetails,
        orgId: ctx.orgId,
      })
      
      // Guardar registro de exportación
      const exportRecord = await ctx.prisma.payrollExport.create({
        data: {
          orgId: ctx.orgId,
          startDate: input.startDate,
          endDate: input.endDate,
          format: input.format,
          employeeCount: employees.length,
          totalRecords: exportData.records.length,
          fileName: exportData.fileName,
          fileUrl: exportData.url,
          exportedBy: ctx.session.user.id,
          metadata: {
            costCenterIds: input.costCenterIds,
            filters: employeeFilter,
          },
        },
      })
      
      // Marcar jornadas como exportadas
      await ctx.prisma.workdaySummary.updateMany({
        where: {
          employeeId: { in: employees.map(e => e.id) },
          date: {
            gte: input.startDate,
            lte: input.endDate,
          },
        },
        data: {
          exported: true,
          exportedAt: new Date(),
        },
      })
      
      // Audit log
      await ctx.prisma.auditLog.create({
        data: {
          action: "PAYROLL_EXPORTED",
          entityType: "PayrollExport",
          entityId: exportRecord.id,
          userId: ctx.session.user.id,
          orgId: ctx.orgId,
          metadata: {
            period: { start: input.startDate, end: input.endDate },
            employeeCount: employees.length,
            format: input.format,
          },
        },
      })
      
      return exportData
    }),

  // Obtener resumen para nómina
  getPayrollSummary: protectedProcedure
    .use(withPermission("PAYROLL_VIEW"))
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
      groupBy: z.enum(["EMPLOYEE", "COST_CENTER", "DEPARTMENT"]).default("EMPLOYEE"),
    }))
    .query(async ({ ctx, input }) => {
      // Obtener todos los resúmenes del periodo
      const summaries = await ctx.prisma.workdaySummary.findMany({
        where: {
          employee: { orgId: ctx.orgId },
          date: {
            gte: input.startDate,
            lte: input.endDate,
          },
        },
        include: {
          employee: {
            include: {
              costCenter: true,
              department: true,
              contracts: {
                where: { active: true },
                take: 1,
              },
            },
          },
        },
      })
      
      // Agrupar según criterio
      const grouped = summaries.reduce((acc, summary) => {
        let key: string
        
        switch (input.groupBy) {
          case "COST_CENTER":
            key = summary.employee.costCenterId || "SIN_CENTRO"
            break
          case "DEPARTMENT":
            key = summary.employee.departmentId || "SIN_DEPARTAMENTO"
            break
          default:
            key = summary.employeeId
        }
        
        if (!acc[key]) {
          acc[key] = {
            id: key,
            name: input.groupBy === "EMPLOYEE" 
              ? `${summary.employee.firstName} ${summary.employee.lastName}`
              : input.groupBy === "COST_CENTER"
              ? summary.employee.costCenter?.name || "Sin centro"
              : summary.employee.department?.name || "Sin departamento",
            workedMinutes: 0,
            overtimeMinutes: 0,
            nightMinutes: 0,
            holidayMinutes: 0,
            breakMinutes: 0,
            days: 0,
            incidents: [],
            hourlyRate: summary.employee.contracts[0]?.hourlyRate || 0,
          }
        }
        
        acc[key].workedMinutes += summary.workedMinutes
        acc[key].overtimeMinutes += summary.overtimeMinutes
        acc[key].nightMinutes += summary.nightMinutes
        acc[key].holidayMinutes += summary.holidayMinutes
        acc[key].breakMinutes += summary.breakMinutes
        acc[key].days += 1
        
        if (summary.incidents?.length) {
          acc[key].incidents.push(...summary.incidents)
        }
        
        return acc
      }, {} as Record<string, any>)
      
      // Calcular costos estimados
      const withCosts = Object.values(grouped).map(group => {
        const regularHours = group.workedMinutes / 60
        const overtimeHours = group.overtimeMinutes / 60
        const nightHours = group.nightMinutes / 60
        const holidayHours = group.holidayMinutes / 60
        
        const regularCost = regularHours * group.hourlyRate
        const overtimeCost = overtimeHours * group.hourlyRate * 1.25 // +25%
        const nightCost = nightHours * group.hourlyRate * 0.25 // +25% adicional
        const holidayCost = holidayHours * group.hourlyRate * 1.75 // +75%
        
        return {
          ...group,
          regularHours,
          overtimeHours,
          nightHours,
          holidayHours,
          totalHours: regularHours + overtimeHours,
          estimatedCost: regularCost + overtimeCost + nightCost + holidayCost,
        }
      })
      
      // Totales generales
      const totals = withCosts.reduce(
        (acc, item) => ({
          workedMinutes: acc.workedMinutes + item.workedMinutes,
          overtimeMinutes: acc.overtimeMinutes + item.overtimeMinutes,
          nightMinutes: acc.nightMinutes + item.nightMinutes,
          holidayMinutes: acc.holidayMinutes + item.holidayMinutes,
          totalCost: acc.totalCost + item.estimatedCost,
          totalDays: acc.totalDays + item.days,
        }),
        { 
          workedMinutes: 0, 
          overtimeMinutes: 0, 
          nightMinutes: 0, 
          holidayMinutes: 0, 
          totalCost: 0,
          totalDays: 0,
        }
      )
      
      return {
        period: {
          start: input.startDate,
          end: input.endDate,
        },
        groupBy: input.groupBy,
        items: withCosts,
        totals,
      }
    }),

  // Configuración de mapeo para nómina
  getPayrollMapping: protectedProcedure
    .use(withPermission("PAYROLL_CONFIGURE"))
    .query(async ({ ctx }) => {
      const org = await ctx.prisma.organization.findUnique({
        where: { id: ctx.orgId },
      })
      
      return org?.settings?.payrollMapping || {
        concepts: {
          REGULAR_HOURS: "001",
          OVERTIME_HOURS: "002",
          NIGHT_HOURS: "003",
          HOLIDAY_HOURS: "004",
          VACATION_DAYS: "010",
          SICK_LEAVE: "011",
        },
        departments: {},
        costCenters: {},
      }
    }),

  updatePayrollMapping: protectedProcedure
    .use(withPermission("PAYROLL_CONFIGURE"))
    .input(z.object({
      concepts: z.record(z.string()),
      departments: z.record(z.string()).optional(),
      costCenters: z.record(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.organization.update({
        where: { id: ctx.orgId },
        data: {
          settings: {
            update: {
              payrollMapping: input,
            },
          },
        },
      })
      
      return { success: true }
    }),
})
```

### Servicio de Nómina

```typescript
// src/server/services/payroll.service.ts
import { prisma } from "@/server/db/client"
import ExcelJS from "exceljs"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { uploadToStorage } from "@/lib/storage"

export interface PayrollExportParams {
  employees: any[]
  summaries: any[]
  absences: any[]
  startDate: Date
  endDate: Date
  format: "CSV" | "EXCEL" | "A3NOM" | "SAGE" | "CUSTOM"
  includeDetails: boolean
  orgId: string
}

export async function generatePayrollExport(
  params: PayrollExportParams
): Promise<{
  fileName: string
  url: string
  records: any[]
  format: string
}> {
  const { employees, summaries, absences, startDate, endDate, format } = params
  
  // Obtener configuración de mapeo
  const org = await prisma.organization.findUnique({
    where: { id: params.orgId },
  })
  const mapping = org?.settings?.payrollMapping || {}
  
  // Generar registros
  const records: any[] = []
  
  for (const employee of employees) {
    // Filtrar resúmenes del empleado
    const empSummaries = summaries.filter(s => s.employeeId === employee.id)
    const empAbsences = absences.filter(a => a.employeeId === employee.id)
    
    // Calcular totales
    const totals = empSummaries.reduce(
      (acc, summary) => ({
        workedMinutes: acc.workedMinutes + summary.workedMinutes,
        overtimeMinutes: acc.overtimeMinutes + summary.overtimeMinutes,
        nightMinutes: acc.nightMinutes + summary.nightMinutes,
        holidayMinutes: acc.holidayMinutes + summary.holidayMinutes,
        breakMinutes: acc.breakMinutes + summary.breakMinutes,
      }),
      { 
        workedMinutes: 0, 
        overtimeMinutes: 0, 
        nightMinutes: 0, 
        holidayMinutes: 0, 
        breakMinutes: 0 
      }
    )
    
    // Calcular días de ausencia por tipo
    const absenceDays = empAbsences.reduce((acc, absence) => {
      const typeCode = absence.type.code
      acc[typeCode] = (acc[typeCode] || 0) + Number(absence.totalDays)
      return acc
    }, {} as Record<string, number>)
    
    // Crear registro según formato
    if (format === "A3NOM") {
      // Formato A3NOM (ejemplo)
      records.push({
        EMPRESA: "001",
        CENTRO: mapping.costCenters?.[employee.costCenterId] || employee.costCenter?.code,
        TRABAJADOR: employee.employeeCode,
        CONCEPTO: mapping.concepts?.REGULAR_HOURS || "001",
        UNIDADES: (totals.workedMinutes / 60).toFixed(2),
        IMPORTE: "",
      })
      
      if (totals.overtimeMinutes > 0) {
        records.push({
          EMPRESA: "001",
          CENTRO: mapping.costCenters?.[employee.costCenterId] || employee.costCenter?.code,
          TRABAJADOR: employee.employeeCode,
          CONCEPTO: mapping.concepts?.OVERTIME_HOURS || "002",
          UNIDADES: (totals.overtimeMinutes / 60).toFixed(2),
          IMPORTE: "",
        })
      }
      
      // Añadir ausencias
      for (const [typeCode, days] of Object.entries(absenceDays)) {
        records.push({
          EMPRESA: "001",
          CENTRO: mapping.costCenters?.[employee.costCenterId] || employee.costCenter?.code,
          TRABAJADOR: employee.employeeCode,
          CONCEPTO: mapping.concepts?.[typeCode] || typeCode,
          UNIDADES: days.toFixed(2),
          IMPORTE: "",
        })
      }
    } else if (format === "SAGE") {
      // Formato SAGE (ejemplo)
      records.push({
        CodEmpresa: "001",
        CodTrabajador: employee.employeeCode,
        NIF: employee.nifNie,
        Nombre: employee.firstName,
        Apellidos: employee.lastName,
        CodConcepto: mapping.concepts?.REGULAR_HOURS || "001",
        Cantidad: (totals.workedMinutes / 60).toFixed(2),
        Precio: employee.contracts[0]?.hourlyRate || 0,
        CodCentro: employee.costCenter?.code,
        CodDepartamento: employee.department?.code,
      })
    } else {
      // Formato genérico CSV/Excel
      const record: any = {
        "Código Empleado": employee.employeeCode,
        "Nombre": `${employee.firstName} ${employee.lastName}`,
        "NIF/NIE": employee.nifNie,
        "Centro de Costo": employee.costCenter?.name,
        "Departamento": employee.department?.name,
        "Horas Trabajadas": (totals.workedMinutes / 60).toFixed(2),
        "Horas Extra": (totals.overtimeMinutes / 60).toFixed(2),
        "Horas Nocturnas": (totals.nightMinutes / 60).toFixed(2),
        "Horas Festivo": (totals.holidayMinutes / 60).toFixed(2),
      }
      
      // Añadir columnas de ausencias
      for (const [typeCode, days] of Object.entries(absenceDays)) {
        record[`Días ${typeCode}`] = days.toFixed(2)
      }
      
      if (params.includeDetails) {
        // Añadir detalles diarios
        record["Detalle"] = empSummaries.map(s => ({
          fecha: format(s.date, "dd/MM/yyyy"),
          trabajado: s.workedMinutes,
          extra: s.overtimeMinutes,
          incidencias: s.incidents,
        }))
      }
      
      records.push(record)
    }
  }
  
  // Generar archivo según formato
  let fileBuffer: Buffer
  let fileName: string
  
  if (format === "EXCEL") {
    fileBuffer = await generateExcel(records, params)
    fileName = `nomina_${format(startDate, "yyyyMM")}_${format(endDate, "yyyyMM")}.xlsx`
  } else {
    fileBuffer = Buffer.from(generateCSV(records), "utf-8")
    fileName = `nomina_${format(startDate, "yyyyMM")}_${format(endDate, "yyyyMM")}.csv`
  }
  
  // Subir a storage
  const url = await uploadToStorage(fileBuffer, fileName, "payroll-exports")
  
  return {
    fileName,
    url,
    records,
    format,
  }
}

// Generar Excel
async function generateExcel(records: any[], params: PayrollExportParams): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet("Nómina")
  
  // Añadir información del periodo
  worksheet.addRow(["EXPORTACIÓN DE NÓMINA"])
  worksheet.addRow(["Periodo:", `${format(params.startDate, "dd/MM/yyyy")} - ${format(params.endDate, "dd/MM/yyyy")}`])
  worksheet.addRow([])
  
  // Añadir headers
  if (records.length > 0) {
    const headers = Object.keys(records[0]).filter(key => key !== "Detalle")
    worksheet.addRow(headers)
    
    // Estilo para headers
    const headerRow = worksheet.getRow(4)
    headerRow.font = { bold: true }
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    }
    
    // Añadir datos
    records.forEach(record => {
      const row = headers.map(header => record[header])
      worksheet.addRow(row)
    })
    
    // Autoajustar columnas
    worksheet.columns.forEach(column => {
      column.width = 15
    })
  }
  
  // Si hay detalles, añadir en otra hoja
  if (params.includeDetails) {
    const detailSheet = workbook.addWorksheet("Detalles")
    // ... añadir detalles
  }
  
  // Generar buffer
  const buffer = await workbook.xlsx.writeBuffer()
  return buffer as Buffer
}

// Generar CSV
function generateCSV(records: any[]): string {
  if (records.length === 0) return ""
  
  const headers = Object.keys(records[0]).filter(key => key !== "Detalle")
  const rows = [
    headers.join(";"),
    ...records.map(record => 
      headers.map(header => {
        const value = record[header]
        // Escapar valores con comas o comillas
        if (typeof value === "string" && (value.includes(";") || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }).join(";")
    ),
  ]
  
  return rows.join("\n")
}

// Validar periodo de nómina
export function validatePayrollPeriod(
  startDate: Date,
  endDate: Date
): { valid: boolean; error?: string } {
  // Verificar que no sea futuro
  if (startDate > new Date()) {
    return { valid: false, error: "No se puede exportar nómina de periodos futuros" }
  }
  
  // Verificar que el periodo no sea muy largo
  const maxDays = 62 // Máximo 2 meses
  const days = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  
  if (days > maxDays) {
    return { valid: false, error: `El periodo no puede exceder ${maxDays} días` }
  }
  
  // Verificar orden de fechas
  if (startDate >= endDate) {
    return { valid: false, error: "La fecha de inicio debe ser anterior a la de fin" }
  }
  
  return { valid: true }
}
```

## 🚀 Guía de Implementación Paso a Paso

### SPRINT 0: Fundaciones (Semana 1)

#### Día 1-2: Setup Inicial
```bash
# 1. Instalar todas las dependencias
npm install @prisma/client prisma
npm install next-auth@beta @auth/prisma-adapter bcryptjs
npm install @trpc/server @trpc/client @trpc/react-query @trpc/next superjson
npm install zod react-hook-form @hookform/resolvers
npm install date-fns uuid nanoid
npm install @upstash/ratelimit @upstash/redis
npm install @azure/storage-blob
npm install pino pino-pretty
npm install -D @types/bcryptjs

# 2. Configurar PostgreSQL local
createdb erp_dev

# 3. Inicializar Prisma
npx prisma init

# 4. Copiar schema de PART2
# Copiar todo el schema.prisma del documento PART2

# 5. Ejecutar migraciones
npx prisma migrate dev --name init

# 6. Generar cliente Prisma
npx prisma generate
```

#### Día 3-4: Configurar Auth y Seguridad
```typescript
// 1. Crear src/lib/auth/auth.config.ts
// Copiar configuración de PART1

// 2. Crear src/middleware.ts
// Copiar middleware de seguridad de PART1

// 3. Crear src/lib/security/*
// Implementar rate limiting, CSRF, encryption de PART1

// 4. Configurar variables de entorno
// Crear .env.local con todas las variables necesarias
```

#### Día 5: Setup tRPC y estructura base
```typescript
// 1. Crear src/server/api/trpc.ts
// Copiar configuración de PART1

// 2. Crear src/server/api/root.ts
// Definir routers principales

// 3. Crear src/app/api/trpc/[trpc]/route.ts
export { GET, POST } from "@/server/api/trpc-router"

// 4. Configurar cliente tRPC
// src/lib/trpc/client.ts
```

### SPRINT 1: Core RRHH (Semanas 2-3)

#### Semana 2: Empleados y Estructura
```typescript
// 1. Implementar Employee Router (PART2)
// 2. Crear páginas:
//    - src/app/(app)/employees/page.tsx (listado)
//    - src/app/(app)/employees/[id]/page.tsx (detalle)
//    - src/app/(app)/employees/new/page.tsx (crear)
// 3. Componentes UI
// 4. Testing básico
```

#### Semana 3: Contratos y Calendarios
```typescript
// 1. CRUD de contratos
// 2. Gestión de calendarios laborales
// 3. Importador de festivos
// 4. Organigrama interactivo
```

### SPRINT 2: Control Horario (Semanas 4-5)

#### Semana 4: Sistema de Fichaje
```typescript
// 1. Implementar TimeClock Router (PART3)
// 2. Crear widget de fichaje
// 3. Sistema antifraude
// 4. Cálculo de jornadas
```

#### Semana 5: Cuadrantes y Reportes
```typescript
// 1. Gestión de turnos
// 2. Panel de incidencias
// 3. Aprobación de jornadas
// 4. Exportación básica
```

### SPRINT 3: PTO (Semana 6)
```typescript
// 1. Implementar PTO Router (PART4)
// 2. Sistema de solicitudes
// 3. Flujo de aprobación
// 4. Calendario de equipo
// 5. Jobs de devengo
```

### SPRINT 4: Nómina y Notificaciones (Semana 7)
```typescript
// 1. Implementar Payroll Router (PART5)
// 2. Exportación multi-formato
// 3. Sistema de notificaciones
// 4. Reporting avanzado
```

### SPRINT 5: Testing y Deploy (Semana 8)
```typescript
// 1. Testing E2E con Playwright
// 2. Optimización de performance
// 3. Configuración Azure
// 4. Deploy a producción
// 5. Monitoring setup
```

## 📋 Checklist de Implementación

### ✅ Fundaciones
- [ ] PostgreSQL configurado
- [ ] Prisma schema completo
- [ ] NextAuth funcionando
- [ ] tRPC configurado
- [ ] Middleware de seguridad
- [ ] Rate limiting activo
- [ ] Audit logging

### ✅ Empleados
- [ ] CRUD completo
- [ ] Importador CSV
- [ ] Validaciones NIF/NIE
- [ ] Encriptación IBAN
- [ ] Organigrama
- [ ] Búsqueda y filtros

### ✅ Fichaje
- [ ] Clock in/out web
- [ ] Kiosco con PIN
- [ ] Antifraude activo
- [ ] Cálculo jornadas
- [ ] Aprobación batch
- [ ] Export nómina

### ✅ PTO
- [ ] Solicitudes
- [ ] Aprobaciones
- [ ] Balance tracking
- [ ] Devengo automático
- [ ] Calendario equipo
- [ ] Políticas configurables

### ✅ Nómina
- [ ] Export CSV/Excel
- [ ] Formatos A3NOM/SAGE
- [ ] Mapeo configurable
- [ ] Cálculo costos
- [ ] Histórico exports

### ✅ Seguridad
- [ ] Multi-tenancy
- [ ] RBAC completo
- [ ] Datos encriptados
- [ ] Audit completo
- [ ] GDPR compliance

## 🔧 Scripts Útiles

```json
// package.json
{
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:seed": "prisma db seed",
    "db:studio": "prisma studio",
    "test": "vitest",
    "test:e2e": "playwright test",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  }
}
```

## 🎯 Comandos de Desarrollo

```bash
# Desarrollo diario
npm run dev           # Iniciar servidor
npm run db:studio     # Ver base de datos

# Antes de commit
npm run lint          # Verificar código
npm run type-check    # Verificar tipos
npm test              # Tests unitarios

# Deploy
npm run build         # Build producción
npm run db:migrate deploy  # Migrar producción
npm start            # Iniciar producción
```

## 📝 Notas Finales

1. **Siempre** ejecuta migraciones con `prisma migrate dev` en desarrollo
2. **Nunca** expongas secretos en el código
3. **Siempre** valida inputs con Zod
4. **Usa** transacciones para operaciones críticas
5. **Implementa** tests desde el inicio
6. **Documenta** decisiones importantes

---

**¡El ERP está completamente documentado y listo para implementar!** 🚀
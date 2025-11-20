# Plan de Migración: Modelo de Horarios Normalizado

**Fecha:** 15 de Noviembre, 2025
**Estado:** Pendiente (planificado para después de demo del lunes)
**Estimación:** ~1 semana de trabajo

---

## 1. Problema del Modelo Actual

### Arquitectura Actual: Modelo Plano (56+ campos)

El contrato de empleo (`EmploymentContract`) almacena TODOS los campos de horarios directamente en una única tabla:

```typescript
// Campos FLEXIBLE (legacy)
weeklyHours: Decimal
workingDaysPerWeek: Int
hasCustomWeeklyPattern: Boolean
mondayHours, tuesdayHours, ..., sundayHours: Decimal (7 campos)

// Campos FIXED - Días laborables
workMonday, workTuesday, ..., workSunday: Boolean (7 campos)
hasFixedTimeSlots: Boolean

// Campos FIXED - Franjas horarias normales
mondayStartTime, mondayEndTime, ..., sundayStartTime, sundayEndTime: String (14 campos)

// Campos FIXED - Pausas normales
mondayBreakStartTime, mondayBreakEndTime, ..., sundayBreakStartTime, sundayBreakEndTime: String (14 campos)

// Jornada intensiva
hasIntensiveSchedule: Boolean
intensiveStartDate, intensiveEndDate: String (formato "MM-DD")
intensiveWeeklyHours: Decimal

// Campos FIXED - Franjas horarias intensivas
intensiveMondayStartTime, intensiveMondayEndTime, ..., intensiveSundayStartTime, intensiveSundayEndTime: String (14 campos)

// Campos FIXED - Pausas intensivas
intensiveMondayBreakStartTime, intensiveMondayBreakEndTime, ..., intensiveSundayBreakStartTime, intensiveSundayBreakEndTime: String (14 campos)
```

**Total: ~60 campos solo para horarios**

### Problemas Identificados

#### 1. Duplicación Masiva

- Cada nuevo "tipo de periodo" (verano, navidad, turnos especiales) requiere +28 campos más
- Prefijos infinitos: `intensive*`, `summer*`, `holiday*`, `project1*`, etc.
- Imposible de mantener a largo plazo

#### 2. Null Pollution

- Sábados y domingos llenos de `null` para oficinas de lunes-viernes
- Campos intensivos `null` cuando `hasIntensiveSchedule: false`
- Campos FLEXIBLE `null` en contratos FIXED y viceversa
- Dificulta consultas y validaciones

#### 3. Lógica de Negocio Compleja y Repetida

Para responder "¿A qué hora debe fichar hoy?":

```typescript
// Código actual (simplificado)
const isIntensivePeriod = isDateInRange(date, contract.intensiveStartDate, contract.intensiveEndDate);
const dayOfWeek = date.getDay();

let startTime;
if (isIntensivePeriod) {
  startTime = dayOfWeek === 1 ? contract.intensiveMondayStartTime :
              dayOfWeek === 2 ? contract.intensiveTuesdayStartTime :
              // ... 7 casos más
} else {
  startTime = dayOfWeek === 1 ? contract.mondayStartTime :
              dayOfWeek === 2 ? contract.tuesdayStartTime :
              // ... 7 casos más
}
```

Esta lógica se repite en:

- `getExpectedHoursForDay()` (admin-time-tracking.ts:263-452)
- `getEmployeeEntryTime()` (admin-time-tracking.ts:462-549)
- `getCurrentlyWorkingEmployees()` (admin-time-tracking.ts:1266-1416)
- Cálculos de ausencias, horas extras, compliance, etc.

#### 4. Escalabilidad Imposible

**Casos futuros que NO se pueden implementar con el modelo actual:**

- ✗ Turnos rotativos (semana A / semana B)
- ✗ Horarios por proyecto (dedicación parcial a múltiples proyectos)
- ✗ Periodos especiales múltiples (verano + navidad + semana santa)
- ✗ Días excepcionales (reunión todo el día, formación externa)
- ✗ Horarios temporales por baja de compañero
- ✗ Historial de cambios de horario

#### 5. Impacto en TimeNow

TimeNow necesitará:

- Avisos de "no ha fichado" → requiere saber hora de entrada esperada
- Alertas de "trabajando fuera de horario" → requiere ventanas permitidas
- Cálculo de horas extras → requiere horas esperadas vs. trabajadas
- Dashboard de ausencias → requiere detectar días laborables

Con el modelo actual, TimeNow tendrá que **duplicar toda la lógica condicional** de elegir entre campos normales/intensivos/futuros.

---

## 2. Modelo Normalizado Propuesto

### Arquitectura: Schedule → Periods → Days

```
┌─────────────────────┐
│   Schedule          │  1 por empleado
│  - type: FIXED/...  │
│  - weeklyHours      │
└──────────┬──────────┘
           │
           │ 1:N
           │
┌──────────▼───────────┐
│  SchedulePeriod      │  N periodos (normal, intensivo, verano, etc.)
│  - type: REGULAR/... │
│  - startDate (MM-DD) │
│  - endDate (MM-DD)   │
│  - weeklyHours       │
└──────────┬───────────┘
           │
           │ 1:7
           │
┌──────────▼───────────┐
│   DaySchedule        │  7 días por periodo (lunes-domingo)
│  - dayOfWeek: MONDAY │
│  - isWorkingDay      │
│  - startTime         │
│  - endTime           │
│  - breakStartTime    │
│  - breakEndTime      │
└──────────────────────┘
```

### Schema Prisma Propuesto

```prisma
// Nuevo modelo principal de horario
model Schedule {
  id        String   @id @default(cuid())
  contractId String  @unique
  contract  EmploymentContract @relation(fields: [contractId], references: [id], onDelete: Cascade)

  scheduleType ScheduleType @default(FIXED)
  weeklyHours  Decimal      @default(40)

  periods SchedulePeriod[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([contractId])
}

enum ScheduleType {
  FLEXIBLE
  FIXED
  SHIFTS
  ROTATING
}

// Periodos dentro del horario (normal, intensivo, verano, etc.)
model SchedulePeriod {
  id         String   @id @default(cuid())
  scheduleId String
  schedule   Schedule @relation(fields: [scheduleId], references: [id], onDelete: Cascade)

  type       PeriodType @default(REGULAR)
  startDate  String?    // "MM-DD" o null para REGULAR (todo el año)
  endDate    String?    // "MM-DD" o null para REGULAR

  weeklyHours        Decimal
  workingDaysPerWeek Int     @default(5)

  days DaySchedule[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([scheduleId])
  @@index([type])
}

enum PeriodType {
  REGULAR    // Todo el año (por defecto)
  INTENSIVE  // Jornada intensiva (verano)
  SUMMER     // Verano (futuro)
  HOLIDAY    // Navidad (futuro)
  SPECIAL    // Eventos especiales (futuro)
}

// Días de la semana dentro de cada periodo
model DaySchedule {
  id       String @id @default(cuid())
  periodId String
  period   SchedulePeriod @relation(fields: [periodId], references: [id], onDelete: Cascade)

  dayOfWeek DayOfWeek

  isWorkingDay Boolean @default(false)

  // Franjas horarias (solo si isWorkingDay = true)
  startTime String? // "09:00"
  endTime   String? // "18:00"

  // Pausas (opcional)
  breakStartTime String? // "14:00"
  breakEndTime   String? // "15:00"

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([periodId, dayOfWeek])
  @@index([periodId])
}

enum DayOfWeek {
  MONDAY
  TUESDAY
  WEDNESDAY
  THURSDAY
  FRIDAY
  SATURDAY
  SUNDAY
}
```

### Ejemplo de Datos

**Empleado con horario normal + jornada intensiva:**

```json
{
  "schedule": {
    "scheduleType": "FIXED",
    "weeklyHours": 40,
    "periods": [
      {
        "type": "REGULAR",
        "startDate": null,
        "endDate": null,
        "weeklyHours": 40,
        "workingDaysPerWeek": 5,
        "days": [
          {
            "dayOfWeek": "MONDAY",
            "isWorkingDay": true,
            "startTime": "09:00",
            "endTime": "18:00",
            "breakStartTime": "14:00",
            "breakEndTime": "15:00"
          },
          {
            "dayOfWeek": "TUESDAY",
            "isWorkingDay": true,
            "startTime": "09:00",
            "endTime": "18:00",
            "breakStartTime": "14:00",
            "breakEndTime": "15:00"
          },
          {
            "dayOfWeek": "WEDNESDAY",
            "isWorkingDay": true,
            "startTime": "09:00",
            "endTime": "18:00",
            "breakStartTime": "14:00",
            "breakEndTime": "15:00"
          },
          {
            "dayOfWeek": "THURSDAY",
            "isWorkingDay": true,
            "startTime": "09:00",
            "endTime": "18:00",
            "breakStartTime": "14:00",
            "breakEndTime": "15:00"
          },
          {
            "dayOfWeek": "FRIDAY",
            "isWorkingDay": true,
            "startTime": "09:00",
            "endTime": "14:00",
            "breakStartTime": null,
            "breakEndTime": null
          },
          {
            "dayOfWeek": "SATURDAY",
            "isWorkingDay": false,
            "startTime": null,
            "endTime": null,
            "breakStartTime": null,
            "breakEndTime": null
          },
          {
            "dayOfWeek": "SUNDAY",
            "isWorkingDay": false,
            "startTime": null,
            "endTime": null,
            "breakStartTime": null,
            "breakEndTime": null
          }
        ]
      },
      {
        "type": "INTENSIVE",
        "startDate": "06-15",
        "endDate": "09-01",
        "weeklyHours": 32.5,
        "workingDaysPerWeek": 5,
        "days": [
          {
            "dayOfWeek": "MONDAY",
            "isWorkingDay": true,
            "startTime": "08:00",
            "endTime": "15:00",
            "breakStartTime": null,
            "breakEndTime": null
          },
          {
            "dayOfWeek": "TUESDAY",
            "isWorkingDay": true,
            "startTime": "08:00",
            "endTime": "15:00",
            "breakStartTime": null,
            "breakEndTime": null
          },
          {
            "dayOfWeek": "WEDNESDAY",
            "isWorkingDay": true,
            "startTime": "08:00",
            "endTime": "15:00",
            "breakStartTime": null,
            "breakEndTime": null
          },
          {
            "dayOfWeek": "THURSDAY",
            "isWorkingDay": true,
            "startTime": "08:00",
            "endTime": "15:00",
            "breakStartTime": null,
            "breakEndTime": null
          },
          {
            "dayOfWeek": "FRIDAY",
            "isWorkingDay": true,
            "startTime": "08:00",
            "endTime": "14:30",
            "breakStartTime": null,
            "breakEndTime": null
          },
          {
            "dayOfWeek": "SATURDAY",
            "isWorkingDay": false,
            "startTime": null,
            "endTime": null,
            "breakStartTime": null,
            "breakEndTime": null
          },
          {
            "dayOfWeek": "SUNDAY",
            "isWorkingDay": false,
            "startTime": null,
            "endTime": null,
            "breakStartTime": null,
            "breakEndTime": null
          }
        ]
      }
    ]
  }
}
```

---

## 3. Ventajas del Modelo Normalizado

### 3.1 Escalabilidad

✅ **Añadir nuevos periodos = añadir filas, NO columnas**

```typescript
// Añadir periodo de navidad (futuro)
await prisma.schedulePeriod.create({
  data: {
    scheduleId: schedule.id,
    type: "HOLIDAY",
    startDate: "12-20",
    endDate: "01-07",
    weeklyHours: 30,
    days: [...] // Solo 7 objetos
  }
});
```

No se necesita migración de schema ni añadir 28 campos más.

### 3.2 Lógica Centralizada

✅ **Un solo servicio que sabe calcular horarios:**

```typescript
// API simple y consistente
const schedule = await ScheduleService.getScheduleForDate(employeeId, new Date());

// Retorna SIEMPRE el mismo formato, independiente de si es normal/intensivo/verano/etc.
{
  hoursExpected: 8,
  isWorkingDay: true,
  startTime: "09:00",
  endTime: "18:00",
  breakStart: "14:00",
  breakEnd: "15:00",
  period: { type: "REGULAR" }
}
```

### 3.3 Sin Null Pollution

✅ **Solo se almacenan datos que existen:**

- Sábados/domingos no laborables → `isWorkingDay: false`, sin guardar tiempos
- No hay periodo intensivo → no existe el registro `SchedulePeriod` de tipo INTENSIVE
- No hay pausas → campos `breakStartTime`/`breakEndTime` en null

### 3.4 Consultas Eficientes

✅ **Queries optimizadas con relaciones:**

```typescript
// Obtener todos los periodos de un empleado
const schedule = await prisma.schedule.findUnique({
  where: { contractId },
  include: {
    periods: {
      include: {
        days: true,
      },
    },
  },
});

// O solo el periodo activo para hoy
const activePeriod = await getActivePeriodForDate(scheduleId, new Date());
```

### 3.5 Historial y Auditoría

✅ **Fácil implementar historial de cambios:**

```prisma
model SchedulePeriodHistory {
  id        String @id @default(cuid())
  periodId  String
  changedBy String
  changedAt DateTime
  changes   Json   // { field: "startTime", from: "09:00", to: "08:30" }
}
```

### 3.6 Casos de Uso Futuros

✅ **Soporta casos complejos sin cambios de schema:**

1. **Turnos rotativos:**

```prisma
model Schedule {
  rotationPattern String? // "WEEK_A|WEEK_B"
  periods SchedulePeriod[] // 2 periodos (A y B)
}
```

2. **Horarios por proyecto:**

```prisma
model Schedule {
  projectAllocations ProjectAllocation[] // Múltiples proyectos
}

model ProjectAllocation {
  projectId String
  percentage Decimal // 50% → 20h/semana
  period SchedulePeriod
}
```

3. **Días excepcionales:**

```prisma
model ExceptionalDay {
  scheduleId String
  date       DateTime
  reason     String
  override   Json // Horario especial para ese día
}
```

---

## 4. Plan de Migración Paso a Paso

### Fase 0: Preparación (HECHO ✅)

- [x] Documento de migración creado
- [x] Análisis de código actual completado
- [x] Funciones críticas identificadas:
  - `getExpectedHoursForDay()`
  - `getEmployeeEntryTime()`
  - `getCurrentlyWorkingEmployees()`

### Fase 1: Nuevos Modelos Prisma (~1 día)

**Tareas:**

1. Añadir nuevos modelos al schema:

```bash
# Editar prisma/schema.prisma
# Añadir: Schedule, SchedulePeriod, DaySchedule
```

2. Crear migración:

```bash
npx prisma migrate dev --name add_normalized_schedule_model
```

3. Mantener campos viejos como `@deprecated` temporalmente:

```prisma
model EmploymentContract {
  // ... campos existentes marcados como deprecated
  /// @deprecated Use Schedule relation instead
  weeklyHours Decimal?

  // Nueva relación
  schedule Schedule?
}
```

### Fase 2: Script de Migración de Datos (~1 día)

**Crear `/scripts/migrate-schedules.ts`:**

```typescript
import { prisma } from "@/lib/prisma";

async function migrateContractSchedules() {
  const contracts = await prisma.employmentContract.findMany({
    where: {
      active: true,
      scheduleType: { not: null },
    },
  });

  for (const contract of contracts) {
    // Crear Schedule
    const schedule = await prisma.schedule.create({
      data: {
        contractId: contract.id,
        scheduleType: contract.scheduleType ?? "FLEXIBLE",
        weeklyHours: contract.weeklyHours ?? 40,
      },
    });

    // Crear periodo REGULAR
    const regularPeriod = await prisma.schedulePeriod.create({
      data: {
        scheduleId: schedule.id,
        type: "REGULAR",
        startDate: null,
        endDate: null,
        weeklyHours: contract.weeklyHours ?? 40,
        workingDaysPerWeek: contract.workingDaysPerWeek ?? 5,
      },
    });

    // Crear días del periodo REGULAR
    const regularDays = await createDaysFromContract(regularPeriod.id, contract, false);

    // Si tiene jornada intensiva, crear periodo INTENSIVE
    if (contract.hasIntensiveSchedule) {
      const intensivePeriod = await prisma.schedulePeriod.create({
        data: {
          scheduleId: schedule.id,
          type: "INTENSIVE",
          startDate: contract.intensiveStartDate,
          endDate: contract.intensiveEndDate,
          weeklyHours: contract.intensiveWeeklyHours ?? contract.weeklyHours ?? 40,
          workingDaysPerWeek: contract.workingDaysPerWeek ?? 5,
        },
      });

      const intensiveDays = await createDaysFromContract(intensivePeriod.id, contract, true);
    }
  }
}

async function createDaysFromContract(periodId: string, contract: any, isIntensive: boolean) {
  const dayMapping = [
    {
      day: "MONDAY",
      work: contract.workMonday,
      start: contract.mondayStartTime,
      end: contract.mondayEndTime,
      breakStart: contract.mondayBreakStartTime,
      breakEnd: contract.mondayBreakEndTime,
    },
    {
      day: "TUESDAY",
      work: contract.workTuesday,
      start: contract.tuesdayStartTime,
      end: contract.tuesdayEndTime,
      breakStart: contract.tuesdayBreakStartTime,
      breakEnd: contract.tuesdayBreakEndTime,
    },
    // ... resto de días
  ];

  // Si es intensivo, usar campos intensive*
  if (isIntensive) {
    dayMapping[0].start = contract.intensiveMondayStartTime;
    // ... resto de mapeos intensivos
  }

  for (const { day, work, start, end, breakStart, breakEnd } of dayMapping) {
    await prisma.daySchedule.create({
      data: {
        periodId,
        dayOfWeek: day,
        isWorkingDay: work ?? false,
        startTime: start,
        endTime: end,
        breakStartTime: breakStart,
        breakEndTime: breakEnd,
      },
    });
  }
}

// Ejecutar
migrateContractSchedules()
  .then(() => console.log("✅ Migración completada"))
  .catch((e) => console.error("❌ Error en migración:", e))
  .finally(() => prisma.$disconnect());
```

**Ejecutar:**

```bash
npx tsx scripts/migrate-schedules.ts
```

### Fase 3: Servicio de Abstracción Mejorado (~2 días)

**Actualizar `/src/lib/services/schedule-service.ts`:**

```typescript
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

export class ScheduleService {
  /**
   * Obtiene el periodo activo para una fecha
   */
  private static async getActivePeriod(scheduleId: string, date: Date) {
    const currentMonthDay = format(date, "MM-dd");

    // Buscar periodo intensivo/especial que contenga esta fecha
    const specialPeriod = await prisma.schedulePeriod.findFirst({
      where: {
        scheduleId,
        type: { not: "REGULAR" },
        OR: [
          // Periodo dentro del mismo año (ej: 06-15 a 09-01)
          {
            startDate: { lte: currentMonthDay },
            endDate: { gte: currentMonthDay },
          },
          // Periodo que cruza año (ej: 12-15 a 02-15)
          {
            startDate: { gt: prisma.schedulePeriod.fields.endDate },
            OR: [{ startDate: { lte: currentMonthDay } }, { endDate: { gte: currentMonthDay } }],
          },
        ],
      },
      include: { days: true },
    });

    if (specialPeriod) return specialPeriod;

    // Fallback a periodo REGULAR
    return prisma.schedulePeriod.findFirst({
      where: { scheduleId, type: "REGULAR" },
      include: { days: true },
    });
  }

  /**
   * Obtiene horario completo para una fecha específica
   */
  static async getScheduleForDate(contractId: string, date: Date) {
    const schedule = await prisma.schedule.findUnique({
      where: { contractId },
      include: { periods: { include: { days: true } } },
    });

    if (!schedule) {
      return {
        hoursExpected: 0,
        isWorkingDay: false,
        isHoliday: false,
        hasActiveContract: false,
      };
    }

    const activePeriod = await this.getActivePeriod(schedule.id, date);
    if (!activePeriod) return { hoursExpected: 0, isWorkingDay: false, isHoliday: false, hasActiveContract: true };

    const dayOfWeek = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"][date.getDay()];
    const daySchedule = activePeriod.days.find((d) => d.dayOfWeek === dayOfWeek);

    if (!daySchedule) return { hoursExpected: 0, isWorkingDay: false, isHoliday: false, hasActiveContract: true };

    // Calcular horas desde time slots
    let hoursExpected = 0;
    if (daySchedule.isWorkingDay && daySchedule.startTime && daySchedule.endTime) {
      hoursExpected = this.calculateHoursFromTimeSlots(
        daySchedule.startTime,
        daySchedule.endTime,
        daySchedule.breakStartTime,
        daySchedule.breakEndTime,
      );
    }

    return {
      hoursExpected,
      isWorkingDay: daySchedule.isWorkingDay,
      isHoliday: false, // Verificar contra calendar
      hasActiveContract: true,
      expectedEntryTime: daySchedule.startTime,
      expectedExitTime: daySchedule.endTime,
      breakStart: daySchedule.breakStartTime,
      breakEnd: daySchedule.breakEndTime,
      period: {
        type: activePeriod.type,
        weeklyHours: Number(activePeriod.weeklyHours),
      },
    };
  }

  private static calculateHoursFromTimeSlots(
    startTime: string,
    endTime: string,
    breakStart: string | null,
    breakEnd: string | null,
  ): number {
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);

    let totalMinutes = endHour * 60 + endMin - (startHour * 60 + startMin);

    if (breakStart && breakEnd) {
      const [breakStartHour, breakStartMin] = breakStart.split(":").map(Number);
      const [breakEndHour, breakEndMin] = breakEnd.split(":").map(Number);
      const breakMinutes = breakEndHour * 60 + breakEndMin - (breakStartHour * 60 + breakStartMin);
      totalMinutes -= breakMinutes;
    }

    return totalMinutes / 60;
  }
}
```

### Fase 4: Actualizar Server Actions (~1 día)

**Modificar `/src/server/actions/admin-time-tracking.ts`:**

```typescript
// Reemplazar getExpectedHoursForDay con:
export async function getExpectedHoursForDay(employeeId: string, targetDate: Date) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      orgId: true,
      employmentContracts: {
        where: { active: true },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!employee || !employee.employmentContracts[0]) {
    return { hoursExpected: 0, isWorkingDay: false, isHoliday: false, hasActiveContract: false };
  }

  const contractId = employee.employmentContracts[0].id;

  // Usar nuevo servicio
  return ScheduleService.getScheduleForDate(contractId, targetDate);
}
```

### Fase 5: Adaptar Frontend (~1 día)

**Wizard Step 3 - Transformar estructura:**

En lugar de guardar campos planos, transformar a formato normalizado:

```typescript
async function handleSubmit(data: ScheduleFormData) {
  const payload = {
    schedule: {
      scheduleType: data.scheduleType,
      weeklyHours: data.weeklyHours,
      periods: [
        {
          type: "REGULAR",
          weeklyHours: data.weeklyHours,
          workingDaysPerWeek: data.workingDaysPerWeek,
          days: [
            { dayOfWeek: "MONDAY", isWorkingDay: data.workMonday, startTime: data.mondayStartTime, ... },
            // ... resto de días
          ]
        },
        ...(data.hasIntensiveSchedule ? [{
          type: "INTENSIVE",
          startDate: data.intensiveStartDate,
          endDate: data.intensiveEndDate,
          weeklyHours: data.intensiveWeeklyHours,
          days: [
            { dayOfWeek: "MONDAY", isWorkingDay: data.workMonday, startTime: data.intensiveMondayStartTime, ... },
            // ... resto de días
          ]
        }] : [])
      ]
    }
  };

  await createEmployeeWithSchedule(payload);
}
```

### Fase 6: Testing (~1 día)

**Tests a ejecutar:**

1. ✅ Migración de datos: verificar que TODOS los contratos se migraron correctamente
2. ✅ Wizard de empleados: crear empleado nuevo con horario FIXED + intensivo
3. ✅ Edición de horarios: modificar horario existente
4. ✅ Time tracking: verificar que `/time-tracking` y `/live` funcionan
5. ✅ Ausencias: verificar que detección de ausentes funciona
6. ✅ Horas esperadas: comparar resultados antes/después de migración

### Fase 7: Limpieza (~0.5 días)

**Eliminar código legacy:**

1. Eliminar campos deprecated del schema:

```bash
npx prisma migrate dev --name remove_legacy_schedule_fields
```

2. Eliminar código viejo de `admin-time-tracking.ts`:

```typescript
// Eliminar:
// - calculateFixedScheduleHours()
// - Arrays de startTimeFields, intensiveStartTimeFields, etc.
```

3. Actualizar documentación

---

## 5. Script de Migración Completo

**Archivo: `/scripts/migrate-schedules.ts`**

Ver código completo en Fase 2 arriba.

**Ejecución:**

```bash
# Backup de base de datos ANTES de ejecutar
pg_dump -U erp_user erp_dev > backup_pre_migration.sql

# Ejecutar migración
npx tsx scripts/migrate-schedules.ts

# Verificar resultados
npx tsx scripts/verify-migration.ts
```

---

## 6. Rollback Plan

Si algo sale mal durante la migración:

### Opción 1: Rollback de Migración Prisma

```bash
# Volver a migración anterior
npx prisma migrate resolve --rolled-back [migration_name]

# Restaurar desde backup
psql -U erp_user -d erp_dev < backup_pre_migration.sql
```

### Opción 2: Mantener Campos Legacy

Durante toda la migración, los campos viejos se mantienen con `@deprecated` pero funcionales. Si hay problemas:

1. Revertir código a usar campos viejos
2. Eliminar nuevas tablas cuando esté listo
3. Replantear migración

---

## 7. Checklist de Ejecución

### Pre-migración

- [ ] Backup completo de base de datos
- [ ] Código en rama separada (`schedule-migration`)
- [ ] Tests existentes pasan 100%
- [ ] Coordinar con equipo (nadie más trabajando en horarios)

### Durante migración

- [ ] Ejecutar migración Prisma (nuevos modelos)
- [ ] Ejecutar script de datos
- [ ] Verificar que TODOS los contratos se migraron
- [ ] Actualizar ScheduleService
- [ ] Actualizar server actions
- [ ] Actualizar wizard frontend
- [ ] Ejecutar tests

### Post-migración

- [ ] Verificar `/time-tracking` funciona
- [ ] Verificar `/live` funciona
- [ ] Verificar detección de ausencias funciona
- [ ] Crear 1 empleado nuevo para probar wizard
- [ ] Editar 1 horario existente para probar edición
- [ ] Comparar horas esperadas antes/después
- [ ] Eliminar campos legacy cuando todo esté verificado
- [ ] Actualizar documentación

---

## 8. Estimación de Tiempo

| Fase      | Tarea                  | Tiempo                   |
| --------- | ---------------------- | ------------------------ |
| 1         | Nuevos modelos Prisma  | 1 día                    |
| 2         | Script migración datos | 1 día                    |
| 3         | Servicio abstracción   | 2 días                   |
| 4         | Server actions         | 1 día                    |
| 5         | Frontend (wizard)      | 1 día                    |
| 6         | Testing completo       | 1 día                    |
| 7         | Limpieza y docs        | 0.5 días                 |
| **TOTAL** |                        | **~1 semana (7.5 días)** |

---

## 9. Beneficios Post-Migración

### Inmediatos

- ✅ Código más limpio y mantenible
- ✅ Lógica centralizada en ScheduleService
- ✅ Sin duplicación de lógica condicional
- ✅ Queries más eficientes (3 tablas relacionadas vs. 1 tabla con 60 campos)

### A Medio Plazo (3-6 meses)

- ✅ Fácil añadir turnos rotativos
- ✅ Fácil añadir más periodos especiales (verano, navidad)
- ✅ Fácil implementar historial de cambios
- ✅ Fácil añadir horarios por proyecto

### A Largo Plazo (1+ años)

- ✅ TimeNow integración simple (API consistente)
- ✅ Reportes avanzados (compliance, ausencias, extras)
- ✅ Escalabilidad probada (100+ empleados con horarios complejos)
- ✅ Base sólida para funcionalidades futuras

---

## 10. Notas Finales

### Lecciones Aprendidas del Modelo Actual

1. **Empezar simple, pero pensar en escala**: El modelo plano funcionó para MVP, pero creció sin control.
2. **Normalizar temprano**: Es más fácil normalizar con 10 empleados que con 1000.
3. **Testing constante**: La lógica de horarios es compleja, los tests evitan bugs.

### Recomendaciones para el Futuro

1. **NO añadir más campos planos**: Si necesitas verano/navidad, usa el modelo normalizado.
2. **Usar ScheduleService siempre**: No acceder directamente a campos de contrato.
3. **Documentar cambios**: Cualquier cambio en lógica de horarios debe documentarse.

---

**Documento creado:** 15 Nov 2025
**Autor:** Claude (con validación del equipo)
**Estado:** Pendiente de ejecución (post-demo lunes)

# Plan: Integración de Validación de Días Laborables y Festivos en Páginas de Administración

**Fecha:** 2025-11-15
**Objetivo:** Integrar la lógica completa de validación de días laborables, festivos y detección de ausencias reales en las páginas de administración de fichajes.

---

## 📋 Tabla de Contenidos

1. [Contexto y Problema](#contexto-y-problema)
2. [Páginas Afectadas](#páginas-afectadas)
3. [Solución Propuesta](#solución-propuesta)
4. [Implementación Detallada](#implementación-detallada)
5. [Casos de Uso y Ejemplos](#casos-de-uso-y-ejemplos)
6. [Testing](#testing)

---

## Contexto y Problema

### Estado Actual

Ya existe una función `getExpectedHoursForToday()` en `/src/server/actions/time-tracking.ts` que:

- ✅ Valida tipo de contrato (FLEXIBLE, FIXED, SHIFTS)
- ✅ Considera patrón semanal personalizado
- ✅ Detecta jornada intensiva
- ✅ Verifica festivos del calendario de la organización
- ✅ Retorna si hoy es día laborable

### Problemas Identificados

#### Página `/dashboard/time-tracking/live`

1. **Contador "Sin fichar" incorrecto:**
   - Cuenta como "sin fichar" a empleados en festivos
   - Cuenta como "sin fichar" a empleados en fines de semana
   - Cuenta como "sin fichar" a empleados con día no laborable según contrato
   - **NO diferencia** entre "aún no ha llegado su hora" vs "ausente (pasó su hora de entrada)"

2. **Falta detección de ausencias reales:**
   - No considera el horario de entrada del empleado
   - No aplica margen de tolerancia (ej: 15 minutos)
   - No alerta cuando un empleado DEBERÍA estar trabajando pero no fichó

#### Página `/dashboard/time-tracking/[employeeId]`

1. **Cálculo de días laborables obsoleto:**
   - `calculateWorkableDays()` solo excluye fines de semana
   - **NO considera festivos**
   - **NO considera tipo de contrato**
   - **NO considera patrón semanal**
   - Línea 21 tiene un TODO: _"TODO: En el futuro, excluir también festivos y vacaciones"_

2. **Muestra ausencias incorrectamente:**
   - Genera días "virtuales" para TODOS los días del rango
   - Marca como "ABSENT" incluso fines de semana y festivos
   - No diferencia entre:
     - ❌ Día laborable ausente (MALO)
     - ✅ Fin de semana (NORMAL)
     - ✅ Festivo (NORMAL)
     - ✅ Día no laborable según contrato

3. **Estadísticas engañosas:**
   - Resúmenes semanales/mensuales/anuales cuentan fines de semana como "días esperados"
   - Porcentajes de cumplimiento incorrectos

---

## Páginas Afectadas

### 1. `/dashboard/time-tracking` (Lista de empleados)

**Archivo:** `/src/app/(main)/dashboard/time-tracking/page.tsx`
**Problema:** Estadísticas generales pueden ser incorrectas
**Acción:** Verificar y ajustar si es necesario

### 2. `/dashboard/time-tracking/live` (Monitor en vivo)

**Archivo:** `/src/app/(main)/dashboard/time-tracking/live/page.tsx`
**Problemas críticos:**

- Contador "Sin fichar" incluye no laborables
- NO detecta ausencias con margen horario
- NO diferencia "aún no entra" vs "ausente"

**Cambios requeridos:**

- Añadir validación `shouldBeWorking` por empleado
- Calcular si pasó hora de entrada + margen
- Nuevos contadores: `absentCount`, `onHolidayCount`
- Nuevo tab "Ausentes"
- Nueva card de estadísticas

### 3. `/dashboard/time-tracking/[employeeId]` (Detalle de empleado)

**Archivo:** `/src/app/(main)/dashboard/time-tracking/[employeeId]/page.tsx`
**Problemas críticos:**

- Días festivos marcados como "ABSENT"
- Fines de semana marcados como "ABSENT"
- Horas esperadas calculadas de forma simplificada

**Cambios requeridos:**

- Usar `getExpectedHoursForDay()` para cada día
- Nuevos status: `HOLIDAY`, `NON_WORKDAY`
- Incluir `isHoliday`, `holidayName` en respuesta

---

## Solución Propuesta

### Arquitectura de la Solución

```
┌─────────────────────────────────────────────────────────────┐
│                   FUNCIÓN REUTILIZABLE                       │
│                                                               │
│  getExpectedHoursForDay(employeeId, date)                   │
│  ─────────────────────────────────────────                  │
│  Retorna:                                                    │
│  - hoursExpected: number                                    │
│  - isWorkingDay: boolean                                    │
│  - isHoliday: boolean                                       │
│  - holidayName?: string                                     │
│  - hasActiveContract: boolean                               │
│                                                               │
│  Lógica interna:                                             │
│  1. Verificar contrato activo                               │
│  2. Verificar festivos (query CalendarEvent)                │
│  3. Validar tipo de contrato (FLEXIBLE/FIXED/SHIFTS)        │
│  4. Aplicar patrón semanal personalizado                    │
│  5. Detectar jornada intensiva                              │
│  6. Calcular horas esperadas                                │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Usada por
                            ▼
      ┌─────────────────────────────────────────┐
      │                                         │
      │  PÁGINA LIVE                           │  PÁGINA DETAIL
      │  ────────────                          │  ─────────────
      │                                         │
      │  + getEmployeeEntryTime()              │  Para cada día:
      │    → Horario entrada según contrato    │  - Llamar getExpectedHoursForDay()
      │                                         │  - Determinar status correcto
      │  + Calcular si pasó hora + margen      │  - Nuevos status: HOLIDAY, NON_WORKDAY
      │    → isLate, isAbsent                  │
      │                                         │  DayCard component:
      │  Nuevos estados:                       │  - Badge festivo (púrpura)
      │  🟢 Trabajando (CLOCKED_IN)           │  - Badge no laborable (gris)
      │  🟡 En pausa (ON_BREAK)               │  - Mostrar nombre festivo
      │  ⚪ Aún no entra                      │
      │  🔴 Ausente (alert!)                  │  Resúmenes:
      │  🔵 No laborable                      │  - calculateWorkableDays() actualizado
      │                                         │  - Estadísticas correctas
      └─────────────────────────────────────────┘
```

---

## Implementación Detallada

### Paso 1: Crear función `getExpectedHoursForDay()`

**Ubicación:** `/src/server/actions/admin-time-tracking.ts`

**Firma:**

```typescript
export async function getExpectedHoursForDay(
  employeeId: string,
  date: Date,
): Promise<{
  hoursExpected: number;
  isWorkingDay: boolean;
  isHoliday: boolean;
  holidayName?: string;
  hasActiveContract: boolean;
}> {
  // Reutilizar lógica completa de getExpectedHoursForToday()
  // pero aceptando cualquier fecha, no solo hoy
}
```

**Implementación:**

```typescript
export async function getExpectedHoursForDay(employeeId: string, targetDate: Date) {
  try {
    // 1. Obtener empleado y contrato activo
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        employmentContracts: {
          where: { active: true },
          take: 1,
        },
      },
    });

    if (!employee) {
      return { hoursExpected: 0, isWorkingDay: false, isHoliday: false, hasActiveContract: false };
    }

    const contract = employee.employmentContracts[0];
    const hasActiveContract = Boolean(contract);

    if (!contract) {
      return { hoursExpected: 0, isWorkingDay: false, isHoliday: false, hasActiveContract: false };
    }

    // 2. Verificar si es festivo
    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);
    const currentYear = targetDate.getFullYear();

    const holiday = await prisma.calendarEvent.findFirst({
      where: {
        calendar: {
          orgId: employee.orgId,
          active: true,
          year: currentYear,
        },
        date: {
          gte: dayStart,
          lte: dayEnd,
        },
        eventType: "HOLIDAY",
      },
    });

    if (holiday) {
      return {
        hoursExpected: 0,
        isWorkingDay: false,
        isHoliday: true,
        holidayName: holiday.name,
        hasActiveContract,
      };
    }

    // 3. Aplicar lógica según tipo de contrato
    // (Reutilizar lógica de getExpectedHoursForToday())
    const dayOfWeek = targetDate.getDay();

    // ... resto de la lógica (FLEXIBLE, FIXED, SHIFTS)
    // ... verificar jornada intensiva
    // ... calcular horas según patrón semanal

    return {
      hoursExpected: calculatedHours,
      isWorkingDay: calculatedHours > 0,
      isHoliday: false,
      hasActiveContract,
    };
  } catch (error) {
    console.error("Error al calcular horas esperadas:", error);
    throw error;
  }
}
```

---

### Paso 2: Crear función `getEmployeeEntryTime()`

**Ubicación:** `/src/server/actions/admin-time-tracking.ts`

**Firma:**

```typescript
export async function getEmployeeEntryTime(employeeId: string, date: Date): Promise<string | null> {
  // Retorna hora de entrada en formato "HH:mm" (ej: "09:00")
  // o null si no aplica
}
```

**Lógica:**

```typescript
export async function getEmployeeEntryTime(employeeId: string, targetDate: Date): Promise<string | null> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      employmentContracts: {
        where: { active: true },
        take: 1,
      },
    },
  });

  if (!employee) return null;

  const contract = employee.employmentContracts[0];
  if (!contract) return null;

  const dayOfWeek = targetDate.getDay();
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const dayName = dayNames[dayOfWeek];

  // Si es contrato FIXED con franjas horarias
  if (contract.scheduleType === "FIXED" && contract.hasFixedTimeSlots) {
    // Verificar si usa jornada intensiva
    const isIntensivePeriod = isInIntensivePeriod(targetDate, contract);

    // Obtener campo de hora de inicio según día
    const startTimeField = isIntensivePeriod
      ? `intensive${dayName.charAt(0).toUpperCase() + dayName.slice(1)}StartTime`
      : `${dayName}StartTime`;

    const startTime = contract[startTimeField];
    return startTime ?? null;
  }

  // Si es contrato SHIFTS
  if (contract.scheduleType === "SHIFTS") {
    // TODO: Consultar turno asignado para la fecha
    // Por ahora, retornar null o hora genérica
    return "09:00"; // Placeholder
  }

  // Para FLEXIBLE o FIXED sin franjas, usar hora genérica
  // Podría obtenerse de configuración de organización
  return "09:00"; // Hora por defecto
}
```

---

### Paso 3: Actualizar `getCurrentlyWorkingEmployees()`

**Ubicación:** `/src/server/actions/admin-time-tracking.ts`

**Cambios:**

```typescript
export async function getCurrentlyWorkingEmployees() {
  try {
    const { orgId } = await checkAdminPermissions();
    const today = new Date();
    const dayStart = startOfDay(today);
    const dayEnd = endOfDay(today);

    const employees = await prisma.employee.findMany({
      where: {
        orgId,
        user: { active: true },
      },
      include: {
        user: { select: { name: true, email: true } },
        employmentContracts: {
          where: { active: true },
          include: {
            department: { select: { id: true, name: true } },
            costCenter: { select: { id: true, name: true } },
          },
          take: 1,
        },
        timeEntries: {
          where: {
            timestamp: { gte: dayStart, lte: dayEnd },
          },
          orderBy: { timestamp: "desc" },
          take: 1,
        },
        workdaySummaries: {
          where: { date: dayStart },
          take: 1,
        },
      },
      orderBy: { user: { name: "asc" } },
    });

    // NUEVO: Calcular info adicional para cada empleado
    const employeesWithStatus = await Promise.all(
      employees.map(async (employee) => {
        const lastEntry = employee.timeEntries[0];
        const todaySummary = employee.workdaySummaries[0];
        const contract = employee.employmentContracts[0];

        // Determinar estado de fichaje
        let status: "CLOCKED_OUT" | "CLOCKED_IN" | "ON_BREAK" = "CLOCKED_OUT";
        if (lastEntry) {
          switch (lastEntry.entryType) {
            case "CLOCK_IN":
            case "BREAK_END":
              status = "CLOCKED_IN";
              break;
            case "BREAK_START":
              status = "ON_BREAK";
              break;
            case "CLOCK_OUT":
            default:
              status = "CLOCKED_OUT";
              break;
          }
        }

        // NUEVO: Validar si debería estar trabajando
        const { isWorkingDay, isHoliday, holidayName } = await getExpectedHoursForDay(employee.id, today);

        // NUEVO: Calcular si está ausente (pasó su hora de entrada + margen)
        let isAbsent = false;
        let shouldBeWorking = false;

        if (isWorkingDay && !isHoliday) {
          const entryTime = await getEmployeeEntryTime(employee.id, today);

          if (entryTime) {
            const [hours, minutes] = entryTime.split(":").map(Number);
            const expectedEntry = new Date(today);
            expectedEntry.setHours(hours, minutes, 0, 0);

            const graceMinutes = 15; // Margen de tolerancia
            const lateThreshold = new Date(expectedEntry.getTime() + graceMinutes * 60000);

            shouldBeWorking = today > expectedEntry;
            isAbsent = today > lateThreshold && status === "CLOCKED_OUT";
          }
        }

        return {
          id: employee.id,
          name: employee.user.name,
          email: employee.user.email,
          department: contract?.department?.name ?? "Sin departamento",
          costCenter: contract?.costCenter?.name ?? "Sin centro de coste",
          status,
          lastAction: lastEntry?.timestamp ?? null,
          todayWorkedMinutes: todaySummary ? Number(todaySummary.totalWorkedMinutes) : 0,
          todayBreakMinutes: todaySummary ? Number(todaySummary.totalBreakMinutes) : 0,
          clockIn: todaySummary?.clockIn,
          clockOut: todaySummary?.clockOut,
          // NUEVOS CAMPOS
          isWorkingDay,
          isHoliday,
          holidayName,
          shouldBeWorking,
          isAbsent,
        };
      }),
    );

    return employeesWithStatus;
  } catch (error) {
    console.error("Error al obtener empleados trabajando:", error);
    throw error;
  }
}
```

---

### Paso 4: Actualizar página `/time-tracking/live`

**Archivo:** `/src/app/(main)/dashboard/time-tracking/live/page.tsx`

**Cambios en interfaz:**

```typescript
interface EmployeeStatus {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
  department: string;
  costCenter: string;
  status: "CLOCKED_OUT" | "CLOCKED_IN" | "ON_BREAK";
  lastAction: Date | null;
  todayWorkedMinutes: number;
  todayBreakMinutes: number;
  clockIn?: Date;
  clockOut?: Date;
  // NUEVOS CAMPOS
  isWorkingDay: boolean;
  isHoliday: boolean;
  holidayName?: string;
  shouldBeWorking: boolean;
  isAbsent: boolean;
}
```

**Nuevos contadores:**

```typescript
const workingCount = employees.filter((e) => e.status === "CLOCKED_IN").length;
const breakCount = employees.filter((e) => e.status === "ON_BREAK").length;

// NUEVO: Solo contar ausentes REALES
const absentCount = employees.filter((e) => e.isAbsent).length;

// NUEVO: Empleados en no laborable (festivo o fin de semana)
const nonWorkingCount = employees.filter((e) => !e.isWorkingDay).length;

// NUEVO: Empleados que aún no han llegado (pero llegarán)
const notYetCount = employees.filter((e) => e.isWorkingDay && !e.shouldBeWorking && e.status === "CLOCKED_OUT").length;
```

**Nueva card de estadísticas:**

```tsx
{
  /* Reemplazar card "Sin fichar" por estas 2: */
}

{
  /* Ausentes (solo los que DEBERÍAN estar trabajando) */
}
<Card className="to-card bg-gradient-to-t from-red-500/5 p-4 shadow-xs">
  <div className="flex items-center gap-3">
    <div className="flex size-10 items-center justify-center rounded-full bg-red-500/10">
      <AlertCircle className="size-5 text-red-600" />
    </div>
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-sm">Ausentes</span>
      <span className="text-2xl font-bold">{absentCount}</span>
    </div>
  </div>
</Card>;

{
  /* No laborable (festivos, fines de semana) */
}
<Card className="to-card bg-gradient-to-t from-blue-500/5 p-4 shadow-xs">
  <div className="flex items-center gap-3">
    <div className="flex size-10 items-center justify-center rounded-full bg-blue-500/10">
      <CalendarX className="size-5 text-blue-600" />
    </div>
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-sm">No laborable</span>
      <span className="text-2xl font-bold">{nonWorkingCount}</span>
    </div>
  </div>
</Card>;
```

**Nuevo tab "Ausentes":**

```tsx
<TabsList className="hidden @4xl/main:flex">
  <TabsTrigger value="all">
    Todos{" "}
    <Badge variant="secondary" className="ml-2">
      {employees.length}
    </Badge>
  </TabsTrigger>
  <TabsTrigger value="working">
    Trabajando{" "}
    <Badge variant="secondary" className="ml-2">
      {workingCount}
    </Badge>
  </TabsTrigger>
  <TabsTrigger value="break">
    En pausa{" "}
    <Badge variant="secondary" className="ml-2">
      {breakCount}
    </Badge>
  </TabsTrigger>
  {/* NUEVO TAB */}
  <TabsTrigger value="absent">
    Ausentes{" "}
    <Badge variant="destructive" className="ml-2">
      {absentCount}
    </Badge>
  </TabsTrigger>
</TabsList>
```

**Actualizar filtro:**

```typescript
type FilterValue = "all" | "working" | "break" | "absent"; // Añadir "absent"

const applyFilter = (data: EmployeeStatus[], filterValue: FilterValue) => {
  let filtered = data;

  switch (filterValue) {
    case "working":
      filtered = data.filter((e) => e.status === "CLOCKED_IN");
      break;
    case "break":
      filtered = data.filter((e) => e.status === "ON_BREAK");
      break;
    case "absent": // NUEVO
      filtered = data.filter((e) => e.isAbsent);
      break;
    case "all":
    default:
      filtered = data;
      break;
  }

  setFilteredEmployees(filtered);
};
```

---

### Paso 5: Actualizar `getEmployeeDailyDetail()`

**Ubicación:** `/src/server/actions/admin-time-tracking.ts`

**Cambios principales:**

```typescript
export async function getEmployeeDailyDetail(employeeId: string, dateFrom?: Date, dateTo?: Date) {
  try {
    const { orgId } = await checkAdminPermissions();

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        user: { select: { name: true, email: true, image: true } },
        employmentContracts: {
          where: { active: true },
          take: 1,
        },
      },
    });

    if (!employee) {
      throw new Error("Empleado no encontrado");
    }

    // Generar rango de fechas
    const startDate = dateFrom ?? startOfDay(new Date());
    const endDate = dateTo ?? endOfDay(new Date());
    const allDaysInRange = eachDayOfInterval({ start: startDate, end: endDate });

    // Obtener summaries y time entries (igual que antes)
    // ...

    // NUEVO: Para cada día, validar si es laborable
    const days = await Promise.all(
      allDaysInRange.reverse().map(async (dayDate) => {
        const dayKey = startOfDay(dayDate).toISOString();
        const summary = summariesByDate.get(dayKey);
        const dayEntries = entriesByDay.get(dayKey) ?? [];

        // NUEVO: Obtener info del día
        const { hoursExpected, isWorkingDay, isHoliday, holidayName } = await getExpectedHoursForDay(
          employeeId,
          dayDate,
        );

        // Determinar status correcto
        let status: "COMPLETED" | "IN_PROGRESS" | "INCOMPLETE" | "ABSENT" | "HOLIDAY" | "NON_WORKDAY";

        if (isHoliday) {
          status = "HOLIDAY";
        } else if (!isWorkingDay) {
          status = "NON_WORKDAY";
        } else if (summary) {
          const workedHours = Number(summary.totalWorkedMinutes) / 60;
          const compliance = hoursExpected > 0 ? (workedHours / hoursExpected) * 100 : 0;
          status = compliance >= 95 ? "COMPLETED" : "INCOMPLETE";
        } else {
          // Solo marcar ABSENT si era día laborable
          status = "ABSENT";
        }

        const workedHours = summary ? Number(summary.totalWorkedMinutes) / 60 : 0;
        const compliance = hoursExpected > 0 ? Math.round((workedHours / hoursExpected) * 100) : 0;

        return {
          id: summary?.id ?? `virtual-${dayKey}`,
          date: dayDate,
          clockIn: summary?.clockIn ?? null,
          clockOut: summary?.clockOut ?? null,
          totalWorkedMinutes: summary ? Number(summary.totalWorkedMinutes) : 0,
          totalBreakMinutes: summary ? Number(summary.totalBreakMinutes) : 0,
          status,
          expectedHours: hoursExpected,
          actualHours: Math.round(workedHours * 100) / 100,
          compliance,
          // NUEVOS CAMPOS
          isHoliday,
          holidayName,
          isWorkingDay,
          timeEntries: dayEntries.map((entry) => ({
            id: entry.id,
            entryType: entry.entryType,
            timestamp: entry.timestamp,
            location: entry.location,
            notes: entry.notes,
            isManual: entry.isManual,
            isCancelled: entry.isCancelled,
            cancellationReason: entry.cancellationReason,
            cancellationNotes: entry.cancellationNotes,
            latitude: entry.latitude ? Number(entry.latitude) : null,
            longitude: entry.longitude ? Number(entry.longitude) : null,
            accuracy: entry.accuracy ? Number(entry.accuracy) : null,
            isWithinAllowedArea: entry.isWithinAllowedArea,
            requiresReview: entry.requiresReview,
          })),
        };
      }),
    );

    return {
      employee: {
        id: employee.id,
        name: employee.user.name ?? "Sin nombre",
        email: employee.user.email,
        image: employee.user.image ?? null,
      },
      days,
    };
  } catch (error) {
    console.error("Error al obtener detalle diario:", error);
    throw error;
  }
}
```

---

### Paso 6: Actualizar `DayCard` component

**Archivo:** `/src/app/(main)/dashboard/time-tracking/_components/day-card.tsx`

**Añadir nuevos status:**

```typescript
const statusConfig = {
  COMPLETED: {
    label: "Completado",
    icon: CheckCircle,
    color: "text-green-600 dark:text-green-400",
    badgeClass: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  },
  IN_PROGRESS: {
    label: "En progreso",
    icon: Clock,
    color: "text-blue-600 dark:text-blue-400",
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
  INCOMPLETE: {
    label: "Incompleto",
    icon: AlertCircle,
    color: "text-amber-600 dark:text-amber-400",
    badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  ABSENT: {
    label: "Ausente",
    icon: XCircle,
    color: "text-red-600 dark:text-red-400",
    badgeClass: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  },
  // NUEVOS
  HOLIDAY: {
    label: "Festivo",
    icon: CalendarDays, // Importar de lucide-react
    color: "text-purple-600 dark:text-purple-400",
    badgeClass: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  },
  NON_WORKDAY: {
    label: "No laborable",
    icon: CalendarX, // Importar de lucide-react
    color: "text-gray-600 dark:text-gray-400",
    badgeClass: "bg-gray-100 text-gray-700 dark:bg-gray-950 dark:text-gray-300",
  },
};
```

**Actualizar interfaz:**

```typescript
interface DayData {
  date: Date;
  clockIn?: Date | null;
  clockOut?: Date | null;
  totalWorkedMinutes: number;
  totalBreakMinutes: number;
  status: "IN_PROGRESS" | "COMPLETED" | "INCOMPLETE" | "ABSENT" | "HOLIDAY" | "NON_WORKDAY"; // Añadir nuevos
  expectedHours: number;
  actualHours: number;
  compliance: number;
  timeEntries: TimeEntry[];
  // NUEVOS CAMPOS
  isHoliday?: boolean;
  holidayName?: string;
  isWorkingDay?: boolean;
}
```

**Mostrar nombre del festivo:**

```tsx
<div className="flex flex-wrap items-center justify-between gap-2">
  <div className="flex items-center gap-1.5">
    <span className="text-sm font-semibold capitalize">
      {format(new Date(day.date), "EEEE, d MMM yyyy", { locale: es })}
    </span>
    <Badge className={statusInfo.badgeClass}>
      <StatusIcon className="mr-1 size-3" />
      {statusInfo.label}
    </Badge>
    {/* NUEVO: Mostrar nombre del festivo */}
    {day.isHoliday && day.holidayName && (
      <Badge
        variant="outline"
        className="border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900 dark:bg-purple-950/30 dark:text-purple-400"
      >
        🎉 {day.holidayName}
      </Badge>
    )}
  </div>
  <span className={cn("text-lg font-bold", complianceColor)}>{day.compliance}%</span>
</div>
```

---

### Paso 7: Refactorizar `calculateWorkableDays()`

**Ubicación:** `/src/server/actions/admin-time-tracking.ts`

**Antes (obsoleto):**

```typescript
function calculateWorkableDays(periodStart: Date, periodEnd: Date, contractStartDate: Date | null): number {
  const effectiveStart = contractStartDate && contractStartDate > periodStart ? contractStartDate : periodStart;
  if (effectiveStart > periodEnd) return 0;

  const days = eachDayOfInterval({ start: effectiveStart, end: periodEnd });
  const workableDays = days.filter((day) => !isWeekend(day)).length; // ❌ Solo excluye fines de semana

  return workableDays;
}
```

**Después (correcto):**

```typescript
async function calculateWorkableDays(employeeId: string, periodStart: Date, periodEnd: Date): Promise<number> {
  const days = eachDayOfInterval({ start: periodStart, end: periodEnd });

  let workableDays = 0;
  for (const day of days) {
    const { isWorkingDay } = await getExpectedHoursForDay(employeeId, day);
    if (isWorkingDay) {
      workableDays++;
    }
  }

  return workableDays;
}
```

**Actualizar en resúmenes semanal/mensual/anual:**

- `getEmployeeWeeklySummary()` línea 270
- `getEmployeeMonthlySummary()` línea 391
- `getEmployeeYearlySummary()` línea 508

---

## Casos de Uso y Ejemplos

### Caso 1: Empleado en festivo

**Contexto:**

- Empleado: Juan Pérez
- Fecha: 2025-12-25 (Navidad)
- Contrato: FLEXIBLE, 40h/semana, Lunes-Viernes
- Calendario: 25/12/2025 marcado como "Navidad" (HOLIDAY)

**Resultado esperado:**

**Página LIVE:**

- Estado: No laborable 🔵
- NO aparece en contador "Ausentes"
- Aparece en contador "No laborable"

**Página DETAIL:**

- Status: `HOLIDAY`
- Badge: 🎉 Navidad (color púrpura)
- Horas esperadas: 0h
- Cumplimiento: 0% (pero sin alerta)

---

### Caso 2: Empleado ausente (pasó hora de entrada)

**Contexto:**

- Empleado: María García
- Fecha: 2025-11-18 (Lunes)
- Hora actual: 09:30
- Contrato: FIXED, horario Lunes 09:00-18:00
- Margen tolerancia: 15 minutos
- Estado fichaje: CLOCKED_OUT (no ha fichado)

**Resultado esperado:**

**Página LIVE:**

- Estado: Ausente 🔴 (alerta)
- Aparece en contador "Ausentes": 1
- Aparece en tab "Ausentes"
- `shouldBeWorking: true` (hora actual > 09:00)
- `isAbsent: true` (hora actual > 09:15)

**Página DETAIL:**

- Status: `ABSENT`
- Badge: Ausente (color rojo)
- Horas esperadas: 8h
- Cumplimiento: 0%
- Alerta visible

---

### Caso 3: Empleado aún no llegó (antes de hora)

**Contexto:**

- Empleado: Carlos López
- Fecha: 2025-11-18 (Lunes)
- Hora actual: 08:45
- Contrato: FIXED, horario Lunes 09:00-18:00
- Estado fichaje: CLOCKED_OUT

**Resultado esperado:**

**Página LIVE:**

- Estado: Sin fichar ⚪ (pero sin alerta)
- NO aparece en contador "Ausentes"
- `shouldBeWorking: false` (aún no llega su hora)
- `isAbsent: false`

---

### Caso 4: Fin de semana (día no laborable según contrato)

**Contexto:**

- Empleado: Ana Rodríguez
- Fecha: 2025-11-16 (Sábado)
- Contrato: FLEXIBLE, 40h/semana, 5 días (Lunes-Viernes)

**Resultado esperado:**

**Página LIVE:**

- Estado: No laborable 🔵
- NO aparece en contador "Ausentes"
- Aparece en contador "No laborable"

**Página DETAIL:**

- Status: `NON_WORKDAY`
- Badge: No laborable (color gris)
- Horas esperadas: 0h
- Cumplimiento: 0%

---

### Caso 5: Patrón semanal personalizado (Miércoles no trabaja)

**Contexto:**

- Empleado: Pedro Sánchez
- Fecha: 2025-11-19 (Miércoles)
- Contrato: FLEXIBLE con patrón personalizado
  - `hasCustomWeeklyPattern: true`
  - `wednesdayHours: 0` (no trabaja miércoles)
  - Resto de días: 10h cada uno (Lunes, Martes, Jueves, Viernes)

**Resultado esperado:**

**Página LIVE:**

- Estado: No laborable 🔵
- NO aparece en contador "Ausentes"

**Página DETAIL:**

- Status: `NON_WORKDAY`
- Badge: No laborable (color gris)
- Horas esperadas: 0h

---

## Testing

### Tests manuales recomendados

#### 1. Página LIVE (`/dashboard/time-tracking/live`)

- [ ] Verificar contador "Ausentes" solo muestra empleados que pasaron hora entrada + margen
- [ ] Verificar contador "No laborable" muestra festivos y fines de semana
- [ ] Verificar tab "Ausentes" funciona correctamente
- [ ] Verificar empleado en festivo NO aparece como ausente
- [ ] Verificar empleado antes de su hora NO aparece como ausente

#### 2. Página DETAIL (`/dashboard/time-tracking/[employeeId]`)

- [ ] Verificar días festivos tienen badge púrpura y muestran nombre
- [ ] Verificar fines de semana tienen badge gris "No laborable"
- [ ] Verificar solo días laborables sin fichar marcan "ABSENT"
- [ ] Verificar porcentajes de cumplimiento correctos (sin contar festivos)
- [ ] Verificar resúmenes semanales/mensuales excluyen festivos de días esperados

#### 3. Tipos de contrato

- [ ] FLEXIBLE con patrón personalizado (días específicos no laborables)
- [ ] FIXED con franjas horarias (horarios diferentes por día)
- [ ] FIXED sin franjas horarias (horario genérico)
- [ ] Jornada intensiva (horas reducidas en período estacional)

#### 4. Festivos

- [ ] Festivo en día laborable (Lunes festivo)
- [ ] Festivo en fin de semana (Sábado festivo)
- [ ] Múltiples festivos en una semana

---

## Archivos Modificados

### Backend (`/src/server/actions/admin-time-tracking.ts`)

- ✅ Crear `getExpectedHoursForDay(employeeId, date)`
- ✅ Crear `getEmployeeEntryTime(employeeId, date)`
- ✅ Actualizar `getCurrentlyWorkingEmployees()` con nuevos campos
- ✅ Actualizar `getEmployeeDailyDetail()` con validación días
- ✅ Refactorizar `calculateWorkableDays()` async
- ✅ Actualizar resúmenes semanal/mensual/anual

### Frontend - Página LIVE (`/src/app/(main)/dashboard/time-tracking/live/page.tsx`)

- ✅ Actualizar interface `EmployeeStatus` con nuevos campos
- ✅ Añadir nuevos contadores (`absentCount`, `nonWorkingCount`)
- ✅ Reemplazar card "Sin fichar" por "Ausentes" + "No laborable"
- ✅ Añadir tab "Ausentes"
- ✅ Actualizar filtro con opción "absent"

### Frontend - Página DETAIL (`/src/app/(main)/dashboard/time-tracking/[employeeId]/page.tsx`)

- ✅ Actualizar interface `DayDetailData` con nuevos status y campos

### Frontend - Component (`/src/app/(main)/dashboard/time-tracking/_components/day-card.tsx`)

- ✅ Añadir `HOLIDAY` y `NON_WORKDAY` a `statusConfig`
- ✅ Actualizar interface `DayData` con nuevos campos
- ✅ Mostrar badge con nombre del festivo
- ✅ Actualizar colores y estilos

---

## Notas Finales

- **Rendimiento:** La función `getExpectedHoursForDay()` hace queries a BD por cada día. Para rangos grandes (ej: año completo), considerar optimización con batching o cache.
- **Margen de tolerancia:** Actualmente hardcodeado a 15 minutos. Podría ser configurable por organización o por empleado.
- **Turnos (SHIFTS):** La implementación de horario de entrada para turnos está pendiente (placeholder con "09:00").
- **Festivos recurrentes:** El sistema actual soporta festivos por año. Festivos recurrentes (ej: "todos los 25 de diciembre") requieren lógica adicional en CalendarEvent.

---

**Documento creado:** 2025-11-15
**Última actualización:** 2025-11-15
**Versión:** 1.0

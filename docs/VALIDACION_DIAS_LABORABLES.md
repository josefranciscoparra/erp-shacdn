# Sistema de Validación de Días Laborables en Fichajes

**Fecha de creación:** 2025-11-15
**Versión:** 1.0
**Rama:** HorariosNuevos

## Índice

1. [Resumen General](#resumen-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Nueva Función: `getExpectedHoursForToday()`](#nueva-función-getexpectedhoursfortoday)
4. [Integración con Store (Zustand)](#integración-con-store-zustand)
5. [Cambios en la UI](#cambios-en-la-ui)
6. [Tipos de Horario Soportados](#tipos-de-horario-soportados)
7. [Casos de Uso](#casos-de-uso)
8. [Funciones Relacionadas](#funciones-relacionadas)
9. [Migración y Compatibilidad](#migración-y-compatibilidad)
10. [Testing y Validación](#testing-y-validación)

---

## Resumen General

### Problema Original

Antes de esta implementación, la página de fichajes (`/dashboard/me/clock`) SIEMPRE mostraba el tiempo restante basándose en un **cálculo promedio**:

```typescript
// ❌ ANTES: Cálculo promedio (NO específico del día)
const dailyHours = weeklyHours / workingDaysPerWeek; // Ej: 40h / 5 = 8h
```

**Problemas:**

- Si hoy es **sábado** y el empleado NO trabaja sábados → Mostraba "Tiempo restante: 8h"
- Si el empleado tiene **horario personalizado** (ej: lunes 6h, viernes 10h) → Mostraba siempre 8h
- Si estamos en **jornada intensiva** (verano) → NO detectaba las horas reducidas
- NO había avisos sobre horas extras en días no laborables

### Solución Implementada

Nueva función `getExpectedHoursForToday()` que:

- ✅ Detecta el **día de la semana actual** (0=domingo, 1=lunes, ..., 6=sábado)
- ✅ Verifica si estamos en **periodo de jornada intensiva** (ej: 15 junio - 15 septiembre)
- ✅ Calcula las **horas esperadas HOY** según el tipo de horario del contrato
- ✅ Retorna si **hoy es día laborable** o no
- ✅ Muestra **avisos claros** cuando el empleado ficha en día no laborable

---

## Arquitectura del Sistema

### Flujo de Datos

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USUARIO ABRE /dashboard/me/clock                         │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. ZUSTAND STORE: loadInitialData()                         │
│    - Llama a getExpectedHoursForTodayAction()               │
│    - Llama a getCurrentStatusAction()                       │
│    - Llama a getTodaySummaryAction()                        │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. SERVER ACTION: getExpectedHoursForToday()                │
│    ┌─────────────────────────────────────────────────────┐ │
│    │ a) Obtiene contrato activo del empleado            │ │
│    │ b) Detecta día de la semana (0-6)                  │ │
│    │ c) Verifica periodo intensivo (MM-DD)              │ │
│    │ d) Según scheduleType:                             │ │
│    │    - FLEXIBLE + patrón → mondayHours, etc.         │ │
│    │    - FIXED → workMonday + franjas horarias         │ │
│    │    - FLEXIBLE sin patrón → promedio (legacy)       │ │
│    │ e) Retorna: { hoursToday, isWorkingDay }           │ │
│    └─────────────────────────────────────────────────────┘ │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. STORE ACTUALIZADO                                        │
│    - expectedDailyHours = hoursToday (NO promedio)          │
│    - isWorkingDay = true/false                              │
│    - hasActiveContract = true/false                         │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. UI RENDERIZA                                             │
│    ┌─────────────────────────────────────────────────────┐ │
│    │ if (!isWorkingDay) {                                │ │
│    │   → Muestra Alert "Hoy no tienes que trabajar"     │ │
│    │   → Tooltip en botón "Fichar Entrada"              │ │
│    │ } else {                                            │ │
│    │   → Muestra contador "Tiempo restante: X:XX:XX"    │ │
│    │ }                                                   │ │
│    └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Nueva Función: `getExpectedHoursForToday()`

### Ubicación

**Archivo:** `/src/server/actions/time-tracking.ts` (líneas 517-723)

### Firma

```typescript
export async function getExpectedHoursForToday(): Promise<{
  hoursToday: number; // Horas esperadas HOY (0 si no trabaja)
  isWorkingDay: boolean; // true si hoy es día laborable
  hasActiveContract: boolean;
}>;
```

### Lógica Detallada

#### 1. Obtener Contrato Activo

```typescript
const contract = await prisma.employmentContract.findFirst({
  where: {
    employeeId: employee.id,
    active: true,
    weeklyHours: { gt: 0 },
  },
  orderBy: { startDate: "desc" },
});
```

#### 2. Detectar Día de la Semana

```typescript
const today = new Date();
const dayOfWeek = today.getDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado
```

#### 3. Verificar Periodo de Jornada Intensiva

```typescript
let isIntensivePeriod = false;

if (contract.hasIntensiveSchedule && contract.intensiveStartDate && contract.intensiveEndDate) {
  const currentMonthDay = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const startMonthDay = contract.intensiveStartDate; // "06-15"
  const endMonthDay = contract.intensiveEndDate; // "09-15"

  // Comparar fechas MM-DD
  if (startMonthDay <= endMonthDay) {
    // Periodo dentro del mismo año (ej: 06-15 a 09-15)
    isIntensivePeriod = currentMonthDay >= startMonthDay && currentMonthDay <= endMonthDay;
  } else {
    // Periodo que cruza año (ej: 12-15 a 02-15)
    isIntensivePeriod = currentMonthDay >= startMonthDay || currentMonthDay <= endMonthDay;
  }
}
```

#### 4. Calcular Horas Según Tipo de Horario

##### a) FLEXIBLE con Patrón Personalizado

```typescript
if (contract.scheduleType === "FLEXIBLE" && contract.hasCustomWeeklyPattern) {
  const regularHoursByDay = [
    contract.sundayHours, // 0
    contract.mondayHours, // 1
    contract.tuesdayHours, // 2
    contract.wednesdayHours, // 3
    contract.thursdayHours, // 4
    contract.fridayHours, // 5
    contract.saturdayHours, // 6
  ];

  const intensiveHoursByDay = [
    contract.intensiveSundayHours,
    contract.intensiveMondayHours,
    // ... resto de días
  ];

  const todayHours = isIntensivePeriod ? intensiveHoursByDay[dayOfWeek] : regularHoursByDay[dayOfWeek];

  if (todayHours !== null && todayHours !== undefined) {
    hoursToday = Number(todayHours);
    isWorkingDay = hoursToday > 0;
  } else {
    // No hay horas definidas → NO es día laborable
    hoursToday = 0;
    isWorkingDay = false;
  }
}
```

**Ejemplo:**

```typescript
// Contrato:
hasCustomWeeklyPattern = true
mondayHours = 8
tuesdayHours = 8
wednesdayHours = 8
thursdayHours = 8
fridayHours = 8
saturdayHours = null  // No trabaja
sundayHours = null    // No trabaja

// Hoy es sábado (dayOfWeek = 6)
todayHours = saturdayHours = null
→ hoursToday = 0
→ isWorkingDay = false
→ UI muestra: "Hoy no tienes que trabajar"
```

##### b) FIXED (Horario Fijo)

```typescript
if (contract.scheduleType === "FIXED") {
  const workDaysByDay = [
    contract.workSunday,    // 0
    contract.workMonday,    // 1
    contract.workTuesday,   // 2
    // ... resto
  ];

  const worksToday = workDaysByDay[dayOfWeek] ?? false;
  isWorkingDay = worksToday;

  if (worksToday) {
    if (contract.hasFixedTimeSlots) {
      // Calcular horas desde franjas horarias (09:00-17:00, etc.)
      const startTimeField = /* obtener según día */;
      const endTimeField = /* obtener según día */;

      // Parsear "HH:MM"
      const [startHour, startMin] = startTimeField.split(":").map(Number);
      const [endHour, endMin] = endTimeField.split(":").map(Number);

      const totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);

      // Restar pausa si existe
      let breakMinutes = 0;
      if (breakStartField && breakEndField) {
        // Calcular duración pausa
      }

      hoursToday = (totalMinutes - breakMinutes) / 60;
    } else {
      // Sin franjas, usar promedio
      hoursToday = weeklyHours / workingDaysPerWeek;
    }
  } else {
    // No trabaja hoy
    hoursToday = 0;
  }
}
```

**Ejemplo:**

```typescript
// Contrato:
scheduleType = "FIXED"
workMonday = true
workTuesday = true
workWednesday = true
workThursday = true
workFriday = true
workSaturday = false
workSunday = false

hasFixedTimeSlots = true
mondayStartTime = "09:00"
mondayEndTime = "17:00"
mondayBreakStartTime = "14:00"
mondayBreakEndTime = "15:00"

// Hoy es lunes (dayOfWeek = 1)
worksToday = workMonday = true
totalMinutes = (17*60 + 0) - (9*60 + 0) = 480 min (8h)
breakMinutes = (15*60 + 0) - (14*60 + 0) = 60 min (1h)
hoursToday = (480 - 60) / 60 = 7h

→ isWorkingDay = true
→ UI muestra: "Tiempo restante: 7:00:00"
```

##### c) FLEXIBLE sin Patrón (Legacy)

```typescript
if (contract.scheduleType === "FLEXIBLE" && !contract.hasCustomWeeklyPattern) {
  // Comportamiento anterior (promedio)
  const weeklyHours =
    isIntensivePeriod && contract.intensiveWeeklyHours
      ? Number(contract.intensiveWeeklyHours)
      : Number(contract.weeklyHours);
  const workingDaysPerWeek = Number(contract.workingDaysPerWeek ?? 5);

  hoursToday = weeklyHours / workingDaysPerWeek;
  isWorkingDay = true; // Asumimos que trabaja
}
```

#### 5. Valores por Defecto (Sin Contrato)

```typescript
if (!contract) {
  return {
    hoursToday: 8,
    isWorkingDay: true,
    hasActiveContract: false,
  };
}
```

---

## Integración con Store (Zustand)

### Archivo

`/src/stores/time-tracking-store.tsx`

### Cambios Realizados

#### 1. Nuevo Campo en el Estado

```typescript
interface TimeTrackingState {
  // ... campos existentes
  isWorkingDay: boolean; // ✅ NUEVO: Si hoy es día laborable según contrato
}

const initialState = {
  // ... valores existentes
  isWorkingDay: true, // Por defecto asumimos que hoy es día laborable
};
```

#### 2. Nueva Importación

```typescript
import {
  // ... imports existentes
  getExpectedHoursForToday as getExpectedHoursForTodayAction, // ✅ NUEVO
} from "@/server/actions/time-tracking";
```

#### 3. Actualización de `loadExpectedDailyHours()`

```typescript
// ❌ ANTES:
loadExpectedDailyHours: async () => {
  const hoursInfo = await getExpectedDailyHoursAction(); // Promedio
  set({
    expectedDailyHours: hoursInfo.dailyHours,
    hasActiveContract: hoursInfo.hasActiveContract,
  });
};

// ✅ AHORA:
loadExpectedDailyHours: async () => {
  const hoursInfo = await getExpectedHoursForTodayAction(); // Específico HOY
  set({
    expectedDailyHours: hoursInfo.hoursToday, // Horas de HOY
    hasActiveContract: hoursInfo.hasActiveContract,
    isWorkingDay: hoursInfo.isWorkingDay, // ✅ NUEVO
  });
};
```

#### 4. Actualización de `loadInitialData()`

```typescript
loadInitialData: async () => {
  const [status, summary, hoursInfo] = await Promise.all([
    getCurrentStatusAction(),
    getTodaySummaryAction(),
    getExpectedHoursForTodayAction(), // ✅ CAMBIADO de getExpectedDailyHoursAction
  ]);

  set({
    currentStatus: status?.status ?? "CLOCKED_OUT",
    todaySummary: summary as any,
    liveWorkedMinutes: initialMinutes,
    expectedDailyHours: hoursInfo.hoursToday, // ✅ Horas específicas de HOY
    hasActiveContract: hoursInfo.hasActiveContract,
    isWorkingDay: hoursInfo.isWorkingDay, // ✅ NUEVO
    isLoading: false,
  });
};
```

---

## Cambios en la UI

### Archivo

`/src/app/(main)/dashboard/me/clock/_components/clock-in.tsx`

### 1. Extraer `isWorkingDay` del Store

```typescript
const {
  currentStatus,
  todaySummary,
  expectedDailyHours,
  hasActiveContract,
  isWorkingDay, // ✅ NUEVO
  // ... resto
} = useTimeTrackingStore();
```

### 2. Nuevos Imports

```typescript
import { Info } from "lucide-react"; // ✅ Icono para Alert
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // ✅ Tooltip
```

### 3. Alert para Días No Laborables

**Ubicación:** Sección "Tiempo restante o completado" (líneas 515-550)

```typescript
{/* Tiempo restante o completado */}
<div className="flex w-full flex-col items-center gap-1">
  {isLoading ? (
    // ... skeleton
  ) : !isWorkingDay ? (
    // ✅ NUEVO: Alert cuando NO es día laborable
    <Alert className="animate-in fade-in-0 zoom-in-95 w-full border-blue-500/50 bg-blue-50/50 duration-500 dark:border-blue-700/50 dark:bg-blue-950/30">
      <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <AlertTitle className="text-blue-800 dark:text-blue-300">
        Hoy no tienes que trabajar
      </AlertTitle>
      <AlertDescription className="text-blue-700 dark:text-blue-400">
        Según tu contrato, hoy no es día laborable. Si fichas, el tiempo se computará como horas extras.
      </AlertDescription>
    </Alert>
  ) : isCompleted ? (
    // ... mensaje "¡Jornada completada!"
  ) : (
    // ... contador de tiempo restante
  )}
</div>
```

**Resultado visual:**

```
┌────────────────────────────────────────────────────────┐
│ ℹ️ Hoy no tienes que trabajar                          │
│                                                        │
│ Según tu contrato, hoy no es día laborable.           │
│ Si fichas, el tiempo se computará como horas extras.  │
└────────────────────────────────────────────────────────┘
```

### 4. Tooltip en Botón "Fichar Entrada"

**Ubicación:** Botones de fichaje (líneas 563-589)

```typescript
{currentStatus === "CLOCKED_OUT" ? (
  <motion.div /* ... animación ... */>
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="lg"
            onClick={handleClockIn}
            className="w-full disabled:opacity-70"
            disabled={isLoading || isClocking}
          >
            {/* ... contenido botón ... */}
            Fichar Entrada
          </Button>
        </TooltipTrigger>
        {!isWorkingDay && (  // ✅ SOLO muestra si NO es día laborable
          <TooltipContent className="max-w-xs">
            <p className="text-sm">
              ⚠️ Hoy no trabajas según tu contrato. Este tiempo se computará como horas extras.
            </p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  </motion.div>
) : (
  // ... botones "Fichar Salida" y "Descanso"
)}
```

**Comportamiento:**

- El tooltip **solo aparece** cuando `!isWorkingDay`
- Al pasar el ratón sobre "Fichar Entrada" en día no laborable → Muestra aviso
- El empleado **puede fichar igualmente** (no está bloqueado)

---

## Tipos de Horario Soportados

### 1. FLEXIBLE con Patrón Personalizado

**Características:**

- `scheduleType = "FLEXIBLE"`
- `hasCustomWeeklyPattern = true`
- Define horas específicas por día: `mondayHours`, `tuesdayHours`, etc.

**Ejemplo de contrato:**

```javascript
{
  scheduleType: "FLEXIBLE",
  weeklyHours: 35,
  workingDaysPerWeek: 5,
  hasCustomWeeklyPattern: true,

  // Patrón semanal regular
  mondayHours: 6,
  tuesdayHours: 7,
  wednesdayHours: 8,
  thursdayHours: 7,
  fridayHours: 7,
  saturdayHours: null,  // No trabaja
  sundayHours: null,    // No trabaja

  // Jornada intensiva (verano)
  hasIntensiveSchedule: true,
  intensiveStartDate: "06-15",  // 15 junio
  intensiveEndDate: "09-15",     // 15 septiembre
  intensiveWeeklyHours: 30,
  intensiveMondayHours: 6,
  intensiveTuesdayHours: 6,
  intensiveWednesdayHours: 6,
  intensiveThursdayHours: 6,
  intensiveFridayHours: 6,
  intensiveSaturdayHours: null,
  intensiveSundayHours: null,
}
```

**Validación:**

| Día    | Regular | Intensivo | Hoy (regular)                        | Hoy (intensivo)                      |
| ------ | ------- | --------- | ------------------------------------ | ------------------------------------ |
| Lunes  | 6h      | 6h        | `hoursToday=6`, `isWorkingDay=true`  | `hoursToday=6`, `isWorkingDay=true`  |
| Sábado | null    | null      | `hoursToday=0`, `isWorkingDay=false` | `hoursToday=0`, `isWorkingDay=false` |

### 2. FIXED (Horario Fijo)

**Características:**

- `scheduleType = "FIXED"`
- Define días laborables: `workMonday`, `workTuesday`, etc.
- Opcionalmente franjas horarias: `mondayStartTime`, `mondayEndTime`, etc.
- Opcionalmente pausas: `mondayBreakStartTime`, `mondayBreakEndTime`, etc.

**Ejemplo de contrato:**

```javascript
{
  scheduleType: "FIXED",
  weeklyHours: 35,
  workingDaysPerWeek: 5,

  // Días que trabaja
  workMonday: true,
  workTuesday: true,
  workWednesday: true,
  workThursday: true,
  workFriday: true,
  workSaturday: false,
  workSunday: false,

  // Franjas horarias
  hasFixedTimeSlots: true,
  mondayStartTime: "09:00",
  mondayEndTime: "17:00",
  mondayBreakStartTime: "14:00",
  mondayBreakEndTime: "15:00",

  // ... resto de días con sus franjas
}
```

**Cálculo de horas (lunes):**

```
Inicio: 09:00
Fin: 17:00
Total: 8 horas

Pausa: 14:00 - 15:00 = 1 hora

Horas trabajadas = 8h - 1h = 7h
```

**Validación:**

| Día    | workDay | Franjas                         | Resultado                            |
| ------ | ------- | ------------------------------- | ------------------------------------ |
| Lunes  | true    | 09:00-17:00 (pausa 14:00-15:00) | `hoursToday=7`, `isWorkingDay=true`  |
| Sábado | false   | N/A                             | `hoursToday=0`, `isWorkingDay=false` |

### 3. FLEXIBLE sin Patrón (Legacy)

**Características:**

- `scheduleType = "FLEXIBLE"`
- `hasCustomWeeklyPattern = false` (o null)
- Usa cálculo promedio (comportamiento anterior)

**Ejemplo de contrato:**

```javascript
{
  scheduleType: "FLEXIBLE",
  weeklyHours: 40,
  workingDaysPerWeek: 5,
  hasCustomWeeklyPattern: false,
}
```

**Validación:**

```typescript
hoursToday = 40 / 5 = 8h
isWorkingDay = true  // Siempre asume que trabaja
```

**Nota:** Este tipo NO valida días específicos, asume que todos los días son laborables.

### 4. SHIFTS (Turnos) - Futuro

**Características:**

- `scheduleType = "SHIFTS"`
- Sistema de turnos rotativos (no implementado aún)
- Por ahora usa comportamiento promedio

```javascript
{
  scheduleType: "SHIFTS",
  weeklyHours: 40,
  workingDaysPerWeek: 5,
}
```

**Validación actual:**

```typescript
// Por ahora usa promedio
hoursToday = 40 / 5 = 8h
isWorkingDay = true
```

---

## Casos de Uso

### Caso 1: Empleado con Horario Regular L-V

**Contrato:**

```javascript
{
  scheduleType: "FIXED",
  workMonday: true,
  workTuesday: true,
  workWednesday: true,
  workThursday: true,
  workFriday: true,
  workSaturday: false,
  workSunday: false,
  hasFixedTimeSlots: true,
  mondayStartTime: "09:00",
  mondayEndTime: "17:00",
  // ... resto días similares
}
```

**Validación:**

| Día    | UI Mostrada                                            |
| ------ | ------------------------------------------------------ |
| Lunes  | "Tiempo restante: 8:00:00" (contador normal)           |
| Sábado | Alert: "Hoy no tienes que trabajar" + Tooltip en botón |

### Caso 2: Empleado con Jornada Intensiva (Verano)

**Contrato:**

```javascript
{
  scheduleType: "FLEXIBLE",
  hasCustomWeeklyPattern: true,
  hasIntensiveSchedule: true,
  intensiveStartDate: "06-15",  // 15 junio
  intensiveEndDate: "09-15",     // 15 septiembre

  // Regular: 40h/semana
  mondayHours: 8,
  tuesdayHours: 8,
  wednesdayHours: 8,
  thursdayHours: 8,
  fridayHours: 8,

  // Intensivo (verano): 35h/semana
  intensiveMondayHours: 7,
  intensiveTuesdayHours: 7,
  intensiveWednesdayHours: 7,
  intensiveThursdayHours: 7,
  intensiveFridayHours: 7,
}
```

**Validación:**

| Fecha      | Periodo   | Lunes           |
| ---------- | --------- | --------------- |
| 10 mayo    | Regular   | `hoursToday=8h` |
| 20 julio   | Intensivo | `hoursToday=7h` |
| 20 octubre | Regular   | `hoursToday=8h` |

### Caso 3: Empleado con Horario Personalizado por Día

**Contrato:**

```javascript
{
  scheduleType: "FLEXIBLE",
  hasCustomWeeklyPattern: true,

  mondayHours: 6,    // Lunes: 6h
  tuesdayHours: 8,   // Martes: 8h
  wednesdayHours: 8, // Miércoles: 8h
  thursdayHours: 8,  // Jueves: 8h
  fridayHours: 10,   // Viernes: 10h (jornada larga)
  saturdayHours: null,
  sundayHours: null,
}
```

**Validación:**

| Día     | UI Mostrada                         |
| ------- | ----------------------------------- |
| Lunes   | "Tiempo restante: 6:00:00"          |
| Viernes | "Tiempo restante: 10:00:00"         |
| Sábado  | Alert: "Hoy no tienes que trabajar" |

### Caso 4: Empleado Sin Contrato Activo

**Sin contrato en BD**

**Validación:**

```typescript
hoursToday = 8; // Valor por defecto
isWorkingDay = true;
hasActiveContract = false;
```

**UI Mostrada:**

```
⚠️ Sin contrato activo
Usando valores por defecto: 8h diarias (40h semanales).
Contacta con RRHH para configurar tu contrato laboral.

Tiempo restante: 8:00:00
```

---

## Funciones Relacionadas

### Funciones que USAN `getExpectedHoursForToday()`

#### 1. `loadExpectedDailyHours()` (Store)

**Archivo:** `/src/stores/time-tracking-store.tsx`

```typescript
loadExpectedDailyHours: async () => {
  const hoursInfo = await getExpectedHoursForTodayAction();
  set({
    expectedDailyHours: hoursInfo.hoursToday,
    hasActiveContract: hoursInfo.hasActiveContract,
    isWorkingDay: hoursInfo.isWorkingDay,
  });
};
```

**Cuándo se llama:**

- Cuando el usuario carga la página `/dashboard/me/clock`
- Al refrescar datos del store

#### 2. `loadInitialData()` (Store)

**Archivo:** `/src/stores/time-tracking-store.tsx`

```typescript
loadInitialData: async () => {
  const [status, summary, hoursInfo] = await Promise.all([
    getCurrentStatusAction(),
    getTodaySummaryAction(),
    getExpectedHoursForTodayAction(), // ✅ Usa nueva función
  ]);

  set({
    expectedDailyHours: hoursInfo.hoursToday,
    isWorkingDay: hoursInfo.isWorkingDay,
    // ...
  });
};
```

**Cuándo se llama:**

- Al montar el componente `ClockIn`
- Primera carga de la página de fichajes

### Funciones que PODRÍAN Beneficiarse (Futuro)

#### 1. `calculateWorkedMinutes()`

**Archivo:** `/src/server/actions/time-tracking.ts` (línea 77)

**Uso actual:** Calcula minutos trabajados desde fichajes cerrados

**Mejora potencial:** Podría validar si los fichajes se hicieron en días laborables para alertar discrepancias

#### 2. `updateWorkdaySummary()`

**Archivo:** `/src/server/actions/time-tracking.ts` (línea 155)

**Uso actual:** Actualiza el resumen del día con horas trabajadas

**Mejora potencial:**

```typescript
// Podría marcar días no laborables de forma especial
if (!isWorkingDay && totalWorkedMinutes > 0) {
  // Marcar como horas extras automáticamente
  summary.notes = "Horas extras - día no laborable";
}
```

#### 3. `detectIncompleteEntries()`

**Archivo:** `/src/server/actions/time-tracking.ts` (línea 703)

**Uso actual:** Detecta fichajes de larga duración (> 150% jornada)

**Mejora potencial:**

```typescript
// Obtener horas esperadas del día específico
const { hoursToday, isWorkingDay } = await getExpectedHoursForToday();

if (!isWorkingDay) {
  // NO aplicar validación de 150% en días no laborables
  // Las horas extras no tienen límite
}
```

### Funciones LEGACY (Mantener por Compatibilidad)

#### `getExpectedDailyHours()`

**Archivo:** `/src/server/actions/time-tracking.ts` (línea 486)

**Estado:** Mantener para compatibilidad con otros módulos

**Uso:** Cálculo promedio (NO específico del día)

```typescript
// ⚠️ Esta función aún existe pero NO se usa en fichajes
export async function getExpectedDailyHours() {
  // Retorna promedio: weeklyHours / workingDaysPerWeek
}
```

**Cuándo usar:**

- Cuando necesitas un promedio mensual/semanal
- Reportes agregados
- NO usar para validaciones de día específico

---

## Migración y Compatibilidad

### Retrocompatibilidad

✅ **La implementación es 100% retrocompatible:**

1. **Empleados sin contrato:** Usan valores por defecto (8h, día laborable)
2. **Horarios FLEXIBLE sin patrón:** Usan comportamiento promedio (legacy)
3. **Función antigua `getExpectedDailyHours()`:** Sigue existiendo para otros módulos

### Migración de Datos

**NO se requiere migración de datos.**

Los campos del schema Prisma ya existían desde el commit `b19cc0d`:

```prisma
model EmploymentContract {
  // ✅ Ya existentes
  hasCustomWeeklyPattern Boolean?
  mondayHours Decimal?
  tuesdayHours Decimal?
  // ... resto de días

  scheduleType ScheduleType
  workMonday Boolean?
  workTuesday Boolean?
  // ... resto de días

  hasIntensiveSchedule Boolean?
  intensiveStartDate String?
  intensiveEndDate String?
  // ... resto de campos intensivos
}
```

### Testing en Entorno Existente

**Para probar con contratos existentes:**

1. **Contratos antiguos (sin patrón):**
   - Funcionan con promedio (comportamiento legacy)
   - NO requieren actualización

2. **Contratos nuevos (con patrón):**
   - Crear empleado con wizard → Asignar horario personalizado
   - Sistema detectará automáticamente días laborables

---

## Testing y Validación

### Testing Manual

#### Test 1: Día Laborable

**Pasos:**

1. Abrir `/dashboard/me/clock` en día laborable (ej: lunes L-V)
2. Verificar que muestra "Tiempo restante: X:XX:XX"
3. Verificar que NO muestra Alert ni Tooltip

**Resultado esperado:**

```
✅ Contador de tiempo restante visible
✅ NO muestra "Hoy no tienes que trabajar"
✅ Botón "Fichar Entrada" sin tooltip especial
```

#### Test 2: Día No Laborable

**Pasos:**

1. Modificar contrato para que HOY no sea laborable
   - Si hoy es lunes, poner `workMonday = false` (FIXED)
   - O poner `mondayHours = null` (FLEXIBLE patrón)
2. Refrescar `/dashboard/me/clock`
3. Verificar UI

**Resultado esperado:**

```
✅ Alert azul: "Hoy no tienes que trabajar"
✅ NO muestra contador de tiempo restante
✅ Al hacer hover en "Fichar Entrada" → Tooltip con aviso
✅ Botón sigue siendo clickeable (permite fichar)
```

#### Test 3: Jornada Intensiva

**Pasos:**

1. Configurar contrato con jornada intensiva
   ```javascript
   hasIntensiveSchedule = true;
   intensiveStartDate = "06-15";
   intensiveEndDate = "09-15";
   mondayHours = 8;
   intensiveMondayHours = 7;
   ```
2. Cambiar fecha del sistema a 20 julio (periodo intensivo)
3. Verificar que muestra 7h (no 8h)

**Resultado esperado:**

```
✅ Tiempo restante calculado con 7h (intensivo)
✅ NO usa 8h (regular)
```

### Testing Automático (Sugerido)

**Archivo de test:** `/src/server/actions/__tests__/time-tracking.test.ts`

```typescript
describe("getExpectedHoursForToday", () => {
  it("detecta día laborable en horario FIXED", async () => {
    // Mock: lunes, contrato FIXED con workMonday=true
    const result = await getExpectedHoursForToday();
    expect(result.isWorkingDay).toBe(true);
    expect(result.hoursToday).toBeGreaterThan(0);
  });

  it("detecta día NO laborable en horario FIXED", async () => {
    // Mock: sábado, contrato FIXED con workSaturday=false
    const result = await getExpectedHoursForToday();
    expect(result.isWorkingDay).toBe(false);
    expect(result.hoursToday).toBe(0);
  });

  it("calcula horas específicas en FLEXIBLE con patrón", async () => {
    // Mock: lunes, mondayHours=6
    const result = await getExpectedHoursForToday();
    expect(result.hoursToday).toBe(6);
  });

  it("detecta jornada intensiva correctamente", async () => {
    // Mock: 20 julio, periodo intensivo
    const result = await getExpectedHoursForToday();
    expect(result.hoursToday).toBe(7); // intensiveMondayHours
  });

  it("usa valores por defecto sin contrato", async () => {
    // Mock: sin contrato activo
    const result = await getExpectedHoursForToday();
    expect(result.hoursToday).toBe(8);
    expect(result.isWorkingDay).toBe(true);
    expect(result.hasActiveContract).toBe(false);
  });
});
```

### Casos Edge

#### 1. Cambio de Día a Medianoche

**Escenario:** Usuario tiene la página abierta y pasa de 23:59 a 00:00

**Comportamiento actual:**

- El store NO se actualiza automáticamente
- Contador sigue usando las horas del día anterior

**Mejora recomendada (futuro):**

```typescript
// Detectar cambio de día cada minuto
useEffect(() => {
  const checkDayChange = setInterval(() => {
    const newDay = new Date().getDate();
    if (newDay !== currentDay) {
      loadInitialData(); // Recargar datos del nuevo día
    }
  }, 60000); // Cada minuto
}, [currentDay]);
```

#### 2. Periodo Intensivo que Cruza Año

**Escenario:** `intensiveStartDate = "12-15"`, `intensiveEndDate = "02-15"`

**Validación actual:**

```typescript
if (startMonthDay > endMonthDay) {
  // Cruza año
  isIntensivePeriod = currentMonthDay >= startMonthDay || currentMonthDay <= endMonthDay;
}
```

**Ejemplos:**

- 20 diciembre → `"12-20" >= "12-15"` → ✅ intensivo
- 10 enero → `"01-10" <= "02-15"` → ✅ intensivo
- 20 marzo → `"03-20" >= "12-15"` → ❌ NO intensivo (correcto)

#### 3. Sin Patrón Personalizado en Día Específico

**Escenario:** FLEXIBLE con patrón, pero `mondayHours = null`

**Comportamiento:**

```typescript
if (todayHours === null || todayHours === undefined) {
  hoursToday = 0;
  isWorkingDay = false;
}
```

**Resultado:** Muestra "Hoy no tienes que trabajar" (correcto)

---

## Próximas Mejoras (Roadmap)

### Corto Plazo

1. **Validación de Festivos**
   - Integrar con tabla `CalendarEvent`
   - Si hoy es festivo → `isWorkingDay = false` (sobrescribir contrato)

2. **Horas Extras Automáticas**
   - Si `!isWorkingDay` y se ficha → Marcar como horas extras en BD
   - Campo nuevo: `TimeEntry.isOvertime: Boolean`

3. **Testing Automático**
   - Implementar tests unitarios sugeridos
   - Coverage mínimo: 80%

### Medio Plazo

1. **Detección de Cambio de Día**
   - Actualizar store automáticamente a medianoche
   - Mostrar notificación: "Nuevo día detectado"

2. **Validación en `detectIncompleteEntries()`**
   - NO aplicar límite 150% en días no laborables
   - Permitir horas extras ilimitadas

3. **Dashboard de Horas Extras**
   - Página específica: `/dashboard/me/overtime`
   - Mostrar todas las horas trabajadas en días no laborables

### Largo Plazo

1. **Sistema de Turnos (SHIFTS)**
   - Implementar calendario de turnos
   - `getExpectedHoursForToday()` consulta calendario
   - Soporte para turnos rotativos

2. **Horarios por Proyecto/Cliente**
   - Múltiples horarios simultáneos
   - Priorizar según actividad actual

3. **Predicción de Horas Restantes**
   - ML para predecir tiempo necesario según histórico
   - Sugerencias: "A este ritmo, terminarás a las 18:30"

---

## Conclusión

Este sistema de validación de días laborables es la **base fundamental** para:

✅ Cálculos precisos de tiempo trabajado
✅ Validaciones correctas de jornada
✅ Detección automática de horas extras
✅ Transparencia con el empleado
✅ Cumplimiento normativo (registro horario)

**Todos los futuros desarrollos relacionados con tiempo de trabajo DEBEN usar `getExpectedHoursForToday()` en lugar de `getExpectedDailyHours()`.**

---

**Documentación actualizada:** 2025-11-15
**Autor:** Claude (Anthropic)
**Revisión:** Pendiente
**Estado:** Implementado y funcional

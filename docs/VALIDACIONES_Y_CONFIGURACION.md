# Sistema de Validaciones Configurables y Alertas Avanzadas

**Fecha:** 2025-11-19
**Versión:** 2.0
**Estado:** Sistema de Alertas Avanzadas Implementado ✅ (2025-11-19)

---

## 📄 Navegación

← [Volver al Plan Principal](./PLAN_MIGRACION_HORARIOS_V2.md)
← [Ver Motor de Cálculo](./MOTOR_CALCULO_HORARIOS.md)

---

## 📚 Índice

1. [Objetivo](#objetivo)
2. [Cambios en Base de Datos](#cambios-en-base-de-datos)
3. [Server Actions](#server-actions)
4. [UI de Configuración](#ui-de-configuración)
5. [Integración con Motor de Validación](#integración-con-motor-de-validación)
6. [Integración en Flujo de Fichaje](#integración-en-flujo-de-fichaje)
7. [Visualización en UI](#visualización-en-ui)
8. [Casos de Uso](#casos-de-uso)

---

## 🎯 Objetivo

Permitir que cada organización configure sus propias reglas de validación para fichajes, haciendo el sistema flexible y adaptable a diferentes políticas empresariales.

---

## 🗄️ Cambios en Base de Datos

### Modelo `Organization` - Nuevos campos de configuración

```prisma
model Organization {
  // ... campos existentes ...

  // ========================================
  // Configuración de Validaciones de Fichajes
  // ========================================
  clockInToleranceMinutes       Int     @default(15)  // Tolerancia para entrada (retraso aceptable)
  clockOutToleranceMinutes      Int     @default(15)  // Tolerancia para salida (adelanto aceptable)
  earlyClockInToleranceMinutes  Int     @default(30)  // Tolerancia entrada muy anticipada
  lateClockOutToleranceMinutes  Int     @default(30)  // Tolerancia salida muy tardía
  nonWorkdayClockInAllowed      Boolean @default(false) // Permitir fichar en días no laborables
  nonWorkdayClockInWarning      Boolean @default(true)  // Mostrar warning en día no laboral
}
```

**Ejemplos de uso:**

- `clockInToleranceMinutes = 15`: Fichar hasta 15 minutos tarde NO genera warning
- `clockInToleranceMinutes = 5`: Fichar más de 5 minutos tarde SÍ genera warning
- `nonWorkdayClockInAllowed = false`: Impide fichar en días no laborables (error)
- `nonWorkdayClockInWarning = true`: Permite fichar pero muestra warning

---

### Modelo `TimeEntry` - Campos de validación

```prisma
model TimeEntry {
  // ... campos existentes ...

  // ========================================
  // Validación contra horario (Schedule V2.0)
  // ========================================
  validationWarnings String[] @default([]) // Warnings de validación (tardío, muy anticipado, etc.)
  validationErrors   String[] @default([]) // Errores de validación (día no laboral, fuera de horario crítico)
  deviationMinutes   Int?     // Desviación en minutos respecto al horario esperado (+/- valor)
}
```

**Ejemplos de warnings:**

- `["Fichaje tardío: 20 minutos de retraso"]`
- `["Fichaje muy anticipado: 45 minutos antes de lo esperado"]`
- `["Fichaje en día no laboral"]`

**Ejemplos de errors:**

- `["No está permitido fichar en días no laborables"]`

---

## 🔧 Server Actions

**Archivo:** `/src/server/actions/time-clock-validations.ts`

### `getOrganizationValidationConfig()`

**Firma:**

```typescript
export async function getOrganizationValidationConfig(): Promise<ValidationConfig>;
```

**Descripción:**
Obtiene la configuración de validaciones de la organización del usuario autenticado.

**Retorna:**

```typescript
interface ValidationConfig {
  clockInToleranceMinutes: number;
  clockOutToleranceMinutes: number;
  earlyClockInToleranceMinutes: number;
  lateClockOutToleranceMinutes: number;
  nonWorkdayClockInAllowed: boolean;
  nonWorkdayClockInWarning: boolean;
}
```

---

### `updateOrganizationValidationConfig()`

**Firma:**

```typescript
export async function updateOrganizationValidationConfig(config: ValidationConfig): Promise<{ success: boolean }>;
```

**Descripción:**
Actualiza la configuración de validaciones de la organización. Valida que los valores sean números positivos.

**Ejemplo:**

```typescript
await updateOrganizationValidationConfig({
  clockInToleranceMinutes: 10,
  clockOutToleranceMinutes: 10,
  earlyClockInToleranceMinutes: 20,
  lateClockOutToleranceMinutes: 20,
  nonWorkdayClockInAllowed: false,
  nonWorkdayClockInWarning: true,
});
```

---

## 🎨 UI de Configuración

**Ubicación:** `/src/app/(main)/dashboard/settings/_components/time-clock-validations-tab.tsx`

### Características

- 4 inputs numéricos para tolerancias en minutos
- 2 switches para configurar días no laborables
- Botón "Guardar configuración"
- Toast notifications para feedback del usuario
- Loading states durante guardado
- Valores por defecto: 15 min para tolerancias básicas, 30 min para tolerancias extendidas

### Añadido a página de settings

```tsx
// En /src/app/(main)/dashboard/settings/page.tsx
const tabs = [
  { value: "organization", label: "Organización" },
  { value: "chat", label: "Chat" },
  { value: "shifts", label: "Turnos" },
  { value: "geolocation", label: "Geolocalización" },
  { value: "validations", label: "Fichajes" }, // ← NUEVO
  { value: "expenses", label: "Gastos" },
  { value: "system", label: "Sistema" },
];
```

**Captura de pantalla conceptual:**

```
┌─────────────────────────────────────────────────────────┐
│ ⚙️ Configuración de Validaciones de Fichajes            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Tolerancias de entrada                                 │
│ ┌───────────────────────────────────────────────────┐  │
│ │ Retraso aceptable (minutos)           [15]       │  │
│ │ Entrada muy anticipada (minutos)      [30]       │  │
│ └───────────────────────────────────────────────────┘  │
│                                                         │
│ Tolerancias de salida                                  │
│ ┌───────────────────────────────────────────────────┐  │
│ │ Salida anticipada (minutos)           [15]       │  │
│ │ Salida muy tardía (minutos)           [30]       │  │
│ └───────────────────────────────────────────────────┘  │
│                                                         │
│ Días no laborables                                     │
│ ┌───────────────────────────────────────────────────┐  │
│ │ ⚪ Permitir fichar en días no laborables          │  │
│ │ 🟢 Mostrar warning en día no laboral              │  │
│ └───────────────────────────────────────────────────┘  │
│                                                         │
│ [Guardar configuración]                                │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 Integración con Motor de Validación

**Modificaciones en `/src/lib/schedule-engine.ts`:**

La función `validateTimeEntry()` ahora:

### 1. Obtiene configuración de la organización

```typescript
const employee = await prisma.employee.findUnique({
  where: { id: employeeId },
  select: {
    orgId: true,
    organization: {
      select: {
        clockInToleranceMinutes: true,
        clockOutToleranceMinutes: true,
        earlyClockInToleranceMinutes: true,
        lateClockOutToleranceMinutes: true,
        nonWorkdayClockInAllowed: true,
        nonWorkdayClockInWarning: true,
      },
    },
  },
});

const orgConfig = employee.organization;
```

---

### 2. Valida días no laborables según configuración

```typescript
if (!schedule.isWorkingDay) {
  if (!orgConfig.nonWorkdayClockInAllowed) {
    return {
      isValid: false,
      warnings: [],
      errors: ["No está permitido fichar en días no laborables"],
    };
  }
  if (orgConfig.nonWorkdayClockInWarning) {
    return {
      isValid: true,
      warnings: ["Fichaje en día no laboral"],
      errors: [],
    };
  }
}
```

---

### 3. Aplica tolerancias configurables para CLOCK_IN

```typescript
if (entryType === "CLOCK_IN") {
  if (deviationMinutes > orgConfig.clockInToleranceMinutes) {
    warnings.push(`Fichaje tardío: ${deviationMinutes} minutos de retraso`);
  } else if (deviationMinutes < -orgConfig.earlyClockInToleranceMinutes) {
    warnings.push(`Fichaje muy anticipado: ${Math.abs(deviationMinutes)} minutos antes de lo esperado`);
  }
}
```

---

### 4. Aplica tolerancias configurables para CLOCK_OUT

```typescript
if (entryType === "CLOCK_OUT") {
  if (deviationMinutes < -orgConfig.clockOutToleranceMinutes) {
    warnings.push(`Salida anticipada: ${Math.abs(deviationMinutes)} minutos antes de lo esperado`);
  } else if (deviationMinutes > orgConfig.lateClockOutToleranceMinutes) {
    warnings.push(`Salida muy tardía: ${deviationMinutes} minutos después de lo esperado`);
  }
}
```

---

## 🚦 Integración en Flujo de Fichaje

**Modificaciones en `/src/server/actions/time-tracking.ts`:**

### En `clockIn()` (líneas 327-344)

```typescript
const now = new Date();

// Validar fichaje según horario y configuraciones de la organización
const validation = await validateTimeEntry(employeeId, now, "CLOCK_IN");

// Crear el fichaje
const entry = await prisma.timeEntry.create({
  data: {
    orgId,
    employeeId,
    entryType: "CLOCK_IN",
    timestamp: now,
    validationWarnings: validation.warnings ?? [],
    validationErrors: validation.errors ?? [],
    deviationMinutes: validation.deviationMinutes ?? null,
    ...geoData,
  },
});
```

---

### En `clockOut()` (líneas 432-447)

```typescript
const validation = await validateTimeEntry(employeeId, now, "CLOCK_OUT");

const entry = await prisma.timeEntry.create({
  data: {
    orgId,
    employeeId,
    entryType: "CLOCK_OUT",
    timestamp: now,
    validationWarnings: validation.warnings ?? [],
    validationErrors: validation.errors ?? [],
    deviationMinutes: validation.deviationMinutes ?? null,
    ...geoData,
  },
});
```

---

## 📊 Visualización en UI

**Modificaciones en `/src/server/actions/employee-schedule.ts`:**

La función `getTodaySummary()` ahora retorna warnings y errors consolidados:

```typescript
// Obtener todos los fichajes del día para agregar warnings/errors
const timeEntries = await prisma.timeEntry.findMany({
  where: {
    employeeId: employee.id,
    timestamp: { gte: today, lte: todayEnd },
  },
  select: {
    validationWarnings: true,
    validationErrors: true,
  },
});

// Consolidar todos los warnings y errors únicos
const allWarnings = new Set<string>();
const allErrors = new Set<string>();

for (const entry of timeEntries) {
  entry.validationWarnings.forEach((w) => allWarnings.add(w));
  entry.validationErrors.forEach((e) => allErrors.add(e));
}

return {
  success: true,
  summary: {
    // ... otros campos
    validationWarnings: Array.from(allWarnings),
    validationErrors: Array.from(allErrors),
  },
};
```

---

**Modificaciones en `/src/app/(main)/dashboard/me/clock/_components/today-summary.tsx`:**

Añadida sección de validaciones al final del componente:

```tsx
{
  /* Validaciones */
}
{
  (summary.validationWarnings.length > 0 || summary.validationErrors.length > 0) && (
    <>
      <Separator />
      <div className="space-y-2">
        {/* Errores en rojo */}
        {summary.validationErrors.map((error, index) => (
          <div
            key={`error-${index}`}
            className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50/50 p-2.5 dark:border-red-900 dark:bg-red-950/30"
          >
            <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400" />
            <span className="text-xs text-red-700 dark:text-red-300">{error}</span>
          </div>
        ))}

        {/* Warnings en amarillo/ámbar */}
        {summary.validationWarnings.map((warning, index) => (
          <div
            key={`warning-${index}`}
            className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/50 p-2.5 dark:border-amber-900 dark:bg-amber-950/30"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="text-xs text-amber-700 dark:text-amber-300">{warning}</span>
          </div>
        ))}
      </div>
    </>
  );
}
```

---

### Ejemplo Visual

**Card "Resumen del Día" con validaciones:**

```
┌─────────────────────────────────────────────────┐
│ 🕐 Resumen del Día                              │
├─────────────────────────────────────────────────┤
│ Estado:                        ✅ Completado    │
│ ─────────────────────────────────────────────── │
│ Horas esperadas:                8h 0min         │
│ Horas trabajadas:               8h 20min        │
│ ─────────────────────────────────────────────── │
│ Desviación:                     +20min 🟢      │
│ ─────────────────────────────────────────────── │
│ ⚠️ Fichaje tardío: 20 minutos de retraso       │
└─────────────────────────────────────────────────┘
```

---

## 📋 Casos de Uso

### Caso 1: Empresa flexible (tolerancia 30 minutos)

**Configuración:**

```
- clockInToleranceMinutes: 30
- clockOutToleranceMinutes: 30
```

**Resultado:**

```
- Empleado entra 09:25 (esperado 09:00) → ✅ Sin warning (dentro de tolerancia)
- Empleado entra 09:35 (esperado 09:00) → ⚠️ Warning: "Fichaje tardío: 35 minutos"
```

---

### Caso 2: Empresa estricta (tolerancia 5 minutos)

**Configuración:**

```
- clockInToleranceMinutes: 5
- clockOutToleranceMinutes: 5
```

**Resultado:**

```
- Empleado entra 09:04 (esperado 09:00) → ✅ Sin warning
- Empleado entra 09:06 (esperado 09:00) → ⚠️ Warning: "Fichaje tardío: 6 minutos"
```

---

### Caso 3: Impedir fichajes en días no laborables

**Configuración:**

```
- nonWorkdayClockInAllowed: false
```

**Resultado:**

```
- Empleado intenta fichar un domingo → ❌ Error: "No está permitido fichar en días no laborables"
- El fichaje NO se crea
```

---

### Caso 4: Permitir pero avisar en días no laborables

**Configuración:**

```
- nonWorkdayClockInAllowed: true
- nonWorkdayClockInWarning: true
```

**Resultado:**

```
- Empleado ficha un domingo → ✅ Fichaje creado + ⚠️ Warning: "Fichaje en día no laboral"
```

---

## 📂 Archivos Clave Implementados

**Server Actions:**

- `/src/server/actions/time-clock-validations.ts` - Gestión de configuración

**Componentes UI:**

- `/src/app/(main)/dashboard/settings/_components/time-clock-validations-tab.tsx` - UI de configuración
- `/src/app/(main)/dashboard/me/clock/_components/today-summary.tsx` - Visualización de badges

**Integraciones:**

- `/src/lib/schedule-engine.ts` - `validateTimeEntry()` usa configuraciones
- `/src/server/actions/time-tracking.ts` - `clockIn()`/`clockOut()` guardan validaciones
- `/src/server/actions/employee-schedule.ts` - `getTodaySummary()` consolida warnings/errors

---

## 🗄️ Migración de Base de Datos

**Ejecutada:**

```bash
npx prisma db push
```

**Estado:** Schema sincronizado con base de datos

**NOTA:** Se encontró un problema de caché de Prisma Client en Next.js, resuelto limpiando `.next`:

```bash
pkill -f "next|node.*3000" && rm -rf .next && npm run dev
```

---

## 🚨 Sistema de Alertas Avanzadas (V2.0)

### Descripción General

Sistema de tres niveles de alertas que extiende las validaciones básicas con umbrales críticos y notificaciones automáticas para RRHH y managers.

### 📊 Niveles de Alertas

El sistema implementa 3 niveles graduales de severidad:

1. **✅ OK (Sin alerta)**
   - Fichaje dentro de la tolerancia normal
   - No se genera ningún aviso
   - Ejemplo: Llega 10 min tarde con tolerancia de 15 min

2. **⚠️ WARNING (Alerta de advertencia)**
   - Fichaje excede tolerancia pero no alcanza umbral crítico
   - Se muestra badge amarillo/ámbar
   - Ejemplo: Llega 20 min tarde (tolerancia 15 min, umbral crítico 30 min)

3. **🔴 CRITICAL (Alerta crítica)**
   - Fichaje supera el umbral crítico configurado
   - Se muestra badge rojo
   - Puede generar notificación automática a RRHH/managers (si está activado)
   - Ejemplo: Llega 35 min tarde (umbral crítico 30 min)

### 🗄️ Cambios en Base de Datos (Sistema de Alertas)

**Nuevos campos en `Organization` model:**

```prisma
model Organization {
  // ... campos existentes ...

  // ========================================
  // Sistema de Alertas Avanzadas (V2.0)
  // ========================================
  criticalLateArrivalMinutes    Int     @default(30)  // Minutos de retraso para considerar alerta CRÍTICA
  criticalEarlyDepartureMinutes Int     @default(30)  // Minutos de salida temprana para alerta CRÍTICA
  alertsEnabled                 Boolean @default(true) // Activar/desactivar sistema de alertas
  alertNotificationsEnabled     Boolean @default(false) // Enviar notificaciones automáticas
  alertNotificationRoles        String[] @default(["RRHH"]) // Roles que reciben notificaciones
}
```

**Valores por defecto:**

- `criticalLateArrivalMinutes`: **30 minutos**
- `criticalEarlyDepartureMinutes`: **30 minutos**
- `alertsEnabled`: **true** (sistema activado)
- `alertNotificationsEnabled`: **false** (notificaciones desactivadas por defecto)
- `alertNotificationRoles`: **["RRHH"]** (extensible a "MANAGER", etc.)

---

### 🔧 Server Actions Actualizados

**Archivo:** `/src/server/actions/time-clock-validations.ts`

**Interface `ValidationConfig` ampliada:**

```typescript
interface ValidationConfig {
  // Validaciones básicas (V1.0)
  clockInToleranceMinutes: number;
  clockOutToleranceMinutes: number;
  earlyClockInToleranceMinutes: number;
  lateClockOutToleranceMinutes: number;
  nonWorkdayClockInAllowed: boolean;
  nonWorkdayClockInWarning: boolean;

  // Sistema de Alertas Avanzadas (V2.0)
  criticalLateArrivalMinutes: number;
  criticalEarlyDepartureMinutes: number;
  alertsEnabled: boolean;
  alertNotificationsEnabled: boolean;
  alertNotificationRoles: string[];
}
```

**Validaciones adicionales en `updateOrganizationValidationConfig()`:**

```typescript
// Validar que los umbrales críticos sean mayores o iguales a las tolerancias
if (config.criticalLateArrivalMinutes < config.clockInToleranceMinutes) {
  throw new Error("El umbral crítico de entrada debe ser mayor o igual a la tolerancia de entrada");
}

if (config.criticalEarlyDepartureMinutes < config.clockOutToleranceMinutes) {
  throw new Error("El umbral crítico de salida debe ser mayor o igual a la tolerancia de salida");
}
```

**Estas validaciones garantizan:**

- Tolerancia ≤ Umbral crítico (coherencia lógica)
- Imposible configurar alertas críticas antes que las warnings

---

### 🎨 UI de Configuración de Alertas

**Ubicación:** `/src/app/(main)/dashboard/settings/_components/time-clock-validations-tab.tsx`

**Nueva sección añadida:** "Sistema de Alertas Avanzadas"

**Componentes UI:**

1. **2 Inputs numéricos** para umbrales críticos:
   - `criticalLateArrivalMinutes` (min: 0, max: 120)
   - `criticalEarlyDepartureMinutes` (min: 0, max: 120)

2. **2 Switches** para activación:
   - `alertsEnabled` - Activar/desactivar sistema de alertas
   - `alertNotificationsEnabled` - Enviar notificaciones automáticas
     - Solo habilitado si `alertsEnabled = true`

**Ejemplo Visual:**

```
┌───────────────────────────────────────────────────────────────┐
│ ⚙️ Sistema de Alertas Avanzadas                               │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│ Umbrales Críticos                                            │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ Umbral Crítico - Entrada Tarde (minutos)      [30]    │  │
│ │ A partir de estos minutos, la alerta es CRÍTICA        │  │
│ │                                                         │  │
│ │ Umbral Crítico - Salida Temprana (minutos)    [30]    │  │
│ │ A partir de estos minutos, la alerta es CRÍTICA        │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                               │
│ Configuración de Notificaciones                              │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ 🟢 Activar Sistema de Alertas                          │  │
│ │    Detectar entradas tarde, salidas temprano, etc.     │  │
│ │                                                         │  │
│ │ ⚪ Enviar Notificaciones Automáticas                   │  │
│ │    Notificar a RRHH/managers cuando haya alertas      │  │
│ └─────────────────────────────────────────────────────────┘  │
│                                                               │
│ [Guardar Configuración]                                      │
└───────────────────────────────────────────────────────────────┘
```

**Card informativo añadido:**

Explica el funcionamiento del sistema de 3 niveles con ejemplos prácticos:

```
Ejemplo: Tolerancia entrada 15min, Umbral crítico 30min
→ 0-15min = OK (sin alerta)
→ 16-30min = WARNING (badge amarillo)
→ +30min = CRÍTICO (badge rojo + notificación)
```

---

### 🎯 Funcionamiento del Sistema de 3 Niveles

#### Entrada Tarde (Late Arrival)

**Configuración ejemplo:**

- `clockInToleranceMinutes = 15`
- `criticalLateArrivalMinutes = 30`

**Comportamiento:**

| Retraso   | Nivel       | Indicador      | Acción                               |
| --------- | ----------- | -------------- | ------------------------------------ |
| 0-15 min  | ✅ OK       | Sin badge      | Ninguna                              |
| 16-30 min | ⚠️ WARNING  | Badge amarillo | Warning en fichaje                   |
| 31+ min   | 🔴 CRITICAL | Badge rojo     | Warning + Notificación (si activado) |

#### Salida Temprana (Early Departure)

**Configuración ejemplo:**

- `clockOutToleranceMinutes = 15`
- `criticalEarlyDepartureMinutes = 30`

**Comportamiento:**

| Adelanto  | Nivel       | Indicador      | Acción                               |
| --------- | ----------- | -------------- | ------------------------------------ |
| 0-15 min  | ✅ OK       | Sin badge      | Ninguna                              |
| 16-30 min | ⚠️ WARNING  | Badge amarillo | Warning en fichaje                   |
| 31+ min   | 🔴 CRITICAL | Badge rojo     | Warning + Notificación (si activado) |

---

### 📋 Casos de Uso - Sistema de Alertas

#### Caso 1: Empresa con alertas estrictas

**Configuración:**

```typescript
clockInToleranceMinutes: 10,
criticalLateArrivalMinutes: 20,
alertsEnabled: true,
alertNotificationsEnabled: true
```

**Escenarios:**

```
Horario: 09:00
- 09:08 → ✅ OK (dentro de tolerancia 10 min)
- 09:15 → ⚠️ WARNING (excede tolerancia, no crítico)
- 09:25 → 🔴 CRITICAL (supera umbral 20 min) + Notificación a RRHH
```

---

#### Caso 2: Empresa flexible sin notificaciones

**Configuración:**

```typescript
clockInToleranceMinutes: 30,
criticalLateArrivalMinutes: 60,
alertsEnabled: true,
alertNotificationsEnabled: false
```

**Escenarios:**

```
Horario: 09:00
- 09:25 → ✅ OK (dentro de tolerancia 30 min)
- 09:45 → ⚠️ WARNING (excede tolerancia)
- 10:10 → 🔴 CRITICAL (supera 60 min) - SIN notificación
```

---

#### Caso 3: Sistema de alertas desactivado

**Configuración:**

```typescript
alertsEnabled: false;
```

**Resultado:**

```
- Validaciones básicas siguen funcionando (warnings en fichajes)
- NO se generan alertas críticas
- NO se envían notificaciones
- Sistema funciona como V1.0
```

---

### 🔮 Próximas Implementaciones

**Fase 2: Detección de Alertas**

- Server action para analizar fichajes y generar alertas
- Detección automática de patrones (3 retrasos consecutivos = alerta)
- Clasificación de alertas por severidad

**Fase 3: Dashboard de Alertas**

- Página `/dashboard/time-tracking/alerts`
- Vista de todas las alertas activas
- Filtros por empleado, tipo, severidad
- Acciones: resolver, comentar, justificar

**Fase 4: Notificaciones**

- Sistema de notificaciones en navbar (contador)
- Notificaciones por email (opcional)
- Configuración de destinatarios por rol

**Fase 5: Visualización en Componentes**

- Badges de alertas en `DayCard`
- Columna de alertas en tabla de empleados
- Indicadores visuales en tiempo real

---

### 🔧 Migración de Base de Datos

**Comandos ejecutados:**

```bash
# 1. Añadir nuevos campos al schema
npx prisma db push

# 2. Regenerar Prisma Client (después de limpiar caché)
rm -rf .next
npx prisma generate

# 3. Reiniciar servidor Next.js
npm run dev
```

**IMPORTANTE - Problema de Caché Resuelto:**

Al añadir nuevos campos a Prisma schema, Next.js puede cachear el Prisma Client antiguo, causando errores como:

```
PrismaClientValidationError: Unknown field `criticalLateArrivalMinutes`
```

**Solución:**

```bash
pkill -f "next|node.*3000" && rm -rf .next && npx prisma generate && npm run dev
```

---

## 📚 Documentos Relacionados

- [Plan Principal](./PLAN_MIGRACION_HORARIOS_V2.md) - Documentación completa del sistema
- [Motor de Cálculo](./MOTOR_CALCULO_HORARIOS.md) - Lógica de validación de fichajes
- [Arquitectura](./ARQUITECTURA_HORARIOS_V2.md) - Modelos de datos

---

**Versión:** 2.0
**Última actualización:** 2025-11-19
**Autor:** Sistema de Planificación ERP TimeNow

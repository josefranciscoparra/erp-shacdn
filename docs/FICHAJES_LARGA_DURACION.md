# Sistema de Avisos y Cancelación de Fichajes de Larga Duración

## 🎯 Objetivo

Detectar fichajes excesivamente largos (>150% jornada laboral), avisar al usuario ANTES de cerrar, permitir cancelación con auditoría completa, mantener trazabilidad para reportes, y permitir solicitudes manuales sobre cualquier tipo de fichaje con advertencias claras.

## 📋 Conceptos Clave

- **Fichaje de Larga Duración**: Fichaje que excede 150% de la jornada laboral del empleado
- **Cancelación**: Marcar el fichaje como inválido (no cuenta para cómputo de horas)
- **Auditoría**: Mantener registro de fichajes cancelados para inspecciones laborales
- **Regularización**: Proceso de crear fichaje manual correcto vía solicitudes

## 📐 Estructura de Base de Datos

### Campos en `TimeEntry`

```prisma
model TimeEntry {
  // ... campos existentes ...

  // Cancelación y auditoría
  isCancelled          Boolean @default(false)
  cancellationReason   CancellationReason?
  cancelledAt          DateTime?
  originalDurationHours Decimal? @db.Decimal(6,2) // Para fichajes cancelados por larga duración
  notes                String? // Notas adicionales de cancelación
}

enum CancellationReason {
  EXCESSIVE_DURATION          // Fichaje > 150% jornada laboral
  USER_ERROR                  // Error del usuario al fichar
  SYSTEM_ERROR                // Error técnico del sistema
  ADMIN_CORRECTION            // Corrección administrativa
  REPLACED_BY_MANUAL_REQUEST  // Reemplazado por solicitud manual aprobada
}
```

### Tabla `DismissedNotification` (Sistema de descarte)

```prisma
model DismissedNotification {
  id          String   @id @default(cuid())
  type        String   // "INCOMPLETE_ENTRY", "EXCESSIVE_TIME", etc.
  referenceId String   // ID del WorkdaySummary o TimeEntry
  dismissedAt DateTime @default(now())
  orgId       String
  userId      String

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, type, referenceId])
  @@index([userId, type])
  @@index([orgId])
}
```

**Propósito**: Permitir que los usuarios descarten notificaciones de fichajes incompletos. Una vez descartado, el badge "Fichaje abierto" desaparece permanentemente para ese fichaje específico.

### Campo en `WorkdaySummary`

```prisma
model WorkdaySummary {
  // ... campos existentes ...
  excessiveTimeNotified Boolean @default(false) // Flag interno de detección (legacy)
}
```

## 🔧 Lógica de Backend

### 1. Detección de Fichajes Excesivos

**Función**: `detectIncompleteEntries()`
**Ubicación**: `src/server/actions/time-tracking.ts`

**Propósito**: Detectar fichajes abiertos y calcular si son excesivos

**Retorno**:

```typescript
{
  hasIncompleteEntry: boolean,
  isExcessive: boolean, // Si > 150% jornada
  durationHours: number,
  dailyHours: number, // Jornada del empleado
  thresholdHours: number, // 150% de jornada
  percentageOfJourney: number, // ej: 325% (26h de 8h)
  clockInDate: Date, // Fecha del CLOCK_IN
  clockInTime: Date, // Timestamp completo
  clockInId: string, // ID del TimeEntry CLOCK_IN
  workdayId: string
}
```

**Lógica**:

1. Buscar último `CLOCK_IN` sin `CLOCK_OUT` correspondiente
2. Calcular duración: `now - clockIn.timestamp`
3. Obtener jornada del empleado: `dailyHours` (de contrato)
4. Calcular umbral: `dailyHours * 1.5`
5. Determinar si es excesivo: `durationHours > thresholdHours`

### 2. Cierre y Cancelación de Fichajes

**Función**: `clockOut()`
**Ubicación**: `src/server/actions/time-tracking.ts`

**Firma**:

```typescript
export async function clockOut(
  latitude?: number,
  longitude?: number,
  accuracy?: number,
  cancelAsClosed?: boolean, // Si viene de modal, cancelar el fichaje
  cancellationInfo?: {
    reason: "EXCESSIVE_DURATION";
    originalDurationHours: number;
    notes?: string;
  },
);
```

**Lógica**:

**Si `cancelAsClosed === true`**:

1. Crear `TimeEntry` CLOCK_OUT con datos de cancelación:

   ```typescript
   {
     entryType: "CLOCK_OUT",
     isCancelled: true,
     cancellationReason: cancellationInfo.reason,
     cancelledAt: new Date(),
     originalDurationHours: cancellationInfo.originalDurationHours,
     notes: cancellationInfo.notes,
     ...geoData
   }
   ```

2. Marcar CLOCK_IN correspondiente como cancelado:

   ```typescript
   await prisma.timeEntry.update({
     where: { id: clockInId },
     data: {
       isCancelled: true,
       cancellationReason: "EXCESSIVE_DURATION",
       cancelledAt: new Date(),
     },
   });
   ```

3. WorkdaySummary NO suma estas horas (excluir `isCancelled: true`)

**Si `cancelAsClosed === false` (fichaje normal)**:

- Lógica original sin cambios

### 3. Exclusión de Fichajes Cancelados en Cómputo

**Función**: `updateWorkdaySummary()`
**Ubicación**: `src/server/actions/time-tracking.ts`

**Cambio crítico**:

```typescript
const timeEntries = await prisma.timeEntry.findMany({
  where: {
    workdayId: workday.id,
    isCancelled: false, // ⚠️ SOLO contar fichajes NO cancelados
  },
  orderBy: { timestamp: "asc" },
});

// Calcular horas trabajadas SOLO de fichajes válidos
const { worked, break: breakMinutes } = calculateWorkedMinutes(timeEntries);
```

### 4. Cancelación Automática en Aprobaciones (MEJORADO)

**Función**: `approveManualTimeEntryRequest()`
**Ubicación**: `src/server/actions/approver-manual-time-entry.ts`

**Cambio crítico**: CANCELAR en lugar de ELIMINAR fichajes automáticos

**ANTES (❌ ELIMINAR - pérdida de auditoría)**:

```typescript
// Eliminar las entradas automáticas incompletas
await prisma.timeEntry.deleteMany({
  where: {
    id: { in: request.replacedEntryIds },
  },
});
```

**DESPUÉS (✅ CANCELAR - auditoría completa)**:

```typescript
// CANCELAR (no eliminar) las entradas automáticas
if (request.replacesIncompleteEntry && request.replacedEntryIds.length > 0) {
  await prisma.timeEntry.updateMany({
    where: {
      id: { in: request.replacedEntryIds },
    },
    data: {
      isCancelled: true,
      cancellationReason: "REPLACED_BY_MANUAL_REQUEST",
      cancelledAt: new Date(),
      cancellationNotes: `Reemplazado por solicitud manual aprobada (ID: ${request.id})`,
    },
  });
}
```

**Beneficios**:

- ✅ Fichajes automáticos permanecen en base de datos
- ✅ Trazabilidad completa en auditorías
- ✅ Visibles en `/dashboard/time-tracking` con estado "Cancelado"
- ✅ Exportables a Excel/CSV con columna de estado
- ✅ NO cuentan para cómputo de horas (filtrados en `updateWorkdaySummary`)

### 5. Sistema de Descarte de Notificaciones

**Archivo**: `src/server/actions/dismissed-notifications.ts` (NUEVO)

**Funciones**:

```typescript
/**
 * Marcar una notificación como descartada
 */
export async function dismissNotification(type: string, referenceId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("No autenticado");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, orgId: true },
  });

  if (!user) throw new Error("Usuario no encontrado");

  await prisma.dismissedNotification.upsert({
    where: {
      userId_type_referenceId: {
        userId: user.id,
        type,
        referenceId,
      },
    },
    create: {
      userId: user.id,
      orgId: user.orgId,
      type,
      referenceId,
    },
    update: {
      dismissedAt: new Date(),
    },
  });
}

/**
 * Verificar si una notificación está descartada
 */
export async function isNotificationDismissed(type: string, referenceId: string): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) return false;

  const dismissed = await prisma.dismissedNotification.findUnique({
    where: {
      userId_type_referenceId: {
        userId: session.user.id,
        type,
        referenceId,
      },
    },
  });

  return dismissed !== null;
}
```

**Tipos de notificaciones**:

- `"INCOMPLETE_ENTRY"`: Badge "Fichaje abierto"
- `"EXCESSIVE_TIME"`: Notificaciones de fichajes > 150% (futuro)

## 🎨 Interfaz de Usuario

### 1. Widget Superior (con descarte de notificaciones)

**Componente**: `quick-clock-widget.tsx`
**Ubicación**: `src/components/time-tracking/quick-clock-widget.tsx`

**Comportamiento mejorado**:

1. **Detectar fichaje incompleto**:

   ```typescript
   const incompleteData = await detectIncompleteEntries();
   if (incompleteData?.hasIncompleteEntry) {
     // Verificar si ya fue descartado
     const isDismissed = await isNotificationDismissed("INCOMPLETE_ENTRY", incompleteData.clockInId);

     if (!isDismissed) {
       setHasIncompleteEntry(true);
       setIsExcessive(incompleteData.isExcessive);
     }
   }
   ```

2. **Badge "Fichaje abierto"**:
   - Solo se muestra si NO está descartado
   - Link actualizado: `/dashboard/me/clock/requests?dismiss=${clockInId}`
   - Click automático marca como descartado

3. **Borde naranja en botón**:
   - Si `isExcessive === true`:
     - Aplicar `border-2 border-orange-500 ring-2 ring-orange-200`

**Flujo de descarte**:

```
Usuario ve badge → Click → Redirige a /requests
                         ↓
        Auto-llama dismissNotification("INCOMPLETE_ENTRY", clockInId)
                         ↓
                Badge desaparece permanentemente
```

### 2. Página de Fichaje

**Componente**: `clock-in.tsx`
**Ubicación**: `src/app/(main)/dashboard/me/clock/_components/clock-in.tsx`

**Comportamiento**:

1. Detectar fichaje excesivo igual que widget
2. Aplicar mismo borde naranja al botón
3. **Interceptar click** en "Fichar Salida":
   ```tsx
   const handleClockOut = () => {
     if (excessiveInfo?.isExcessive) {
       setShowExcessiveDialog(true); // Mostrar modal
     } else {
       executeClockOut(); // Fichaje normal
     }
   };
   ```
4. Renderizar `<ExcessiveTimeDialog />` cuando sea necesario

### 3. Modal de Aviso

**Componente**: `ExcessiveTimeDialog`
**Ubicación**: `src/components/time-tracking/excessive-time-dialog.tsx`

**Props**:

```typescript
interface ExcessiveTimeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  excessiveInfo: {
    durationHours: number;
    dailyHours: number;
    percentageOfJourney: number;
    clockInDate: Date;
    clockInTime: Date;
    clockInId: string;
  };
  onConfirmClose: () => void; // Callback para cerrar fichaje cancelado
  onGoToRegularize: () => void; // Callback para ir a regularizar
}
```

**Estructura del Modal**:

```
┌─────────────────────────────────────────────────────┐
│  ⚠️  Fichaje de Larga Duración Detectado            │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Este fichaje lleva abierto:                        │
│                                                     │
│  ┌───────────────────────────────────────────┐     │
│  │ 📅 Desde: Lunes 10/11/2025 - 09:00       │     │
│  │ ⏱️  Duración: 26.0 horas                  │     │
│  │ 📊 325% de tu jornada laboral (8h)       │     │
│  └───────────────────────────────────────────┘     │
│                                                     │
│  ¿Qué deseas hacer?                                │
│                                                     │
│  • Cerrar y cancelar: El fichaje se cerrará pero  │
│    se marcará como cancelado (no contará para el  │
│    cómputo de horas).                             │
│                                                     │
│  • Regularizar: Podrás crear una solicitud de     │
│    fichaje manual con los horarios correctos.     │
│    Las solicitudes deben enviarse dentro de 1 día │
│    después del fichaje.                           │
│                                                     │
├─────────────────────────────────────────────────────┤
│  [Cancelar]  [Ir a Regularizar]  [Cerrar y Cancelar]│
└─────────────────────────────────────────────────────┘
```

**Botones y Acciones**:

1. **"Cancelar"**: Cierra modal sin hacer nada
2. **"Ir a Regularizar"**:
   - Redirect a `/dashboard/me/clock/requests`
   - Fichaje permanece abierto (IN_PROGRESS)
   - Usuario crea solicitud manual
3. **"Cerrar y Cancelar Fichaje"** (destructive variant):
   - Ejecuta `clockOut()` con `cancelAsClosed=true`
   - Fichaje se marca como cancelado
   - Modal se cierra
   - UI actualiza a estado "Fichado Salida"

## 📊 Auditoría y Reportes

### 1. Página de Fichajes Admin

**URL**: `/dashboard/time-tracking`

**Nuevas Columnas en Tabla**:

#### Columna "Estado"

```tsx
{
  id: "status",
  header: "Estado",
  cell: ({ row }) => {
    if (row.original.isCancelled) {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Cancelado
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <Check className="h-3 w-3" />
        Válido
      </Badge>
    );
  }
}
```

#### Columna "Motivo Cancelación"

```tsx
{
  id: "cancellationReason",
  header: "Motivo",
  cell: ({ row }) => {
    if (!row.original.isCancelled) return "-";

    const reasonLabels = {
      EXCESSIVE_DURATION: "Larga duración",
      USER_ERROR: "Error usuario",
      SYSTEM_ERROR: "Error sistema",
      ADMIN_CORRECTION: "Corrección admin"
    };

    return (
      <div className="space-y-1">
        <p className="text-sm">{reasonLabels[row.original.cancellationReason]}</p>
        {row.original.originalDurationHours && (
          <p className="text-xs text-muted-foreground">
            Duración: {row.original.originalDurationHours}h
          </p>
        )}
      </div>
    );
  }
}
```

**Nuevo Tab**: "Fichajes Cancelados"

```tsx
<Tabs defaultValue="all">
  <TabsList>
    <TabsTrigger value="all">Todos</TabsTrigger>
    <TabsTrigger value="valid">Válidos</TabsTrigger>
    <TabsTrigger value="cancelled">
      Cancelados
      <Badge variant="destructive" className="ml-2">
        {cancelledCount}
      </Badge>
    </TabsTrigger>
  </TabsList>

  <TabsContent value="cancelled">{/* Tabla filtrada: isCancelled === true */}</TabsContent>
</Tabs>
```

**Estilo Visual**:

```tsx
<TableRow className={cn(entry.isCancelled && "bg-red-50 line-through decoration-red-500 opacity-60")}>
  {/* ... celdas ... */}
</TableRow>
```

### 2. Export a Excel

**Columnas Adicionales**:

- "Estado": VÁLIDO / CANCELADO
- "Motivo Cancelación": Descripción del motivo
- "Duración Original (h)": Horas del fichaje cancelado
- "Fecha Cancelación": Timestamp de cancelación
- "Notas": Observaciones adicionales

**Formato Condicional**:

- Fila con fondo rojo claro (`FFFFEBEE`) si `isCancelled === true`

### 3. Widget de Estadísticas

**Ubicación**: Dashboard admin (`/dashboard/admin`)

**Card de Métricas**:

```
┌─────────────────────────────────────────┐
│  ⚠️ Fichajes Cancelados (Este Mes)     │
├─────────────────────────────────────────┤
│  Total: 12 fichajes                     │
│  Empleados afectados: 5                 │
│  Promedio duración: 18.5h               │
│                                         │
│  [Ver Detalles] →                       │
└─────────────────────────────────────────┘
```

**Link**: Redirige a `/dashboard/time-tracking?tab=cancelled`

### 3. Formulario de Solicitud Manual (con advertencias)

**Componente**: Formulario en `/dashboard/me/clock/requests`
**Ubicación**: `src/app/(main)/dashboard/me/clock/requests/_components/`

**Nueva funcionalidad**: Permitir solicitudes sobre fichajes completos/incompletos con advertencia

**Lógica de detección**:

```typescript
// Al seleccionar fecha, detectar fichajes automáticos
useEffect(() => {
  if (!selectedDate) return;

  const checkExistingEntries = async () => {
    const entries = await getTimeEntriesForDate(selectedDate);
    const automaticEntries = entries.filter((e) => !e.isManual && !e.isCancelled);

    if (automaticEntries.length > 0) {
      const hasClockIn = automaticEntries.some((e) => e.entryType === "CLOCK_IN");
      const hasClockOut = automaticEntries.some((e) => e.entryType === "CLOCK_OUT");

      setHasExistingEntries(true);
      setExistingEntriesComplete(hasClockIn && hasClockOut);
      setExistingWorkedHours(calculateHours(automaticEntries));
    }
  };

  checkExistingEntries();
}, [selectedDate]);
```

**Interfaz de advertencia**:

```tsx
{
  hasExistingEntries && (
    <Alert variant="warning" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Ya tienes fichajes para este día</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>
          Hay fichajes automáticos registrados para el {selectedDate.toLocaleDateString()}
          {existingEntriesComplete ? ` (${existingWorkedHours} horas trabajadas)` : " (fichaje incompleto)"}
        </p>
        <p className="font-medium">
          Si continúas, los fichajes automáticos se cancelarán y reemplazarán por los datos de esta solicitud.
        </p>

        <div className="mt-3 flex items-center gap-2">
          <Checkbox id="confirm-replacement" checked={confirmReplacement} onCheckedChange={setConfirmReplacement} />
          <label htmlFor="confirm-replacement" className="cursor-pointer text-sm">
            Entiendo que los fichajes automáticos se cancelarán
          </label>
        </div>
      </AlertDescription>
    </Alert>
  );
}

<Button type="submit" disabled={hasExistingEntries && !confirmReplacement}>
  Enviar Solicitud
</Button>;
```

**Estados del botón submit**:

- Sin fichajes previos → Habilitado
- Con fichajes previos + checkbox SIN marcar → Deshabilitado
- Con fichajes previos + checkbox marcado → Habilitado

## 🔄 Flujos de Usuario

### Escenario 1: Cerrar y Cancelar Fichaje

**Contexto**: Usuario trabajó 8h pero olvidó fichar salida. Al día siguiente (26h después) intenta fichar salida.

**Paso a paso**:

1. ✅ Usuario abre app
   - Widget detecta fichaje abierto > 12h (150% de 8h)
   - Botón "Fichar Salida" muestra borde naranja

2. ✅ Usuario va a `/dashboard/me/clock`
   - Ve botón con borde naranja
   - Click en "Fichar Salida"

3. ✅ Sistema detecta y muestra modal:
   - Duración: 26 horas
   - Jornada: 8 horas
   - Porcentaje: 325% de jornada
   - Opciones: Regularizar / Cerrar y Cancelar

4. ✅ Usuario selecciona "Cerrar y Cancelar Fichaje":
   - Se ejecuta `clockOut(..., true, {...})`
   - Se marcan ambos TimeEntry como cancelados:
     - CLOCK_IN (ayer 09:00): `isCancelled: true`
     - CLOCK_OUT (hoy 11:00): `isCancelled: true`, `originalDurationHours: 26`
   - WorkdaySummary de ayer: `totalWorkedMinutes: 0`

5. ✅ Usuario regulariza (opcional):
   - Va a `/dashboard/me/clock/requests`
   - Crea solicitud: "Ayer 09:00 - 17:00"
   - Admin aprueba → Fichaje manual creado (8h)

6. ✅ Resultado en auditoría:
   - Fichaje cancelado: 26h (visible, tachado, fondo rojo)
   - Fichaje manual: 8h (válido, cuenta para nómina)
   - Cómputo total del día: 8h ✅

### Escenario 2: Regularizar Sin Cerrar

**Contexto**: Usuario detecta fichaje largo y prefiere regularizar antes de cerrar.

**Paso a paso**:

1. ✅ Usuario detecta fichaje abierto con borde naranja
2. ✅ Click "Fichar Salida" → Modal aparece
3. ✅ Usuario selecciona "Ir a Regularizar":
   - Redirect a `/dashboard/me/clock/requests`
   - Fichaje automático sigue abierto (IN_PROGRESS)

4. ✅ Usuario crea solicitud manual:
   - Fecha: Ayer
   - Entrada: 09:00
   - Salida: 17:00
   - Notas: "Olvidé fichar salida"

5. ✅ Admin aprueba solicitud:
   - Se crea fichaje manual correcto (CLOCK_IN + CLOCK_OUT manual)
   - Fichajes automáticos se CANCELAN (no eliminan):
     - CLOCK_IN automático → `isCancelled: true`
     - Reason: `REPLACED_BY_MANUAL_REQUEST`
     - Notes: "Reemplazado por solicitud manual aprobada (ID: xxx)"

6. ✅ Resultado en auditoría:
   - Fichaje automático CLOCK_IN: Cancelado (visible, tachado, no cuenta)
   - Fichaje manual: Válido (8h, cuenta para nómina)
   - Cómputo total del día: 8h ✅

### Escenario 3: Corregir fichajes completos (NUEVO)

**Contexto**: Usuario fichó automáticamente pero las horas son incorrectas (ej: 2 horas en lugar de 8).

**Paso a paso**:

1. ✅ Usuario va a `/dashboard/me/clock/requests`
2. ✅ Selecciona fecha con fichajes completos
3. ✅ Sistema detecta y muestra **Alert warning**:
   - "⚠️ Ya tienes fichajes para este día (2.0 horas trabajadas)"
   - "Si continúas, los fichajes automáticos se cancelarán..."
   - Checkbox obligatorio: "Entiendo que los fichajes automáticos se cancelarán"

4. ✅ Usuario marca checkbox y envía solicitud:
   - Entrada: 09:00
   - Salida: 17:00 (8 horas correctas)
   - Sistema guarda IDs de fichajes a reemplazar en `replacedEntryIds`

5. ✅ Admin aprueba solicitud:
   - Fichajes automáticos (CLOCK_IN + CLOCK_OUT) se **CANCELAN**:
     - `isCancelled: true`
     - `cancellationReason: "REPLACED_BY_MANUAL_REQUEST"`
     - `cancellationNotes: "Reemplazado por solicitud manual (ID: xxx)"`
   - Se crean fichajes manuales nuevos (09:00 - 17:00)

6. ✅ Resultado en auditoría:
   - Fichajes automáticos: Cancelados (visible con tachado, 2h no cuentan)
   - Fichajes manuales: Válidos (8h cuentan para nómina)
   - Cómputo total del día: 8h ✅
   - **Trazabilidad completa**: Se ve que hubo fichajes de 2h cancelados y reemplazados

### Escenario 4: Descartar badge "Fichaje abierto" (NUEVO)

**Contexto**: Usuario ve el badge naranja pero no quiere regularizar ahora.

**Paso a paso**:

1. ✅ Usuario ve badge "Fichaje abierto" en widget superior
2. ✅ Click en badge → Redirige a `/dashboard/me/clock/requests?dismiss=<clockInId>`
3. ✅ Sistema ejecuta `dismissNotification("INCOMPLETE_ENTRY", clockInId)`
4. ✅ Badge desaparece **permanentemente**
5. ✅ Usuario puede regularizar más tarde si quiere, pero el badge no molesta más
6. ✅ Si el fichaje sigue abierto días después, el badge **NO vuelve a aparecer**

## ⚙️ Configuración

### Umbral de Detección

**Valor**: 150% de la jornada laboral del empleado

**Cálculo**:

```typescript
const dailyHours = employee.dailyHours; // De contrato (ej: 8h)
const thresholdHours = dailyHours * 1.5; // 12h para jornada de 8h

if (durationHours > thresholdHours) {
  // Fichaje excesivo
}
```

**Ejemplos**:

- Jornada 8h → Umbral 12h
- Jornada 6h → Umbral 9h
- Jornada 4h → Umbral 6h

### Plazo de Regularización

**Límite**: 1 día después del fichaje

**Validación**: En formulario de solicitud manual, verificar:

```typescript
const maxDaysAgo = 1;
const isWithinDeadline = differenceInDays(new Date(), requestDate) <= maxDaysAgo;
```

## 🔐 Seguridad y Permisos

### Empleados

- ✅ Pueden ver sus propios fichajes (válidos y cancelados)
- ✅ Pueden cancelar sus propios fichajes excesivos
- ✅ Pueden crear solicitudes manuales de regularización
- ❌ NO pueden editar/eliminar fichajes cancelados
- ❌ NO pueden ver fichajes de otros empleados

### Administradores

- ✅ Pueden ver todos los fichajes de todos los empleados
- ✅ Pueden filtrar y exportar fichajes cancelados
- ✅ Pueden aprobar/rechazar solicitudes manuales
- ✅ Al aprobar, automáticamente se cancelan fichajes automáticos correspondientes
- ❌ NO pueden modificar fichajes cancelados (auditoría inmutable)

## 📈 Métricas y KPIs

### Indicadores Clave

- **Tasa de fichajes cancelados**: `(Fichajes cancelados / Total fichajes) * 100`
- **Promedio duración fichajes cancelados**: Media de `originalDurationHours`
- **Empleados con más fichajes cancelados**: Top 5 ranking
- **Motivo más común**: Distribución de `CancellationReason`

### Alertas Admin

- ⚠️ Alerta si empleado tiene > 3 fichajes cancelados en 1 mes
- ⚠️ Alerta si tasa de cancelación > 10% en la organización
- ⚠️ Alerta si duración promedio > 24 horas

## 🧪 Testing

### Casos de Prueba

#### Test 1: Detección de Fichaje Excesivo

1. Crear CLOCK_IN de ayer a las 09:00
2. Esperar que pase umbral (simular con timestamp mock)
3. Verificar que `detectIncompleteEntries()` retorna `isExcessive: true`
4. Verificar que botón muestra borde naranja

#### Test 2: Cancelación Manual

1. Crear fichaje excesivo (26h)
2. Click "Fichar Salida" → Modal aparece
3. Click "Cerrar y Cancelar Fichaje"
4. Verificar que ambos TimeEntry tienen `isCancelled: true`
5. Verificar que WorkdaySummary NO suma esas horas

#### Test 3: Regularización

1. Crear fichaje excesivo
2. Click "Ir a Regularizar"
3. Crear solicitud manual (8h)
4. Aprobar como admin
5. Verificar que CLOCK_IN automático se cancela
6. Verificar que WorkdaySummary suma solo fichaje manual (8h)

#### Test 4: Auditoría

1. Crear varios fichajes (válidos y cancelados)
2. Ir a `/dashboard/time-tracking`
3. Verificar columna "Estado" muestra badges correctos
4. Verificar tab "Cancelados" filtra correctamente
5. Verificar export Excel incluye columnas de auditoría
6. Verificar formato condicional (fondo rojo)

### Usuario de Prueba

- Email: `deejaymacro@hotmail.es`
- Fichaje de prueba: Ya existe CLOCK_IN de ayer a las 09:00 (IN_PROGRESS)

## 🐛 Troubleshooting

### Problema: Botón no muestra borde naranja

**Causa**: `detectIncompleteEntries()` no se está ejecutando
**Solución**: Verificar que `useEffect` en widget/página llama correctamente la función

### Problema: Modal no aparece al hacer click

**Causa**: Interceptación de click no funciona
**Solución**: Verificar que `handleClockOut` verifica `excessiveInfo?.isExcessive`

### Problema: Fichaje cancelado cuenta para cómputo

**Causa**: `updateWorkdaySummary()` no filtra `isCancelled`
**Solución**: Añadir `where: { isCancelled: false }` en query de TimeEntry

### Problema: Export Excel no muestra fichajes cancelados

**Causa**: Query no incluye `isCancelled: true`
**Solución**: Remover filtro o hacer query sin filtro + filtrar en cliente

## 📚 Referencias

### Archivos Clave

- `src/server/actions/time-tracking.ts` - Lógica de fichajes
- `src/server/actions/manual-time-entry.ts` - Solicitudes manuales
- `src/components/time-tracking/quick-clock-widget.tsx` - Widget superior
- `src/app/(main)/dashboard/me/clock/_components/clock-in.tsx` - Página fichaje
- `src/components/time-tracking/excessive-time-dialog.tsx` - Modal de aviso
- `/dashboard/time-tracking` - Vista admin de fichajes
- `prisma/schema.prisma` - Definición de base de datos

### Documentos Relacionados

- `CLAUDE.md` - Guía general del proyecto
- `README.md` - Documentación del ERP

---

**Última actualización**: 2025-01-11
**Versión**: 2.0
**Autor**: Sistema ERP con Claude Code

## 📝 Historial de Cambios

### v2.0 - 2025-01-11

- ✅ Añadida tabla `DismissedNotification` para descarte de notificaciones
- ✅ Nuevo `CancellationReason`: `REPLACED_BY_MANUAL_REQUEST`
- ✅ Sistema de descarte para badge "Fichaje abierto"
- ✅ Permitir solicitudes manuales sobre fichajes completos
- ✅ Advertencias con checkbox obligatorio en formulario
- ✅ CANCELAR en lugar de ELIMINAR fichajes (mejor auditoría)
- ✅ Nuevos escenarios: Corregir fichajes completos y Descartar badge

### v1.0 - 2025-01-10

- Versión inicial del sistema de fichajes de larga duración

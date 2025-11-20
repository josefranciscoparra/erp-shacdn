# Guía de UI - Sistema de Horarios V2.0

**Fecha:** 2025-11-19
**Versión:** 1.0
**Estado:** Implementado ✅

---

## 📄 Navegación

← [Volver al Plan Principal](./PLAN_MIGRACION_HORARIOS_V2.md)
← [Ver Arquitectura](./ARQUITECTURA_HORARIOS_V2.md)

---

## 📚 Índice

1. [CRUD de Plantillas](#crud-de-plantillas)
2. [Asignación a Empleados](#asignación-a-empleados)
3. [Integración con Fichaje](#integración-con-fichaje)

---

## ✅ FASE 4: UI - CRUD de Plantillas (COMPLETADA)

**Estado**: ✅ **100% Completado** (2025-11-18)

**Ubicación real implementada**: `/src/app/(main)/dashboard/schedules/`

### Estructura de Archivos IMPLEMENTADA

```
/src/app/(main)/dashboard/schedules/
├── page.tsx                              ✅ Lista de plantillas (Grid de cards)
├── [id]/
│   ├── page.tsx                          ✅ Detalle plantilla (tabs + editor)
│   └── _components/
│       ├── week-schedule-editor.tsx      ✅ Editor semanal de horarios
│       ├── create-period-dialog.tsx      ✅ Crear períodos
│       ├── edit-period-dialog.tsx        ✅ Editar períodos
│       ├── delete-period-dialog.tsx      ✅ Eliminar períodos
│       ├── edit-day-schedule-dialog.tsx  ✅ Editar horario de día
│       ├── copy-day-dialog.tsx           ✅ Copiar horario entre días
│       ├── assign-employees-dialog.tsx   ✅ Asignar empleados
│       └── assigned-employees-list.tsx   ✅ Lista empleados asignados
└── _components/
    ├── create-template-dialog.tsx        ✅ Dialog creación rápida
    └── schedules-templates-list.tsx      ✅ Lista con duplicar/eliminar
```

### Características Implementadas

✅ **Página Principal** (`/dashboard/schedules`)

- Lista de plantillas en grid de cards
- Badges de tipo, estado activo/inactivo, empleados asignados
- Menú de acciones: Editar, **Duplicar** ✅, **Eliminar** ✅
- Dialog de creación rápida con validación
- Estado vacío con call-to-action
- Protección con PermissionGuard

✅ **Duplicar Plantilla**

- Crea copia completa con nombre "(Copia)"
- Toast de confirmación
- Refresh automático de la lista
- Loading states durante duplicación

✅ **Eliminar Plantilla**

- Validación: No permite eliminar si tiene empleados asignados
- Confirmación con dialog nativo
- Toast de éxito/error
- Refresh automático de la lista
- Loading states durante eliminación

✅ **Página de Detalle** (`/dashboard/schedules/[id]`)

- Header con navegación
- 3 cards de resumen (empleados, períodos, tipo)
- Tabs: "Horarios" y "Empleados"
- Editor semanal completo
- Estados vacíos cuando no hay períodos

✅ **Editor de Períodos**

- CRUD completo de períodos (REGULAR, INTENSIVE, SPECIAL)
- Validación de fechas
- Gestión de conflictos
- Dialogs con formularios validados

✅ **Editor de Horarios por Día**

- Editar franjas horarias de cada día
- Copiar horario entre días
- Editor de time slots con validación
- Preview de horarios

✅ **Gestión de Empleados**

- Asignar empleados a plantillas
- Ver lista de empleados asignados
- Fechas de inicio/fin de asignación
- Validaciones de solapamientos

✅ **Navegación**

- Entrada en sidebar: "Gestión de Personal" → "Horarios"
- URL: `/dashboard/schedules`
- Permiso: `view_contracts`

---

### Página Principal (`/dashboard/schedules/page.tsx`)

**Características:**

- DataTable con tabs: "Fijos", "Turnos", "Rotaciones", "Flexible", "Todos"
- Botón "Nueva Plantilla" → Wizard
- Botón "Importar CSV/Excel"
- Acciones por fila: Ver, Editar, Duplicar, Eliminar
- Filtros: Activo/Inactivo, Tipo
- Badges: Tipo de plantilla, Número de periodos, Número de empleados asignados

---

### Wizard de Creación (`/dashboard/schedules/new/page.tsx`)

**Multi-paso:**

1. **Paso 1: Información Básica**
   - Nombre, descripción
   - Tipo de plantilla (FIXED, SHIFT, ROTATION, FLEXIBLE)

2. **Paso 2: Periodo REGULAR** (obligatorio)
   - Días laborables (L-V, L-S, etc.)
   - Tramos horarios por día
   - Preview semanal

3. **Paso 3: Periodos Especiales** (opcional)
   - Añadir INTENSIVE (verano)
   - Añadir SPECIAL (Semana Santa, Navidad, etc.)
   - Fechas de vigencia
   - Tramos horarios específicos

4. **Paso 4: Preview y Confirmación**
   - Vista previa de la plantilla completa
   - Calendario anual con periodos marcados
   - Botón "Crear Plantilla"

---

### Editor de Tramos Horarios (`time-slot-form.tsx`)

**Características:**

- Selector visual de hora inicio/fin (HH:mm)
- Tipo de tramo: WORK, BREAK, ON_CALL
- Tipo de presencia: MANDATORY, FLEXIBLE
- Descripción opcional
- Botón "Añadir Tramo"
- Lista de tramos creados (editar/eliminar)
- Validación: No solapamientos, orden cronológico

---

### Preview de Horario (`schedule-preview-calendar.tsx`)

**Vista Semanal:**

```
┌─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐
│  LUN    │  MAR    │  MIÉ    │  JUE    │  VIE    │  SÁB    │  DOM    │
├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ 09:00   │ 09:00   │ 09:00   │ 09:00   │ 09:00   │         │         │
│ ↓       │ ↓       │ ↓       │ ↓       │ ↓       │ Descanso│ Descanso│
│ 14:00   │ 14:00   │ 14:00   │ 14:00   │ 14:00   │         │         │
│ (WORK)  │ (WORK)  │ (WORK)  │ (WORK)  │ (WORK)  │         │         │
│         │         │         │         │         │         │         │
│ 14:00   │ 14:00   │ 14:00   │ 14:00   │ 14:00   │         │         │
│ ↓       │ ↓       │ ↓       │ ↓       │ ↓       │         │         │
│ 15:00   │ 15:00   │ 15:00   │ 15:00   │ 15:00   │         │         │
│ (BREAK) │ (BREAK) │ (BREAK) │ (BREAK) │ (BREAK) │         │         │
│         │         │         │         │         │         │         │
│ 15:00   │ 15:00   │ 15:00   │ 15:00   │ 15:00   │         │         │
│ ↓       │ ↓       │ ↓       │ ↓       │ ↓       │         │         │
│ 18:00   │ 18:00   │ 18:00   │ 18:00   │ 18:00   │         │         │
│ (WORK)  │ (WORK)  │ (WORK)  │ (WORK)  │ (WORK)  │         │         │
└─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘
Total: 40h/semana
```

**Vista Anual (con periodos):**

```
Enero - Junio: REGULAR (L-V 09:00-18:00, 40h)
15 Jun - 1 Sep: INTENSIVE (L-V 08:00-15:00, 35h)
Septiembre - Diciembre: REGULAR (L-V 09:00-18:00, 40h)
```

---

## 📋 FASE 5: UI - Asignación a Empleados

### Actualizar `/dashboard/employees/[id]/schedules`

**Reemplazar completamente** el formulario antiguo basado en `EmploymentContract`.

**Nueva estructura:**

```tsx
<div className="@container/main flex flex-col gap-4 md:gap-6">
  <SectionHeader title="Horario del Empleado" actionLabel="Asignar Horario" />

  {/* Horario Actual */}
  <Card>
    <CardHeader>
      <CardTitle>Horario Actual</CardTitle>
    </CardHeader>
    <CardContent>
      {currentAssignment ? (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h3>{currentAssignment.scheduleTemplate.name}</h3>
              <p className="text-muted-foreground text-sm">Desde {formatDate(currentAssignment.validFrom)}</p>
            </div>
            <Badge>{currentAssignment.assignmentType}</Badge>
          </div>

          {/* Preview del horario de esta semana */}
          <SchedulePreviewCalendar employeeId={employeeId} weekStart={startOfWeek(new Date())} />
        </>
      ) : (
        <EmptyState
          icon={CalendarIcon}
          title="Sin horario asignado"
          description="Este empleado no tiene un horario asignado todavía."
          action={<Button onClick={() => setShowAssignDialog(true)}>Asignar Horario</Button>}
        />
      )}
    </CardContent>
  </Card>

  {/* Histórico de Asignaciones */}
  <Card>
    <CardHeader>
      <CardTitle>Histórico de Horarios</CardTitle>
    </CardHeader>
    <CardContent>
      <Timeline>
        {history.map((assignment) => (
          <TimelineItem key={assignment.id}>
            <div>
              <h4>{assignment.scheduleTemplate.name}</h4>
              <p className="text-muted-foreground text-sm">
                {formatDate(assignment.validFrom)} - {assignment.validTo ? formatDate(assignment.validTo) : "Actual"}
              </p>
            </div>
          </TimelineItem>
        ))}
      </Timeline>
    </CardContent>
  </Card>
</div>
```

---

### Dialog de Asignación

**Formulario:**

1. **Tipo de asignación:**
   - Radio: FIXED, SHIFT, ROTATION, FLEXIBLE

2. **Seleccionar plantilla/rotación:**
   - Si FIXED/SHIFT/FLEXIBLE: Select de `ScheduleTemplate`
   - Si ROTATION: Select de `ShiftRotationPattern` + DatePicker de inicio

3. **Vigencia:**
   - Fecha desde (obligatorio)
   - Fecha hasta (opcional, null = indefinido)

4. **Preview:**
   - Horario de la próxima semana con la nueva asignación
   - Horas esperadas semanales

---

## 📋 FASE 6: Integración con Fichaje

### Actualizar `/dashboard/me/clock`

**Añadir sección "Tu Horario Hoy":**

```tsx
{
  /* Nuevo componente */
}
<Card>
  <CardHeader>
    <CardTitle>Tu Horario Hoy</CardTitle>
  </CardHeader>
  <CardContent>
    {effectiveSchedule ? (
      <>
        <div className="space-y-2">
          {effectiveSchedule.timeSlots.map((slot) => (
            <div key={slot.startMinutes} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={slot.slotType === "WORK" ? "default" : "secondary"}>{slot.slotType}</Badge>
                <span>
                  {minutesToTime(slot.startMinutes)} - {minutesToTime(slot.endMinutes)}
                </span>
              </div>
              {slot.presenceType === "MANDATORY" && <Badge variant="outline">Obligatorio</Badge>}
              {slot.presenceType === "FLEXIBLE" && <Badge variant="outline">Flexible</Badge>}
            </div>
          ))}
        </div>

        <Separator className="my-4" />

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Horas esperadas:</span>
          <span className="font-medium">{formatDuration(effectiveSchedule.expectedMinutes)}</span>
        </div>

        {effectiveSchedule.source === "PERIOD" && (
          <p className="text-muted-foreground mt-2 text-xs">Periodo: {effectiveSchedule.periodName}</p>
        )}
      </>
    ) : (
      <p className="text-muted-foreground text-sm">No tienes horario asignado para hoy</p>
    )}
  </CardContent>
</Card>;
```

---

**Indicador de tramo actual:**

```tsx
{
  /* Mostrar en qué tramo estamos AHORA */
}
<Alert>
  <ClockIcon className="h-4 w-4" />
  <AlertTitle>Tramo Actual</AlertTitle>
  <AlertDescription>
    {currentSlot ? (
      <>
        {currentSlot.slotType === "WORK" && <span>Tiempo de trabajo ({currentSlot.presenceType})</span>}
        {currentSlot.slotType === "BREAK" && <span>Descanso</span>}
        <br />
        <span className="text-muted-foreground text-xs">Hasta {minutesToTime(currentSlot.endMinutes)}</span>
      </>
    ) : (
      <span>Fuera de horario</span>
    )}
  </AlertDescription>
</Alert>;
```

---

### Actualizar Cálculo de `WorkdaySummary`

**Antes (sistema antiguo):**

```typescript
// En EmploymentContract
const expectedHours = contract.mondayHours; // campo fijo por día
```

**Ahora (sistema nuevo):**

```typescript
import { getEffectiveSchedule } from "@/lib/schedule-engine";

const effective = await getEffectiveSchedule(employeeId, today);
const expectedMinutes = effective.expectedMinutes;
const actualMinutes = workday.totalWorkedMinutes;
const deviation = actualMinutes - expectedMinutes;

// Guardar en WorkdaySummary (NUEVO CAMPO)
await prisma.workdaySummary.update({
  where: { id: workday.id },
  data: {
    expectedMinutes, // NUEVO campo Decimal
    deviationMinutes: deviation, // NUEVO campo Decimal
    status: determineStatus(actualMinutes, expectedMinutes, absence),
  },
});
```

**Añadir campos a `WorkdaySummary`:**

```prisma
model WorkdaySummary {
  // ... campos existentes ...

  // NUEVOS campos para sistema de horarios v2
  expectedMinutes  Decimal? @db.Decimal(6,2) // Minutos esperados según horario
  deviationMinutes Decimal? @db.Decimal(6,2) // Desviación (real - esperado)
}
```

---

## 📚 Componentes Implementados

### Archivos Clave

**Rutas:**

- `/src/app/(main)/dashboard/schedules/page.tsx` - Listado de plantillas
- `/src/app/(main)/dashboard/schedules/[id]/page.tsx` - Detalle y edición
- `/src/app/(main)/dashboard/schedules/new/page.tsx` - Creación

**Componentes de Página de Detalle:**

- `week-schedule-editor.tsx` - Editor visual semanal con validación 40h
- `assign-employees-dialog.tsx` - Dialog multi-select de asignación
- `assigned-employees-list.tsx` - Lista de empleados asignados
- `create-period-dialog.tsx` - Crear períodos
- `delete-period-dialog.tsx` - Eliminar períodos
- `edit-day-schedule-dialog.tsx` - Editor de horario por día
- `edit-period-dialog.tsx` - Editar periodos
- `copy-day-dialog.tsx` - Copiar horario entre días

**Componentes de Listado:**

- `create-template-dialog.tsx` - Dialog creación rápida
- `schedules-templates-list.tsx` - Lista con duplicar/eliminar

**Integraciones con Fichaje:**

- `/src/app/(main)/dashboard/me/clock/_components/today-schedule.tsx` - Horario esperado del día
- `/src/app/(main)/dashboard/me/clock/_components/today-summary.tsx` - Resumen con desviaciones

---

## 📚 Documentos Relacionados

- [Arquitectura](./ARQUITECTURA_HORARIOS_V2.md) - Modelos de datos
- [Motor de Cálculo](./MOTOR_CALCULO_HORARIOS.md) - Lógica de horarios
- [Server Actions](./SERVER_ACTIONS_HORARIOS.md) - API de backend
- [Validaciones](./VALIDACIONES_Y_CONFIGURACION.md) - Sistema de validaciones

---

**Versión:** 1.0
**Última actualización:** 2025-11-19
**Autor:** Sistema de Planificación ERP TimeNow

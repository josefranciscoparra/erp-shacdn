# Plan de Refactorización del Sistema de Horarios

**Fecha**: 2025-11-26
**Estado**: Pendiente de implementación
**Enfoque**: CONSERVADOR (sin cambios funcionales)

---

## Resumen Ejecutivo

El sistema de horarios tiene dos versiones coexistentes:
- **V1 (Legacy)**: `wizard-step-3-schedule.tsx` (1514 líneas) - Usado en wizard de empleados
- **V2 (Nuevo)**: `schedule-engine.ts` (1682 líneas) - Motor centralizado

El motor V2 funciona correctamente. Este plan es **conservador** para evitar romper funcionalidades existentes.

---

## Análisis de Riesgos Previo

### Hallazgo Crítico: La diferencia BREAK vs WORK es INTENCIONAL

Existen 4 tipos de `TimeSlotType`: `WORK`, `BREAK`, `ON_CALL`, `OTHER`

| Contexto | Lógica usada | Incluye ON_CALL | Razón |
|----------|--------------|-----------------|-------|
| Horarios normales | `!== "BREAK"` | ✅ Sí | Guardias localizadas cuentan como tiempo |
| Excepciones/festivos | `=== "WORK"` | ❌ No | En festivos no trabajas aunque estés localizable |

**NO CAMBIAR esta lógica** - rompería cálculos de:
- Vacaciones (`effectiveMinutes` ya calculados en histórico)
- Banco de horas (movimientos históricos)
- WorkdaySummary (compliance histórico)

### Impacto de expectedMinutes

El campo `expectedMinutes` se usa en:
1. **Fichajes (TimeEntry)** → `deviationMinutes`, validaciones
2. **Vacaciones (PtoRequest)** → `effectiveMinutes`, balance
3. **WorkdaySummary** → status COMPLETED/INCOMPLETE (>= 95% compliance)
4. **TimeBankMovement** → movimientos EXTRA/DEFICIT

### Sin Tests Unitarios

`schedule-engine.ts` NO tiene tests. Cualquier cambio funcional requiere testing manual exhaustivo.

---

## Fase 1: Refactorizar schedule-engine.ts (CONSERVADOR)

### 1.1 Cambios SEGUROS (sin impacto funcional)

#### A. Convertir console.logs a logger condicional

**Ubicación**: `/src/lib/schedule-engine.ts`

**Código a añadir al inicio del archivo**:
```typescript
// Logger condicional para debugging
const DEBUG_SCHEDULE = process.env.NODE_ENV === 'development' && process.env.DEBUG_SCHEDULE === 'true';
const log = DEBUG_SCHEDULE ? console.log : () => {};
```

**Líneas a modificar** (reemplazar `console.log` por `log`):
- L.476, L.483, L.524, L.537, L.544
- L.873, L.929, L.938
- L.1015, L.1043, L.1046

**L.1396** mantener como `console.error` (es un error real).

#### B. Crear helpers seguros

**Archivo nuevo**: `/src/lib/schedule-helpers.ts`

```typescript
import type { EffectiveSchedule, EffectiveTimeSlot } from "@/types/schedule";
import type { TimeSlot } from "@prisma/client";

/**
 * Normaliza una fecha a rango de medianoche a 23:59:59
 * NO cambia lógica existente, solo extrae código repetido.
 */
export function normalizeDateRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Crea un EffectiveSchedule vacío (día no laborable).
 * NO cambia lógica existente, solo extrae código repetido.
 */
export function createEmptySchedule(
  date: Date,
  source: string,
  options?: {
    periodName?: string;
    exceptionType?: string;
    exceptionReason?: string;
  }
): EffectiveSchedule {
  return {
    date,
    isWorkingDay: false,
    expectedMinutes: 0,
    timeSlots: [],
    source,
    ...(options?.periodName && { periodName: options.periodName }),
    ...(options?.exceptionType && { exceptionType: options.exceptionType }),
    ...(options?.exceptionReason && { exceptionReason: options.exceptionReason }),
  };
}

/**
 * Mapea TimeSlots de BD a EffectiveTimeSlot.
 * NO cambia lógica existente, solo extrae código repetido.
 */
export function mapSlotsToEffective(slots: TimeSlot[]): EffectiveTimeSlot[] {
  return slots.map((slot) => ({
    startMinutes: Number(slot.startTimeMinutes),
    endMinutes: Number(slot.endTimeMinutes),
    slotType: slot.slotType,
    presenceType: slot.presenceType,
    isMandatory: slot.presenceType === "MANDATORY",
    description: slot.description ?? undefined,
  }));
}

// ⚠️ NO crear helper para calculateWorkMinutes
// La lógica DEBE variar por contexto (!== "BREAK" vs === "WORK")
```

#### C. Añadir documentación explicativa

**Ubicación**: `/src/lib/schedule-engine.ts` línea ~820

```typescript
// NOTA IMPORTANTE: En excepciones usamos === "WORK" intencionalmente
// para excluir ON_CALL de días festivos/especiales.
// En horarios normales (líneas 343, 572, 1445) usamos !== "BREAK"
// para incluir ON_CALL como tiempo computable.
// Esta diferencia es INTENCIONAL - NO MODIFICAR sin entender el impacto.
const expectedMinutes = effectiveSlots
  .filter((slot) => slot.slotType === "WORK")
  .reduce((sum, slot) => sum + (slot.endMinutes - slot.startMinutes), 0);
```

### 1.2 Cambios que NO HACER

| Cambio | Razón para NO hacerlo |
|--------|----------------------|
| Unificar lógica `!== "BREAK"` vs `=== "WORK"` | Es intencional, rompería cálculos |
| Cambiar orden de prioridades | Ya funciona correctamente |
| Optimizar búsquedas O(n) a Map | Sin tests, muy arriesgado |
| Marcar funciones como privadas | Podrían usarse en otros sitios |
| Eliminar funciones "duplicadas" | Cada una tiene contexto diferente |

### Estimación Fase 1
- **Líneas modificadas**: ~50
- **Líneas nuevas** (helpers): ~50
- **Riesgo**: BAJO (no cambia comportamiento funcional)

---

## Fase 2: Verificar y Completar UI V2

### 2.1 Estado Actual de la UI

| Funcionalidad | Estado | Archivo |
|--------------|--------|---------|
| Crear plantilla | ✅ Completo | `create-template-dialog.tsx` |
| Editar metadatos | ⚠️ Verificar | ¿Existe `edit-template-dialog.tsx`? |
| Crear/editar período | ✅ Completo | `create-period-dialog.tsx`, `edit-period-dialog.tsx` |
| Editor FIXED | ✅ Completo | `week-schedule-editor.tsx` |
| Editor SHIFT | ⚠️ Verificar | Usuario dice que funciona |
| Editor ROTATION | ⚠️ Verificar | Usuario dice que funciona |
| Editor FLEXIBLE | ⚠️ Verificar | Usuario dice que funciona |
| Asignar empleados | ✅ Completo | `assign-employees-dialog.tsx` |
| Excepciones | ✅ Completo | `exceptions-tab.tsx` |

### 2.2 Tareas

1. **Verificar** que botón "Configuración" en página de plantilla funciona
2. **Crear `EditTemplateDialog`** si no existe (para editar nombre, descripción, tipo)
3. **Verificar** editores SHIFT/ROTATION/FLEXIBLE guardan en BD

### Archivos clave:
- `/src/app/(main)/dashboard/schedules/[id]/page.tsx`
- `/src/app/(main)/dashboard/schedules/[id]/_components/week-schedule-editor.tsx`

### Estimación Fase 2
- **Riesgo**: BAJO (usuario confirma que funciona)

---

## Fase 3: Migrar Wizard de Empleados a V2

### 3.1 Estado Actual

El wizard usa `wizard-step-3-schedule.tsx` (V1, 1514 líneas):
- Formulario monolítico
- No reutilizable
- Acoplado al flujo de creación

**Confirmado por grep**: El wizard importa y usa `WizardStep3Schedule` de V1.

### 3.2 Implementar Selector de Plantilla V2

**Archivo a modificar**: `/src/app/(main)/dashboard/employees/new/_components/wizard-step-3-schedule.tsx`

**Nuevo código** (~100 líneas en lugar de 1514):

```tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Clock } from "lucide-react";
import { CreateTemplateDialog } from "@/app/(main)/dashboard/schedules/_components/create-template-dialog";
import { getScheduleTemplates } from "@/server/actions/schedules-v2";

interface WizardStep3ScheduleProps {
  onComplete: (data: { scheduleTemplateId: string; validFrom: Date }) => void;
  initialData?: { scheduleTemplateId?: string; validFrom?: Date };
}

export function WizardStep3Schedule({ onComplete, initialData }: WizardStep3ScheduleProps) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    initialData?.scheduleTemplateId ?? null
  );
  const [validFrom, setValidFrom] = useState<Date>(initialData?.validFrom ?? new Date());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTemplates() {
      setLoading(true);
      const result = await getScheduleTemplates();
      setTemplates(result ?? []);
      setLoading(false);
    }
    loadTemplates();
  }, []);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  const handleSubmit = () => {
    if (!selectedTemplateId) return;
    onComplete({ scheduleTemplateId: selectedTemplateId, validFrom });
  };

  const handleTemplateCreated = (newTemplateId: string) => {
    setSelectedTemplateId(newTemplateId);
    setShowCreateDialog(false);
    // Recargar templates
    getScheduleTemplates().then((result) => setTemplates(result ?? []));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Plantilla de Horario
          </CardTitle>
          <CardDescription>
            Selecciona una plantilla de horario existente o crea una nueva.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selector de plantilla */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Plantilla</label>
            <Select
              value={selectedTemplateId ?? undefined}
              onValueChange={setSelectedTemplateId}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder={loading ? "Cargando..." : "Seleccionar plantilla"} />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex items-center gap-2">
                      {template.name}
                      <Badge variant="outline" className="text-xs">
                        {template.templateType}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fecha de inicio */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Válido desde
            </label>
            <DatePicker
              value={validFrom}
              onChange={(date) => date && setValidFrom(date)}
            />
          </div>

          {/* Botón crear nueva plantilla */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Crear nueva plantilla
          </Button>

          {/* Resumen de plantilla seleccionada */}
          {selectedTemplate && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">
                  <strong>{selectedTemplate.name}</strong>
                  {selectedTemplate.description && ` - ${selectedTemplate.description}`}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tipo: {selectedTemplate.templateType}
                </p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Botón continuar */}
      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={!selectedTemplateId}>
          Continuar
        </Button>
      </div>

      {/* Dialog crear plantilla */}
      <CreateTemplateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreated={handleTemplateCreated}
      />
    </div>
  );
}
```

### 3.3 Modificar employee-wizard.tsx

Actualizar la integración del step 3:

```tsx
// En handleStepComplete o similar
case 3:
  // Guardar scheduleTemplateId y validFrom para crear EmployeeScheduleAssignment
  setScheduleData(data);
  break;

// Al crear empleado (paso final)
await assignScheduleToEmployee({
  employeeId: newEmployee.id,
  scheduleTemplateId: scheduleData.scheduleTemplateId,
  validFrom: scheduleData.validFrom,
});
```

### Archivos a modificar:
- `/src/app/(main)/dashboard/employees/new/_components/wizard-step-3-schedule.tsx` - Reescribir
- `/src/app/(main)/dashboard/employees/new/_components/employee-wizard.tsx` - Ajustar integración

### Estimación Fase 3
- **Líneas eliminadas**: ~1400
- **Líneas nuevas**: ~150
- **Riesgo**: MEDIO (requiere testing manual del flujo de creación)

---

## Fase 4: Limpieza Final

### 4.1 Eliminar archivos

- [ ] `/src/app/(main)/dashboard/employees/new/_components/wizard-step-3-schedule.tsx.backup` (si existe)
- [ ] Imports no usados en archivos modificados

### 4.2 Verificar que no hay referencias rotas

```bash
# Buscar referencias al componente antiguo
grep -r "WizardStep3Schedule" src/
grep -r "wizard-step-3-schedule" src/
```

### 4.3 Actualizar documentación

- [ ] Actualizar `/docs/PLAN_MIGRACION_HORARIOS_V2.md` con estado final
- [ ] Marcar V1 como deprecado en comentarios

---

## Checklist de Verificación Post-Implementación

### Fase 1 (Motor)
- [ ] Console.logs solo aparecen con `DEBUG_SCHEDULE=true`
- [ ] Helpers funcionan igual que código original
- [ ] No hay errores en `npm run lint`

### Fase 2 (UI)
- [ ] Editar plantilla funciona
- [ ] SHIFT/ROTATION/FLEXIBLE guardan correctamente

### Fase 3 (Wizard)
- [ ] Crear empleado con plantilla existente funciona
- [ ] Crear empleado con nueva plantilla funciona
- [ ] La asignación se crea correctamente en `EmployeeScheduleAssignment`

### Regresión (NO debe cambiar)
- [ ] Fichajes calculan `deviationMinutes` igual que antes
- [ ] Vacaciones calculan `effectiveMinutes` igual que antes
- [ ] WorkdaySummary muestra status correcto
- [ ] Banco de horas genera movimientos correctos

---

## Archivos Críticos (Referencia Rápida)

| Archivo | Propósito |
|---------|-----------|
| `/src/lib/schedule-engine.ts` | Motor de cálculo (1682 líneas) |
| `/src/lib/schedule-helpers.ts` | Helpers nuevos (crear) |
| `/src/types/schedule.ts` | Tipos TypeScript |
| `/src/server/actions/schedules-v2.ts` | Server actions V2 |
| `/src/server/actions/time-tracking.ts` | Usa expectedMinutes |
| `/src/server/actions/employee-pto.ts` | Usa getEffectiveScheduleForRange |
| `/src/app/.../schedules/[id]/_components/week-schedule-editor.tsx` | Editor UI |
| `/src/app/.../employees/new/_components/wizard-step-3-schedule.tsx` | Wizard V1 (a migrar) |
| `/src/app/.../employees/new/_components/employee-wizard.tsx` | Contenedor wizard |

---

## Enums de Referencia

```typescript
// TimeSlotType
enum TimeSlotType {
  WORK      // Tiempo de trabajo
  BREAK     // Pausa/descanso
  ON_CALL   // Guardia localizada
  OTHER     // Otro
}

// PresenceType
enum PresenceType {
  MANDATORY // Presencia obligatoria
  FLEXIBLE  // Flexible
}

// PtoRequestStatus
enum PtoRequestStatus {
  DRAFT     // Borrador
  PENDING   // Pendiente
  APPROVED  // Aprobada
  REJECTED  // Rechazada
  CANCELLED // Cancelada
}
```

---

## Notas Importantes

1. **expectedMinutes se recalcula cada vez** - Los cambios solo afectan cálculos futuros, no históricos
2. **El factor de compensación** en vacaciones (1.0, 1.5, 1.75) NO se debe tocar
3. **ON_CALL** cuenta como tiempo en horarios normales pero NO en excepciones - esto es correcto
4. **Sin tests** - Cualquier cambio funcional requiere testing manual exhaustivo

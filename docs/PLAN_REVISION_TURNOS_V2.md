# Plan de Revisión: Sistema de Turnos V2.0

> **Estado:** ✅ Completado
> **Fecha inicio:** 2025-12-03
> **Objetivo:** Correcciones críticas pre-producción
> **Prioridad:** Solo bugs críticos (5 items)

---

## Decisiones Tomadas

| Decisión | Respuesta | Notas |
|----------|-----------|-------|
| ON_CALL cuenta como trabajo | **Depende del tipo** | Configurable por plantilla/turno |
| Editores SHIFT/ROTATION | **Marcar próximamente** | Badges "En Desarrollo" |
| Alcance | **Solo críticos** | 5 bugs que pueden causar fallos |

---

## 🔴 FASE 1: Correcciones Críticas

### 1.1 Validación de Ciclos en Rotaciones ✅
- [x] **Analizar:** Revisar código actual en `schedules-v2.ts`
- [x] **Implementar:** Validación que impida ciclos circulares
- [x] **Probar:** Test con rotación que se referencia a sí misma

**Problema:** Una rotación puede referenciarse a sí misma causando loop infinito.

**Archivo:** `src/server/actions/schedules-v2.ts`

**Solución:**
```typescript
// Al crear/editar ShiftRotationStep
if (scheduleTemplate.id === rotationPatternTemplateId) {
  throw new Error("El paso de rotación no puede referenciar la plantilla padre");
}
```

> ⚠️ **Nota:** Esta validación cubre el caso directo (auto-referencia). Si en el futuro permitimos composiciones más complejas de patrones (plantillas que referencian otras que a su vez referencian la original), habría que implementar detección de ciclos más general (BFS/DFS en grafo de dependencias).

---

### 1.2 Constraint XOR en ExceptionDayOverride ✅
- [x] **Analizar:** Revisar modelo actual en Prisma
- [x] **Crear migración:** Agregar check constraint en PostgreSQL
- [x] **Probar:** Intentar crear excepción sin scope definido

**Problema:** Se pueden crear excepciones sin ningún scope (employeeId, departmentId, etc.).

**Archivo:** `prisma/schema.prisma` + nueva migración

**Solución SQL (corregida para PostgreSQL):**
```sql
ALTER TABLE exception_day_overrides
ADD CONSTRAINT check_scope_xor
CHECK (
  (CASE WHEN employee_id IS NOT NULL THEN 1 ELSE 0 END) +
  (CASE WHEN schedule_template_id IS NOT NULL THEN 1 ELSE 0 END) +
  (CASE WHEN department_id IS NOT NULL THEN 1 ELSE 0 END) +
  (CASE WHEN cost_center_id IS NOT NULL THEN 1 ELSE 0 END) +
  (CASE WHEN is_global THEN 1 ELSE 0 END) >= 1
);
```

> 📝 **Decisión:** Usamos `>= 1` (al menos un scope) en lugar de `= 1` (exactamente uno). Esto permite combinaciones como `department_id + is_global` si el negocio lo requiere en el futuro.

---

### 1.3 Defaults en TimeSlot ✅
- [x] **Analizar:** Revisar campos nullable actuales
- [x] **Verificar datos:** Comprobar si hay filas con NULL en slotType/presenceType
- [x] **Migrar datos existentes:** UPDATE filas con NULL a WORK/MANDATORY
- [x] **Crear migración:** Agregar defaults a slotType y presenceType
- [x] **Probar:** Crear TimeSlot sin especificar tipo

**Problema:** `slotType` y `presenceType` pueden ser NULL, el motor asume que existen.

**Archivo:** `prisma/schema.prisma`

**Cambio:**
```prisma
model TimeSlot {
  slotType     TimeSlotType  @default(WORK)
  presenceType PresenceType  @default(MANDATORY)
}
```

> ⚠️ **Importante:** Antes de aplicar la migración, ejecutar:
> ```sql
> -- Verificar si hay NULLs
> SELECT COUNT(*) FROM time_slots WHERE slot_type IS NULL OR presence_type IS NULL;
>
> -- Si hay, migrar a valores por defecto
> UPDATE time_slots SET slot_type = 'WORK' WHERE slot_type IS NULL;
> UPDATE time_slots SET presence_type = 'MANDATORY' WHERE presence_type IS NULL;
> ```

---

### 1.4 Badges "En Desarrollo" para Editores SHIFT/ROTATION ✅
- [x] **Analizar:** Revisar componente week-schedule-editor.tsx
- [x] **Implementar:** Agregar badges y deshabilitar botones
- [x] **Probar:** Verificar que usuario entiende que no funciona

**Problema:** Botones "Nuevo Turno", "Nuevo Patrón" no funcionan sin feedback.

**Archivo:** `src/app/(main)/dashboard/schedules/[id]/_components/week-schedule-editor.tsx`

**Cambios:**
- Agregar `<Badge variant="secondary">En Desarrollo</Badge>` a secciones SHIFT y ROTATION
- Deshabilitar botones de acción con `disabled={true}`
- Agregar tooltip explicativo: "Esta funcionalidad estará disponible próximamente"

---

### 1.5 Configurabilidad de ON_CALL ✅
- [x] **Analizar:** Revisar modelo TimeSlot y cálculos en schedule-engine
- [x] **Diseñar:** Campos nuevos para configurar comportamiento ON_CALL
- [x] **Crear migración:** Agregar campos al modelo
- [x] **Implementar:** Lógica en schedule-engine para respetar configuración
- [x] **Probar:** Diferentes configuraciones de ON_CALL

**Problema:** ON_CALL se calcula inconsistentemente (a veces cuenta, a veces no).

**Archivos:**
- `prisma/schema.prisma` - Agregar campos
- `src/services/schedules/schedule-engine.ts` - Modificar cálculo

**Campos nuevos en TimeSlot:**
```prisma
model TimeSlot {
  // ... existentes
  countsAsWork         Boolean @default(true)
  compensationFactor   Decimal @db.Decimal(4,2) @default(1.00)
}
```

**Lógica en schedule-engine:**
```typescript
// ANTES (inconsistente):
if (typeStr !== "BREAK") {
  expectedMinutes += duration;
}

// DESPUÉS (configurable + seguro):
// Doble check: BREAK nunca cuenta aunque countsAsWork esté mal configurado
if (slot.slotType !== "BREAK" && slot.countsAsWork) {
  expectedMinutes += duration * Number(slot.compensationFactor);
}
```

> 📝 **Casos de uso por sector:**
> | Tipo de Guardia | countsAsWork | compensationFactor |
> |-----------------|--------------|-------------------|
> | Guardia Localizada (IT) | `false` | 0 |
> | Guardia Presencial | `true` | 1.00 |
> | Guardia Festivo Bombero | `true` | 1.75 |
> | Guardia Nocturna Hospital | `true` | 1.50 |

---

## Progreso General

| Fase | Items | Completados | Estado |
|------|-------|-------------|--------|
| 1. Críticos | 5 | 5 | ✅ Completado |

---

## Archivos Modificados

| Archivo | Cambios | Estado |
|---------|---------|--------|
| `prisma/schema.prisma` | Defaults, campos ON_CALL | ✅ |
| `src/server/actions/schedules-v2.ts` | Validación ciclos | ✅ |
| `src/services/schedules/schedule-engine.ts` | Lógica ON_CALL | ✅ |
| `src/app/(main)/dashboard/schedules/[id]/_components/week-schedule-editor.tsx` | Badges | ✅ |
| `src/types/schedule.ts` | Campos EffectiveTimeSlot | ✅ |

---

## Orden de Implementación

1. **Defaults TimeSlot** (migración simple, sin breaking changes)
2. **Badges UI** (cambio visual, "cierra" los editores rotos)
3. **Validación ciclos** (server action, sin migración)
4. **Constraint XOR** (migración SQL)
5. **ON_CALL configurable** (más complejo: campos + lógica)

---

## Migraciones

```bash
# 1. Defaults TimeSlot (después de migrar NULLs existentes)
npx prisma migrate dev --name add_defaults_to_timeslot

# 2. Campos ON_CALL
npx prisma migrate dev --name add_oncall_configuration_fields

# 3. Constraint XOR (SQL manual en migración)
npx prisma migrate dev --name add_exception_scope_constraint
```

---

## Backlog (Post-Producción)

> Documentado para futuras iteraciones, fuera del alcance actual.

### Motor
- [ ] Turnos nocturnos que cruzan medianoche (distribuir expectedMinutes entre días)
- [ ] Manejar 29 de febrero en excepciones recurrentes
- [ ] Optimizar búsqueda de ausencias (pre-indexar en memoria)
- [ ] Detectar múltiples asignaciones activas simultáneamente

### UI
- [ ] Implementar editor SHIFT completo
- [ ] Implementar editor ROTATION completo
- [ ] Validaciones en asignación de empleados (duplicados, fechas)
- [ ] Validación de fechas en períodos (validTo > validFrom)
- [ ] Timeline visual de franjas horarias

### Modelo
- [ ] Corregir unique en ManualShiftAssignment (permitir borradores)
- [ ] onDelete en FK de ShiftRotationStep
- [ ] Índices de rango para reportes (`@@index([employeeId, startDate, endDate])`)
- [ ] Campos para jornada comprimida
- [ ] Enum ExceptionType más completo

---

---

## 🔵 FASE 2: Organización y Limpieza

> **Estado:** En progreso
> **Fecha inicio:** 2025-12-03
> **Premisa:** NO ROMPER NADA. Solo organizar piezas.

### Situación Actual

Hay **DOS sistemas** que funcionan para lo mismo (fichajes, vacaciones):

| Sistema | URL | Tipo de empleado |
|---------|-----|------------------|
| **Horarios** | `/schedules` | Horario fijo (oficina) |
| **Cuadrante** | `/shifts` | Turnos rotativos (operarios) |

**Ambos detectan vacaciones** ✅

---

### 2.1 Verificar flujo actual de fichajes
- [ ] ¿Cómo detecta fichajes el tipo de horario del empleado?
- [ ] ¿Consulta a ambos sistemas o solo a uno?
- [ ] ¿Las vacaciones se detectan igual en FIXED y SHIFT?

### 2.2 Pruebas manuales (antes de tocar nada)
- [ ] Empleado FIXED: Fichar normal
- [ ] Empleado FIXED con vacaciones: No puede fichar
- [ ] Empleado SHIFT: Fichar según turno
- [ ] Empleado SHIFT con vacaciones parciales

---

### 2.3 Organizar navegación (UI)

#### Agrupar en el Sidebar
- [ ] Mover "Horarios" y "Cuadrante" juntos
- [ ] Grupo: "Gestión de Horarios"

**Archivo**: `src/navigation/sidebar-nav.tsx`

#### Quitar badges confusos
- [ ] SHIFT → Enlace a Cuadrante
- [ ] ROTATION → Enlace a Plantillas de Turnos
- [ ] FLEXIBLE → Editor simple (horas mínimas/máximas)

**Archivo**: `week-schedule-editor.tsx`

---

### 2.4 Mejoras menores

#### Validación de fechas en períodos
- [ ] No permitir `validTo < validFrom`

#### Turnos nocturnos (si hay bug)
- [ ] Verificar si 22:00-06:00 calcula bien
- [ ] Solo arreglar si hay problema real

---

## Historial de Cambios

| Fecha | Cambio | Por |
|-------|--------|-----|
| 2025-12-03 | Creación del plan | Claude |
| 2025-12-03 | Ajustes técnicos: SQL constraint, notas ciclos, Decimal type, lógica BREAK | Claude |
| 2025-12-03 | Completados 5 items críticos de Fase 1 | Claude |
| 2025-12-03 | Añadida Fase 2: Organización y Limpieza | Claude |

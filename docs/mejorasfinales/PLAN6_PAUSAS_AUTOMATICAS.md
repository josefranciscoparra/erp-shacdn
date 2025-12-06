# Mejora 6: Pausas Automáticas en Fichajes

## Estado: ✅ COMPLETADO

## Resumen

Implementar un sistema de **pausas automáticas programadas** que se registran al fichar salida (CLOCK_OUT). Las pausas se configuran en los `TimeSlot` de tipo `BREAK` dentro de las plantillas de horario (`ScheduleTemplate`).

## Decisiones de Diseño

| Aspecto | Decisión |
|---------|----------|
| Tipo de pausa | **Programada** - A hora fija se registra automáticamente |
| Momento de registro | **Al fichar salida** - Se crean TimeEntry de pausa en clockOut() |
| Aplicación horario variable | **Ajustada al fichaje real** - Se limita si salida < breakEnd |
| Nivel de configuración | **Por plantilla de horario** - En ScheduleTemplate/TimeSlot |
| Solapamiento con manual | **Prioridad pausa manual** - Si hay solapamiento, no se añade automática |
| Idempotencia | **Evitar duplicados** - Verificar antes de crear |

---

## Comportamiento Funcional

### Condiciones para crear pausa automática

**SÍ crear si:**
- Existe al menos un CLOCK_IN en el día
- El usuario ha hecho CLOCK_OUT válido
- El horario efectivo tiene TimeSlot BREAK con `isAutomatic=true`
- No existe ya una pausa automática para ese slot (idempotencia)

**NO crear si:**
- El día está marcado como ausencia completa (vacaciones, IT, etc.)
- No hay ningún tramo de trabajo real
- Ya existe pausa manual que solape con el intervalo
- Ya existe pausa automática para ese slot (duplicado)

### Relación horario vs hora real de salida

Para un BREAK automático con horario `breakStart` a `breakEnd`:

| Caso | CLOCK_OUT | Comportamiento |
|------|-----------|----------------|
| 1 | < breakStart | NO crear pausa automática |
| 2 | Entre breakStart y breakEnd | Crear pausa limitada: `breakStart` → `CLOCK_OUT` |
| 3 | > breakEnd | Crear pausa completa: `breakStart` → `breakEnd` |

### Solapamiento con pausas manuales

- Cualquier pausa manual con intersección temporal con `[breakStart, breakEnd]` cuenta como solapamiento
- Si hay solapamiento → NO crear pausa automática para ese slot
- **Regla:** "La pausa manual siempre tiene prioridad sobre la automática"

---

## Modelo de Datos

### Cambios en TimeSlot (schema.prisma)

```prisma
model TimeSlot {
  // ... campos existentes ...

  // NUEVO: Indica si esta pausa debe registrarse automáticamente al clockOut
  isAutomatic Boolean @default(false) // Solo aplica a slotType=BREAK
}
```

### Cambios en TimeEntry (schema.prisma)

```prisma
model TimeEntry {
  // ... campos existentes ...

  // NUEVO: Indica si este fichaje fue generado automáticamente
  isAutomatic          Boolean  @default(false)
  automaticBreakSlotId String?  // ID del TimeSlot que originó esta pausa
  automaticBreakNotes  String?  // Descripción de la regla aplicada
}
```

---

## Archivos a Modificar

| # | Archivo | Cambios |
|---|---------|---------|
| 1 | `prisma/schema.prisma` | Añadir `isAutomatic` a TimeSlot y campos tracking a TimeEntry |
| 2 | `src/types/schedule.ts` | Añadir `isAutomatic` y `timeSlotId` a EffectiveTimeSlot y CreateTimeSlotInput |
| 3 | `src/services/schedules/schedule-engine.ts` | Propagar `isAutomatic` al construir EffectiveTimeSlot |
| 4 | `src/server/actions/time-tracking.ts` | Implementar `processAutomaticBreaks()` y modificar `clockOut()` |
| 5 | `src/server/actions/schedules-v2.ts` | Guardar `isAutomatic` al crear/actualizar timeSlots |
| 6 | `src/app/(main)/dashboard/schedules/[id]/_components/edit-day-schedule-dialog.tsx` | Toggle para configurar pausas automáticas |
| 7 | `src/app/(main)/dashboard/me/clock/_components/time-entries-timeline.tsx` | Badge y colores diferenciados |
| 8 | `src/app/(main)/dashboard/me/clock/_components/today-schedule.tsx` | Indicador "(se registrará automáticamente)" |

---

## Diagrama de Flujo

```
clockOut()
    │
    ▼
Crear CLOCK_OUT
    │
    ▼
processAutomaticBreaks()
    │
    ├─► getEffectiveSchedule()
    │
    ├─► Filtrar slots BREAK con isAutomatic=true
    │
    ├─► Para cada pausa automática:
    │       ├─► checkBreakOverlap() con pausas manuales
    │       │
    │       └─► Si no hay solapamiento:
    │               Crear BREAK_START + BREAK_END
    │
    ▼
updateWorkdaySummary()
```

---

## Consideraciones Técnicas

### 1. Turnos Nocturnos (Cruce de medianoche)

En `calculateEffectiveBreakInterval`, manejar correctamente si el horario cruza la medianoche:
- Si `breakStart < shiftStart` → el slot pertenece a la "madrugada" del día siguiente lógico
- Al crear TimeEntry con Date absolutos, sumar 1 día a la fecha base si corresponde

### 2. Feedback al Usuario (UX)

En la acción `clockOut()`, devolver información sobre pausas automáticas creadas:

```typescript
return {
  success: true,
  clockOutEntry: ...,
  automaticBreaks: {
    created: 1,
    totalMinutes: 30,
    message: "Se ha añadido una pausa automática de 30 min."
  }
}
```

### 3. Edición posterior (Admin/Manager)

**Comportamiento V1**: Si un administrador edita la hora de salida a posteriori, la pausa automática NO se recalculará automáticamente.

**Decisión**: Mantener simple. La lógica solo se ejecuta en el momento del `clockOut()` del empleado.

---

## Limitaciones Conocidas

### Multi-tramo (jornada partida)

Si hay varios intervalos de trabajo en un día (ej: mañana 9-14 + tarde 16-20):
- `processAutomaticBreaks` debe trabajar por intervalo de trabajo efectivo
- Documentar como limitación para futuras extensiones

### Edición posterior de fichajes

- La edición manual de hora de salida por parte de un admin NO recalcula pausas automáticas
- El admin deberá crear/editar pausas manualmente si modifica la hora de salida

---

## Casos de Prueba

### Casos básicos

| Caso | Escenario | Esperado |
|------|-----------|----------|
| 1 | Pausa automática 13:00-13:30, salida 18:00 | Crear BREAK 13:00-13:30 completa |
| 2 | Pausa automática 13:00-13:30, salida 13:15 | Crear BREAK 13:00-13:15 (limitada) |
| 3 | Pausa automática 13:00-13:30, salida 12:00 | NO crear pausa (salida < inicio) |

### Solapamiento con pausas manuales

| Caso | Escenario | Esperado |
|------|-----------|----------|
| 4 | Pausa manual 13:00-14:00, automática 13:00-13:30 | NO crear automática |
| 5 | Pausa manual 12:00-12:30, automática 13:00-13:30 | SÍ crear automática |

### Idempotencia

| Caso | Escenario | Esperado |
|------|-----------|----------|
| 6 | Llamar processAutomaticBreaks dos veces | Solo crear una vez |
| 7 | Ya existe pausa automática para ese slot | NO crear duplicado |

---

## Orden de Implementación

| Paso | Descripción | Estado |
|------|-------------|--------|
| 1 | Schema + Migración | ✅ Completado |
| 2 | Tipos TypeScript | ✅ Completado |
| 3 | Schedule Engine | ✅ Completado |
| 4 | Lógica clockOut | ✅ Completado |
| 5 | Server actions horarios | ✅ Completado |
| 6 | UI Configuración | ✅ Completado |
| 7 | UI Visualización fichajes | ✅ Completado |
| 8 | UI Horario esperado | ✅ Completado |
| 9 | Pruebas manuales | ✅ Completado |

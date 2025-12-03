# Módulo de Turnos – Estado Actual

El cuadrante accesible en `http://localhost:3000/dashboard/shifts` ya opera sobre el backend real con planificación manual, plantillas reutilizables y vistas avanzadas. Este documento resume la funcionalidad disponible y cómo está organizada la solución.

---

## 🚀 Capacidades Clave

- **Calendarios interactivos**
  - Semana/Mes por empleado con drag & drop, estadísticas de horas y estados (borrador/publicado/conflicto).
  - Vista por áreas con cobertura por franja, alertas visuales y acciones rápidas para asignar personal.
- **Planificación manual**
  - Creación/edición de turnos con validación básica de datos y pre-relleno desde el calendario.
  - Reasignación, copia y redimensionado de turnos directamente en el cuadrante.
- **Plantillas reutilizables**
  - CRUD completo de patrones (ej. M→T→N→Descanso) mediante el nuevo `TemplateDialog`.
  - Aplicación masiva (`TemplateApplyDialog`) con preview de turnos y selección múltiple de empleados.
- **Operaciones masivas**
  - Copiar semana anterior, publicar borradores y eliminación múltiple de turnos.
- **Configuración multicentro**
  - Gestión de zonas, cobertura requerida y filtros por centro/área.

---

## 🧱 Arquitectura

| Capa | Descripción |
|------|-------------|
| Server Actions (`src/server/actions/schedules-v2.ts`) | Gestionan `ManualShiftAssignment`, plantillas manuales, copy/publish y zonas sobre Prisma. |
| Servicio (`_lib/shift-service.ts`) | Traductor entre Prisma y la UI. Convierten modelos en `Shift`, aplican mapeos de estado y normalizan fechas. |
| Store (`_store/shifts-store.tsx`) | Estado centralizado con Zustand (turnos, filtros, empleados, plantillas y modales). |
| UI (`_components`) | Calendarios, diálogos y tablas desacoplados, listos para evolucionar (drag & drop con `@dnd-kit`). |

### Modelos implicados
- `ManualShiftAssignment`: turno planificado con overrides y estado (`DRAFT/PUBLISHED/CONFLICT`).
- `ManualShiftTemplate`: patrón secuencial de turnos para aplicar sobre un rango.
- `WorkZone`: zonas dentro de un centro con cobertura esperada.

---

## 🔁 Flujos Principales

1. **Crear/editar turno**
   - `ShiftDialog` → `createShift`/`updateShift` → Server Action `createManualShiftAssignment`.
2. **Arrastrar o copiar turno**
   - `CalendarWeek*` → `moveShift`/`copyShift` → `updateManualShiftAssignment` / `createManualShiftAssignment`.
3. **Aplicar plantilla**
   - `TemplatesTable` → `TemplateApplyDialog` → `applyManualShiftTemplate` y re-fetch automático.
4. **Publicar semana**
   - `PublishBar` → `publishManualShiftAssignments` → recarga del cuadrante + toast.
5. **Configurar zonas**
   - `ZonesTable` + `ZoneDialog` → `createWorkZone`/`updateWorkZone`.

---

## ✅ Checklist

| Categoría | Estado |
|-----------|--------|
| Core + servicio | ✅ Integrados con Server Actions reales. |
| Calendarios (empleados/áreas) | ✅ Drag & drop, heatmap y estadísticas. |
| Diálogos (turnos, plantillas, aplicar) | ✅ Formularios RHF + Zod, con estados de carga. |
| TemplatesTable + duplicado | ✅ Abre diálogos y soporta duplicación con un clic. |
| PublishBar / WeekNavigator / Filtros | ✅ Operativos con toasts y re-fetch automático. |
| Configuración de zonas | ✅ Tabla + modal con cobertura requerida. |

---

## 📂 Archivos Relevantes

- `_lib/shift-service.ts`: adapta todas las server actions a los tipos UI (`Shift`, `ShiftTemplate`, etc.).
- `_store/shifts-store.tsx`: estado global (turnos, plantillas, empleados) y operaciones masivas.
- `_components/*`: calendarios, diálogos y tablas del módulo.
- `PROGRESS.md`: cronología y próximos hitos.
- `TURNOS_UI_PLAN.md`: visión de UX a medio plazo (drag & drop avanzado, cobertura, etc.).

---

## 🔎 Próximos pasos sugeridos

1. Incorporar validaciones avanzadas (descansos mínimos, conflictos multi-zona, ausencias aprobadas).
2. Métricas adicionales (bolsa de horas, cobertura semanal agregada, comparativas vs presupuesto).
3. Automatizaciones (rotaciones matemáticas, notificaciones automáticas al publicar turnos).
4. Tests E2E específicos para drag & drop y aplicación de plantillas.

---

**Última actualización:** ver `PROGRESS.md` para el changelog detallado.

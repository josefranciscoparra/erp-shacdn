# PLAN: Sistema de Horarios Flexible v2.0

**Fecha:** 2025-11-19
**Estado:** ✅ COMPLETADO - Sistema de Excepciones con Edición Completa
**Versión:** 2.0
**Tipo:** Migración Breaking Change

---

## ⚠️ REGLAS CRÍTICAS DE ESTE DOCUMENTO

> **Este documento contiene SOLO el plan general, roadmap y seguimiento de progreso.**
>
> **❌ NO incluir aquí:**
>
> - Detalles técnicos de implementación (modelos, código, algoritmos)
> - Especificaciones de componentes UI
> - Documentación de server actions o funciones
> - Cualquier información técnica profunda
>
> **✅ Para contenido técnico:**
>
> - **Consultar los documentos especializados** listados en "Documentos Relacionados" abajo
> - **Si no existe documento para el tema:** Crear nuevo documento especializado
> - **Mantener este documento ligero y navegable** (~400 líneas máximo)

---

## 📚 Documentos Relacionados

Este documento es el **plan maestro** que coordina toda la documentación del Sistema de Horarios V2.0:

### Documentación Técnica Especializada

- **[ARQUITECTURA_HORARIOS_V2.md](./ARQUITECTURA_HORARIOS_V2.md)** - Modelo de datos Prisma y arquitectura del sistema
- **[MOTOR_CALCULO_HORARIOS.md](./MOTOR_CALCULO_HORARIOS.md)** - Motor de cálculo y lógica de prioridades
- **[SERVER_ACTIONS_HORARIOS.md](./SERVER_ACTIONS_HORARIOS.md)** - Server actions y APIs
- **[GUIA_UI_HORARIOS.md](./GUIA_UI_HORARIOS.md)** - Componentes UI y flujos de usuario
- **[VALIDACIONES_Y_CONFIGURACION.md](./VALIDACIONES_Y_CONFIGURACION.md)** - Sistema de validaciones configurables
- **[METRICAS_Y_REPORTES.md](./METRICAS_Y_REPORTES.md)** - Métricas, alertas e importación/exportación
- **[MIGRACION_DATOS_V1_V2.md](./MIGRACION_DATOS_V1_V2.md)** - Script de migración de datos (opcional)
- **[SEEDS_Y_EJEMPLOS_HORARIOS.md](./SEEDS_Y_EJEMPLOS_HORARIOS.md)** - Seeds y ejemplos de configuración

### Subsistemas Relacionados

- **[PLAN_VACACIONES_GRANULARES_V2.md](./PLAN_VACACIONES_GRANULARES_V2.md)** - Sistema de ausencias y vacaciones en minutos
- **[PLAN_EXCEPCIONES_HORARIOS.md](./PLAN_EXCEPCIONES_HORARIOS.md)** - Sistema de excepciones de horarios (festivos, jornadas especiales)

---

## 🎯 Objetivo

Crear un sistema de horarios completamente nuevo, desacoplado y flexible que soporte:

- ✅ **Sector privado y público** - Funcionarios, policía, bomberos
- ✅ **Periodos especiales** - Semana Santa, verano, Navidad
- ✅ **Turnos rotativos** - Patrones 24x72, 6x6, etc.
- ✅ **Precisión de minutos** - Horarios tipo 9:12, 12:48
- ✅ **Franjas flexibles** - Sector público con entrada/salida flexible
- ✅ **Excepciones globales** - Festivos, jornadas especiales, eventos
- ✅ **Total flexibilidad** - Preparado para futuros casos de uso

### Problemas del Sistema V1 (Deprecado)

- **Acoplamiento excesivo**: 100+ campos de horarios en `EmploymentContract`
- **Inflexibilidad**: No soporta rotaciones (policía, bomberos)
- **Limitaciones**: Solo 2 periodos (REGULAR + INTENSIVE)
- **Repetición**: Campos duplicados para cada día de la semana
- **Mantenimiento**: Cambiar un horario requiere modificar múltiples campos

---

## 🏗️ Arquitectura del Sistema V2.0

Para detalles técnicos completos, consultar **[ARQUITECTURA_HORARIOS_V2.md](./ARQUITECTURA_HORARIOS_V2.md)**

### Modelos Principales

- **`ScheduleTemplate`** - Plantilla de horario reutilizable
- **`SchedulePeriod`** - Periodos temporales (REGULAR, INTENSIVE, SPECIAL)
- **`WorkDayPattern`** - Patrón de días de semana
- **`TimeSlot`** - Franjas horarias en minutos (0-1440)
- **`ShiftRotationPattern`** - Patrones de rotación (bomberos, policía)
- **`EmployeeScheduleAssignment`** - Asignación empleado ↔ plantilla
- **`ExceptionDayOverride`** - Excepciones globales y específicas

### Tipos de Horario Soportados

- **FIXED** - Horario fijo (oficina, tienda)
- **SHIFT** - Turno (mañana, tarde, noche)
- **ROTATION** - Rotación (policía 6x6, bomberos 24x72)
- **FLEXIBLE** - Flexible (teletrabajo, autónomos)

---

## 🚀 Orden de Ejecución Recomendado

### Sprint 1: Fundamentos ✅ COMPLETADO

**Ver detalles técnicos:** [ARQUITECTURA_HORARIOS_V2.md](./ARQUITECTURA_HORARIOS_V2.md) + [MOTOR_CALCULO_HORARIOS.md](./MOTOR_CALCULO_HORARIOS.md)

1. ✅ **FASE 1: Modelo de Datos Prisma**
   - Creación de todos los modelos nuevos (`ScheduleTemplate`, `SchedulePeriod`, `WorkDayPattern`, `TimeSlot`, etc.)
   - Eliminación de 100+ campos obsoletos de `EmploymentContract`
   - Actualización de `Employee` y `Organization`
   - Migración: `npx prisma migrate dev --name add_flexible_schedule_system_v2`

2. ✅ **FASE 2: Motor de Cálculo (`schedule-engine.ts`)**
   - Implementación de `getEffectiveSchedule()` - Calcula horario efectivo de un empleado
   - Lógica de prioridades: Absence > Exception > Period > Template
   - Soporte para rotaciones genéricas
   - Tests unitarios

### Sprint 2: UI Básica ✅ COMPLETADO

**Ver detalles técnicos:** [SERVER_ACTIONS_HORARIOS.md](./SERVER_ACTIONS_HORARIOS.md) + [GUIA_UI_HORARIOS.md](./GUIA_UI_HORARIOS.md)

3. ✅ **FASE 3: Server Actions**
   - CRUD completo de `ScheduleTemplate`
   - CRUD de `SchedulePeriod`
   - Gestión de `WorkDayPattern` + `TimeSlot`
   - Gestión de rotaciones (`ShiftRotationPattern`)
   - Archivo: `/src/server/actions/schedules-v2.ts`

4. ✅ **FASE 4: UI CRUD de Plantillas**
   - Página principal: `/dashboard/schedules`
   - Wizard de creación de plantillas
   - Editor visual de tramos horarios
   - Preview de horario semanal
   - Gestión de excepciones globales

### Sprint 3: Asignación y Fichaje ✅ COMPLETADO

**Ver detalles técnicos:** [GUIA_UI_HORARIOS.md](./GUIA_UI_HORARIOS.md)

5. ✅ **FASE 5: Asignación a Empleados**
   - Página: `/dashboard/employees/[id]/schedules`
   - Dialog de asignación de plantillas
   - Histórico de horarios con fechas de vigencia
   - Filtrado de plantillas disponibles

6. ✅ **FASE 6: Integración con Fichaje**
   - Página: `/dashboard/me/clock`
   - Componente `TodaySchedule` - Muestra horario esperado del día
   - Componente `TodaySummary` - Resumen con desviaciones
   - Actualización de `WorkdaySummary` con `expectedMinutes` y `deviationMinutes`
   - Cálculo automático de desviaciones al fichar

### Sprint 4: Validaciones y Métricas ⚠️ PARCIALMENTE COMPLETADO

**Ver detalles técnicos:** [VALIDACIONES_Y_CONFIGURACION.md](./VALIDACIONES_Y_CONFIGURACION.md)

7. ✅ **FASE 6.5: Sistema de Validaciones Configurables** (COMPLETADO 2025-11-18)
   - Configuración por organización en `/dashboard/settings` (tab "Fichajes")
   - Parámetros configurables:
     - Tolerancia de entrada/salida (minutos)
     - Días no laborables (sábados, domingos, ambos)
     - Validación de horario (ON/OFF)
     - Validación de ubicación GPS (ON/OFF)
   - Integración con motor de validación (`validateTimeEntry()`)
   - Visualización de warnings/errors en UI con badges
   - Campos añadidos a `TimeEntry`: `validationStatus`, `validationWarnings`, `validationErrors`

8. ⚠️ **FASE 7: Métricas y Avisos** (PENDIENTE)
   - Archivo pendiente: `/src/lib/schedule-metrics.ts`
   - Dashboard de alertas: `/dashboard/schedule-alerts`
   - Métricas de cumplimiento de horario
   - Alertas automáticas para RRHH

9. ⚠️ **FASE 8: Importación/Exportación** (PENDIENTE)
   - Importación masiva desde CSV/Excel
   - Exportación legal (PDF/Excel con formatos oficiales)
   - Ver: [METRICAS_Y_REPORTES.md](./METRICAS_Y_REPORTES.md)

### Sprint 5: Finalización ⚠️ PARCIALMENTE COMPLETADO

**Ver detalles técnicos:** [MIGRACION_DATOS_V1_V2.md](./MIGRACION_DATOS_V1_V2.md) + [SEEDS_Y_EJEMPLOS_HORARIOS.md](./SEEDS_Y_EJEMPLOS_HORARIOS.md)

10. ⚠️ **FASE 9: Migración de Datos** (OPCIONAL - NO EJECUTADA)
    - Script de migración v1 → v2 disponible pero no ejecutado
    - Decisión: Empezar de cero sin migrar datos históricos
    - Ver documentación si se decide migrar en el futuro

11. ✅ **FASE 10: Documentación y Seeds**
    - Documentación completa en 8 archivos especializados
    - Seeds de plantillas de ejemplo en `/prisma/seeds/`
    - Testing manual completo
    - Reorganización de documentación (2025-11-18)

---

## ✅ ESTADO DE IMPLEMENTACIÓN

### Completado (Fases 1-6.5)

**Sprint 1: Fundamentos ✅**

- ✅ Modelo de datos Prisma completo (8 modelos principales)
- ✅ Motor de cálculo `schedule-engine.ts` con soporte para rotaciones
- ✅ Lógica de prioridades: Absence > Exception > Period > Template

**Sprint 2: UI Básica ✅**

- ✅ Server actions completas (`/src/server/actions/schedules-v2.ts`)
- ✅ UI CRUD de plantillas (`/dashboard/schedules`)
- ✅ Wizard de creación con preview visual
- ✅ Gestión de excepciones globales con scopes (global, departamento, centro, plantilla, empleado)

**Sprint 3: Asignación y Fichaje ✅**

- ✅ Asignación de empleados (`/dashboard/employees/[id]/schedules`)
- ✅ Integración con fichaje diario (`/dashboard/me/clock`)
- ✅ Visualización de horario esperado (`TodaySchedule`)
- ✅ Resumen con desviaciones (`TodaySummary`)
- ✅ Migración de calendario mensual a Schedule V2.0

**Sprint 4: Validaciones ✅**

- ✅ Sistema de validaciones configurables (FASE 6.5)
- ✅ Configuración en `/dashboard/settings`
- ✅ Badges de validación en UI
- ✅ Integración con motor de validación

### Pendiente (Fases 7-8)

**Sprint 4: Métricas ⚠️**

- ❌ Métricas y alertas automáticas (FASE 7)
- ❌ Dashboard de cumplimiento de horario
- ❌ Reportes de desviaciones

**Sprint 4: Import/Export ⚠️**

- ❌ Importación masiva CSV/Excel (FASE 8)
- ❌ Exportación legal PDF/Excel

### Archivos Clave Implementados

**Rutas:**

- `/src/app/(main)/dashboard/schedules/page.tsx` - Listado de plantillas
- `/src/app/(main)/dashboard/schedules/[id]/page.tsx` - Detalle de plantilla
- `/src/app/(main)/dashboard/schedules/new/page.tsx` - Creación de plantilla
- `/src/app/(main)/dashboard/employees/[id]/schedules/page.tsx` - Asignación a empleado
- `/src/app/(main)/dashboard/me/clock/page.tsx` - Fichaje con horarios V2.0

**Server Actions:**

- `/src/server/actions/schedules-v2.ts` - CRUD completo de plantillas
- `/src/server/actions/employee-schedule.ts` - `getTodaySchedule()`, `getTodaySummary()`
- `/src/server/actions/time-tracking.ts` - Cálculo de desviaciones
- `/src/server/actions/time-clock-validations.ts` - Configuración de validaciones

**Motor y Helpers:**

- `/src/lib/schedule-engine.ts` - Motor de cálculo de horarios efectivos (541 líneas)
- `/src/lib/schedule-helpers.ts` - Utilidades de cálculo
- `/src/types/schedule.ts` - Definiciones de tipos TypeScript

**Componentes UI:**

- `/src/app/(main)/dashboard/me/clock/_components/today-schedule.tsx` - Horario esperado
- `/src/app/(main)/dashboard/me/clock/_components/today-summary.tsx` - Resumen con desviaciones
- `/src/app/(main)/dashboard/settings/_components/time-clock-validations-tab.tsx` - Configuración validaciones

---

## ✅ Checklist de Validación

**Cumplimiento de requisitos:**

- ✅ **Migración breaking**: Sistema completamente nuevo, campos antiguos eliminados
- ✅ **Flexibilidad total**: Soporta cualquier caso de uso futuro
- ✅ **Sector privado**: Horarios fijos, turnos, flexible
- ✅ **Sector público**: Franjas MANDATORY + FLEXIBLE, funcionarios
- ✅ **Periodos especiales**: REGULAR, INTENSIVE (verano), SPECIAL (Semana Santa, Navidad)
- ✅ **Turnos rotativos**: ShiftRotationPattern para policía (6x6), bomberos (24x72)
- ✅ **Precisión de minutos**: TimeSlot usa minutos (0-1440), soporta 9:12, 12:48, etc.
- ✅ **Excepciones globales**: Sistema completo integrado con motor de cálculo
- ✅ **Validaciones configurables**: Sistema de tolerancias y avisos
- ✅ **Integración con fichajes**: Cálculo automático de desviaciones
- ✅ **Documentación completa**: 8 documentos especializados + plan maestro
- ⚠️ **Métricas y alertas**: Pendiente de implementación
- ⚠️ **Importación/Exportación**: Pendiente de implementación

---

## 🔄 Plan de Rollback

**En caso de necesitar volver atrás:**

### Pasos de Reversión

1. **Código fuente**: Checkout al tag `v1-before-schedules-v2` (creado antes de empezar)
2. **Base de datos**: Restaurar backup `erp_dev_backup_YYYYMMDD.sql`
3. **Schema Prisma**: `npx prisma db push` para sincronizar schema antiguo
4. **Rebuild**: `rm -rf .next && npm run dev`

### Comandos de Rollback

```bash
# 1. Restaurar código
git checkout v1-before-schedules-v2

# 2. Restaurar base de datos
psql -U erp_user -d erp_dev < backups/erp_dev_backup_20251117.sql

# 3. Sincronizar Prisma
npx prisma db push

# 4. Rebuild aplicación
rm -rf .next && npm run dev
```

### Notas Importantes

- **Backup automático**: Crear backup ANTES de cualquier migración importante
- **Testing**: Probar rollback en entorno de desarrollo antes de producción
- **Datos**: El rollback restaurará datos al estado del backup (se perderán cambios posteriores)

---

## 📝 Próximos Pasos

### 🔴 Alta Prioridad - Inmediato

1. **Validación avanzada de fichajes**
   - Alertas cuando fichaje está fuera de horario
   - Marcado de desviaciones importantes (>15 min tarde/temprano)
   - Notificaciones a RRHH

2. **Vista de horario personal**
   - Página `/dashboard/me/schedule` para empleados
   - Visualización de horario asignado (semanal/mensual)
   - Histórico de cambios de horario

### 🟡 Media Prioridad

3. **Métricas y Dashboard de Alertas** (FASE 7)
   - Implementar `schedule-metrics.ts`
   - Dashboard `/dashboard/schedule-alerts`
   - Reportes de cumplimiento de horario
   - Ver: [METRICAS_Y_REPORTES.md](./METRICAS_Y_REPORTES.md)

4. **Importación/Exportación** (FASE 8)
   - Importación masiva desde CSV/Excel
   - Exportación legal (PDF/Excel)
   - Wizard de importación
   - Ver: [METRICAS_Y_REPORTES.md](./METRICAS_Y_REPORTES.md)

5. **Integración con Wizard de Empleados**
   - Selector de plantilla en `/dashboard/employees/new`
   - Asignación automática al crear empleado
   - Validación de horarios en creación

### 🟢 Baja Prioridad - Futuro

6. **Funcionalidades avanzadas**
   - Plantillas compartidas entre organizaciones
   - Importar/exportar plantillas individuales
   - Duplicar plantillas existentes
   - Templates predefinidos por sector (retail, hostelería, oficina, etc.)

7. **Integración con Nómina**
   - Cálculo de horas extras basado en horarios
   - Exportación para sistemas de nómina externos
   - Reportes mensuales de cumplimiento

---

## 🎯 Decisiones Técnicas Clave

Para documentación técnica detallada, consultar archivos especializados.

### Diseño del Sistema

1. **Minutos vs HH:mm** - Usar minutos (0-1440) facilita cálculos (suma, resta, comparaciones)
2. **Multi-tenancy** - Todos los modelos tienen `orgId` con cascade delete
3. **Prioridades de horario** - Sistema de capas: Absence > Exception > Period > Template
4. **Rotaciones genéricas** - Soporte para cualquier patrón de rotación (no solo policía/bomberos)

### Implementación

5. **Serialización de Decimals** - SIEMPRE convertir a `number` antes de pasar a cliente
6. **Server Actions** - Parámetros primitivos individuales (no objetos complejos)
7. **Auto-inferencia** - `assignmentType` se deduce automáticamente de `templateType`
8. **Filtrado dinámico** - Empleados disponibles excluyen ya asignados en fecha

### UI/UX

9. **Preview visual** - Mostrar horario semanal en wizard de creación
10. **Estados vacíos** - Mensajes claros cuando no hay horario configurado
11. **Badges de validación** - Visualización clara de warnings/errors en fichajes
12. **Responsive** - Tabs en desktop, Select en móvil para mejor UX

---

**Versión:** 2.0
**Última actualización:** 2025-11-19
**Autor:** Sistema de Planificación ERP TimeNow

**Cambios en esta versión:**

- ✅ Reorganización completa del documento maestro
- ✅ Separación de detalles técnicos en 8 documentos especializados
- ✅ Documento maestro ligero y navegable (<350 líneas)
- ✅ Enlaces a documentación técnica detallada
- ✅ Estado de implementación actualizado
- ✅ Roadmap claro con referencias a documentos especializados

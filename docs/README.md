# Documentación del ERP

Índice de toda la documentación del proyecto.

---

## General

Documentación general del proyecto en [`/docs/general/`](./general/):

- [TECHNICAL.md](./general/TECHNICAL.md) - Documentación técnica completa
- [RESUMEN_ERP.md](./general/RESUMEN_ERP.md) - Resumen del sistema ERP
- [STYLE_GUIDE.md](./general/STYLE_GUIDE.md) - Guía de estilos de código
- [DEPLOY.md](./general/DEPLOY.md) - Instrucciones de despliegue
- [RENDER_SETUP.md](./general/RENDER_SETUP.md) - Configuración de Render
- [README-DB.md](./general/README-DB.md) - Documentación de base de datos
- [errores.md](./general/errores.md) - Errores conocidos

---

## Arquitectura

- [ARQUITECTURA_HORARIOS_V2.md](./ARQUITECTURA_HORARIOS_V2.md) - Arquitectura del sistema de horarios V2
- [ARQUITECTURA_APROBACIONES.md](./ARQUITECTURA_APROBACIONES.md) - Sistema de aprobaciones
- [SISTEMA_PERMISOS_Y_AMBITOS.md](./SISTEMA_PERMISOS_Y_AMBITOS.md) - Permisos y ámbitos
- [MODULARIZACION.md](./MODULARIZACION.md) - Estructura modular

---

## Planes de Implementación

- [PLAN_REORGANIZACION.md](./PLAN_REORGANIZACION.md) - **Plan actual de reorganización**
- [PLAN_MIGRACION_HORARIOS_V2.md](./PLAN_MIGRACION_HORARIOS_V2.md) - Migración a horarios V2
- [PLAN_BALANCE_MINUTOS.md](./PLAN_BALANCE_MINUTOS.md) - Balance de minutos
- [PLAN_EXCEPCIONES_HORARIOS.md](./PLAN_EXCEPCIONES_HORARIOS.md) - Excepciones de horarios
- [PLAN_VACACIONES_GRANULARES_V2.md](./PLAN_VACACIONES_GRANULARES_V2.md) - Vacaciones granulares
- [PLAN_ARQUITECTURA_ALERTAS_Y_PERMISOS_V2.md](./PLAN_ARQUITECTURA_ALERTAS_Y_PERMISOS_V2.md) - Alertas y permisos V2
- [PLAN_GASTOS.md](./PLAN_GASTOS.md) - Sistema de gastos
- [PLAN_HORARIOS_COMPLETO.md](./PLAN_HORARIOS_COMPLETO.md) - Horarios completo
- [PLAN_ROBUSTEZ_FICHAJES.md](./PLAN_ROBUSTEZ_FICHAJES.md) - Robustez de fichajes
- [PLAN_REFACTORING_SCHEDULE_ENGINE.md](./PLAN_REFACTORING_SCHEDULE_ENGINE.md) - Refactoring del engine
- [PLAN_INTEGRACION_DIAS_LABORABLES_ADMIN.md](./PLAN_INTEGRACION_DIAS_LABORABLES_ADMIN.md) - Días laborables
- [ORDEN-IMPLEMENTACION.md](./ORDEN-IMPLEMENTACION.md) - Orden de implementación

---

## Módulos y Features

### Horarios
- [MOTOR_CALCULO_HORARIOS.md](./MOTOR_CALCULO_HORARIOS.md) - Motor de cálculo
- [SERVER_ACTIONS_HORARIOS.md](./SERVER_ACTIONS_HORARIOS.md) - Server actions
- [GUIA_UI_HORARIOS.md](./GUIA_UI_HORARIOS.md) - Guía de UI
- [SEEDS_Y_EJEMPLOS_HORARIOS.md](./SEEDS_Y_EJEMPLOS_HORARIOS.md) - Seeds y ejemplos
- [VALIDACIONES_Y_CONFIGURACION.md](./VALIDACIONES_Y_CONFIGURACION.md) - Validaciones
- [sistema-horarios-mejorado.md](./sistema-horarios-mejorado.md) - Sistema mejorado
- [SCHEDULE_MIGRATION_PLAN.md](./SCHEDULE_MIGRATION_PLAN.md) - Plan de migración
- [MIGRACION_DATOS_V1_V2.md](./MIGRACION_DATOS_V1_V2.md) - Migración de datos

### Fichajes
- [FICHAJES_LARGA_DURACION.md](./FICHAJES_LARGA_DURACION.md) - Fichajes de larga duración
- [GEOLOCATION_FEATURE.md](./GEOLOCATION_FEATURE.md) - Geolocalización
- [VALIDACION_DIAS_LABORABLES.md](./VALIDACION_DIAS_LABORABLES.md) - Validación de días laborables

### Alertas
- [SISTEMA_ALERTAS_FICHAJES.md](./SISTEMA_ALERTAS_FICHAJES.md) - Sistema de alertas
- [PLAN_ALERTAS_V2.md](./PLAN_ALERTAS_V2.md) - Alertas V2
- [REGLAS_NEGOCIO_RESPONSABLES_ALERTAS.md](./REGLAS_NEGOCIO_RESPONSABLES_ALERTAS.md) - Reglas de negocio

### Responsables
- [SISTEMA_RESPONSABLES_Y_ALERTAS_IMPLEMENTACION.md](./SISTEMA_RESPONSABLES_Y_ALERTAS_IMPLEMENTACION.md) - Implementación
- [IMPLEMENTACION_RESPONSABLES_FASE1_Y_FASE2.md](./IMPLEMENTACION_RESPONSABLES_FASE1_Y_FASE2.md) - Fases 1 y 2
- [IMPLEMENTACION_RESPONSABLES_FASE3.md](./IMPLEMENTACION_RESPONSABLES_FASE3.md) - Fase 3
- [IMPLEMENTACION_RESPONSABLES_FASE3_UI.md](./IMPLEMENTACION_RESPONSABLES_FASE3_UI.md) - Fase 3 UI

### Chat
- [CHAT_MODULE.md](./CHAT_MODULE.md) - Módulo de chat
- [CHAT_SETUP.md](./CHAT_SETUP.md) - Configuración
- [chat-realtime-architecture.md](./chat-realtime-architecture.md) - Arquitectura realtime

### UI
- [FORM_DESIGN_SYSTEM.md](./FORM_DESIGN_SYSTEM.md) - Sistema de diseño de formularios
- [UI-MEJORAS-ANIMACIONES.md](./UI-MEJORAS-ANIMACIONES.md) - Mejoras y animaciones
- [ui-cuadrante.md](./ui-cuadrante.md) - UI del cuadrante
- [ui-dashboard-redesign.md](./ui-dashboard-redesign.md) - Rediseño del dashboard
- [SAFARI_COMPATIBILITY.md](./SAFARI_COMPATIBILITY.md) - Compatibilidad Safari

### Otros
- [OPTIMISTIC_UPDATES.md](./OPTIMISTIC_UPDATES.md) - Updates optimistas
- [user-management-implementation.md](./user-management-implementation.md) - Gestión de usuarios
- [PRISMA_TROUBLESHOOTING.md](./PRISMA_TROUBLESHOOTING.md) - Troubleshooting Prisma
- [GEMINI.md](./GEMINI.md) - Integración Gemini

---

## Por Feature

Documentación específica por feature en [`/docs/features/`](./features/):

- [`/features/shifts/`](./features/shifts/) - Turnos
- [`/features/signatures/`](./features/signatures/) - Firmas digitales
- [`/features/calendars/`](./features/calendars/) - Calendarios

---

## Subdirectorios

- [`/bolsa_de_horas/`](./bolsa_de_horas/) - Bolsa de horas
- [`/equipos/`](./equipos/) - Equipos
- [`/gastos/`](./gastos/) - Gastos

---

## Legacy

Documentación antigua en [`/docs/legacy/`](./legacy/):

> Documentación histórica movida desde `/doc/`. Puede estar desactualizada.

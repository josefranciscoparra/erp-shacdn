# Hub de Aprobaciones

## Qué es y para qué sirve

El **Hub de Aprobaciones** es el centro neurálgico de TimeNow para gestionar todas las solicitudes que requieren validación antes de ser procesadas. Es el punto de control donde los responsables revisan y toman decisiones sobre:

- **Solicitudes de tiempo libre (PTO)**: Vacaciones, bajas, permisos personales
- **Correcciones de fichajes**: Ajustes manuales de entradas y salidas
- **Solicitudes de gastos**: Reembolsos y facturas de empleados
- **Alertas de incumplimiento**: Notificaciones de reglas no cumplidas

## Quién puede usarlo

- **Managers directos**: Aprueban solicitudes de sus empleados directos
- **Responsables de equipo**: Aprueban solicitudes del equipo asignado
- **Responsables de departamento**: Aprueban solicitudes del departamento
- **Administradores RRHH**: Aprueban todas las solicitudes (fallback)

---

## Flujos principales

### 1) Ver solicitudes pendientes

**Ubicación**: `/dashboard/approvals`

1. Accede al Hub de Aprobaciones desde el menú principal
2. Verás todas las solicitudes pendientes organizadas por tipo
3. Filtra por organización (si tienes acceso a múltiples)
4. Estadísticas de resumen: Pendientes, Aprobadas, Rechazadas

**Información visible en cada solicitud:**
- Nombre y foto del empleado
- Tipo de solicitud (PTO, Gasto, Corrección de fichaje)
- Fecha relevante o rango de fechas
- Resumen (ej: "Vacaciones (5 días)")
- Estado actual
- Fecha de creación

### 2) Aprobar/rechazar PTO

**Para aprobar:**
1. Haz clic en la solicitud de PTO
2. Revisa: Fechas, Días laborales, Tipo de ausencia, Razón
3. Haz clic en "Aprobar"
4. (Opcional) Añade comentarios
5. Se notifica al empleado automáticamente

**Para rechazar:**
1. Abre la solicitud de PTO
2. Haz clic en "Rechazar"
3. Escribe el motivo (obligatorio)
4. Confirma y se notifica al empleado

### 3) Aprobar/rechazar gastos

**Para aprobar:**
1. Navega a la sección de Gastos
2. Revisa detalles: Importe, Categoría, Documento adjunto
3. Haz clic en "Aprobar"

**Flujo de aprobaciones en cascada:**
- Los gastos pueden requerir múltiples aprobadores
- Cada nivel debe aprobar antes del siguiente

### 4) Aprobar correcciones de fichajes

1. Ve a "Correcciones de fichajes"
2. Revisa: Fecha, Hora entrada/salida propuestas, Motivo
3. Verifica coherencia con horario del empleado
4. Haz clic en "Aprobar" o "Rechazar"

---

## Pantallas y campos

### Dashboard de aprobaciones

**Tarjetas de Estadísticas:**
- Pendientes, Aprobadas mes, Rechazadas

**Tabs de estado:**
- Activas, Resueltas, Descartadas

**Tabla de solicitudes:**
- Empleado, Tipo, Detalle, Acciones

---

## Preguntas frecuentes

**P: ¿Cómo sé si tengo solicitudes para aprobar?**
R: La tarjeta de "Aprobaciones pendientes" te muestra el número total.

**P: ¿Qué pasa si rechazo una solicitud?**
R: El empleado recibe notificación con el motivo y puede modificar y reenviar.

**P: ¿Qué ocurre si hay conflictos en las fechas de PTO?**
R: Solicitudes de alta prioridad (baja por enfermedad) pueden reemplazar las de baja prioridad (vacaciones).

**P: ¿Puedo ver el historial de aprobaciones que he hecho?**
R: Sí, en el Hub hay pestaña "Historial" con todas tus decisiones.

---

## Checklist de soporte

**Acceso y permisos:**
- [ ] Usuario es aprobador configurado
- [ ] Tiene permiso APPROVE_PTO_REQUESTS o similar
- [ ] Está activo en la organización

**Visualización de solicitudes:**
- [ ] Ve solicitudes pendientes
- [ ] Puede filtrar por tipo y estado

**Flujo de PTO:**
- [ ] Puede aprobar/rechazar solicitudes
- [ ] Balance se actualiza tras aprobar

---

**Última revisión**: 2025-12-27
**Owner interno**: TimeNow Team

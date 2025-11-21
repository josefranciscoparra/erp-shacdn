# Plan de Mejoras Estratégicas: Sistema de Aprobaciones y Alertas
**Fecha:** 21 de Noviembre de 2025
**Estado:** Propuesta / Roadmap

Este documento recoge las recomendaciones estratégicas para evolucionar el sistema de Aprobaciones unificado y el motor de Alertas, llevándolo de un sistema funcional a una solución de nivel "Enterprise".

---

## 1. Unificación Total: Integración de Gastos (`Expenses`)
**Prioridad:** Alta
**Impacto:** UX/Consistencia

### El Problema
Actualmente, `/dashboard/approvals` gestiona centralizadamente `PTO` (Vacaciones) y `MANUAL_TIME_ENTRY` (Fichajes). Los Gastos (`Expenses`) siguen usando lógica y vistas heredadas, obligando al manager a visitar múltiples secciones.

### Solución Técnica
Integrar los gastos en el `ApprovalEngine` y en la UI unificada.

**Pasos de Implementación:**
1.  **Backend (`approval-engine.ts`):**
    *   Añadir `EXPENSE` al tipo `ApprovalRequestType`.
    *   Implementar la lógica de búsqueda de aprobadores para gastos (si difiere de la jerarquía estándar, aunque suele ser Manager/CostCenter).
2.  **Server Actions (`approvals.ts`):**
    *   En `getMyApprovals`, añadir la query a `prisma.expense` (filtrando por estado pendiente).
    *   Mapear los gastos al tipo `PendingApprovalItem`.
    *   Implementar `approveRequest` y `rejectRequest` para el tipo `EXPENSE`.
3.  **Frontend (`ApprovalsTable` / `Dialog`):**
    *   Ya está preparado para recibir el tipo `EXPENSE` (iconos y badges existen).
    *   Añadir el renderizado de detalles específicos de gastos (monto, categoría, adjunto) en `ApprovalDialog`.

---

## 2. Aprobaciones Masivas (Bulk Actions) 🚀
**Prioridad:** Media-Alta
**Impacto:** Eficiencia Administrativa

### El Problema
Los managers con equipos grandes pueden acumular muchas solicitudes (ej: correcciones de fichajes a fin de mes). Aprobar una por una es tedioso y lento.

### Solución Técnica
Permitir la selección múltiple en la tabla de aprobaciones.

**Pasos de Implementación:**
1.  **UI (`ApprovalsTable`):**
    *   Habilitar la selección de filas (row selection) en `TanStack Table`.
    *   Añadir una columna de checkboxes.
    *   Mostrar una "Barra de Acción Flotante" cuando hay items seleccionados: "Aprobar (5) seleccionados".
2.  **Backend:**
    *   Crear acción `bulkApproveRequests(items: { id: string, type: string }[])`.
    *   Ejecutar las aprobaciones en una transacción de Prisma (`prisma.$transaction`) o en paralelo con `Promise.all` para asegurar consistencia.

---

## 3. Alertas Accionables (Actionable Alerts)
**Prioridad:** Media
**Impacto:** Proactividad

### El Problema
Las alertas actuales son informativas ("Fichaje incompleto"). El manager ve la alerta, pero debe navegar a otro lado o contactar al empleado para solucionarlo.

### Solución Técnica
Convertir la alerta en un disparador de soluciones.

**Pasos de Implementación:**
1.  **Modelo de Datos:**
    *   Añadir campo `suggestedAction` o `actionUrl` al modelo `Alert`.
2.  **Lógica de Negocio (`alert-engine.ts`):**
    *   Al detectar "Ausencia injustificada", generar una acción sugerida: "Solicitar justificación".
    *   Al detectar "Fichaje sin salida", generar acción: "Cerrar fichaje".
3.  **UI:**
    *   En el listado de alertas, añadir botón de acción rápida (ej: un botón pequeño "Solucionar" que abra un modal contextual).

---

## 4. Digest Diario vs. Notificación Inmediata
**Prioridad:** Baja (Calidad de Vida)
**Impacto:** Reducción de ruido (Alert Fatigue)

### El Problema
En organizaciones grandes, las notificaciones en tiempo real pueden saturar a los managers y administradores, haciendo que ignoren avisos importantes.

### Solución Técnica
Agrupar notificaciones no críticas en un resumen diario.

**Pasos de Implementación:**
1.  **Preferencias de Usuario:**
    *   Añadir configuración: `notificationFrequency: "INSTANT" | "DAILY_DIGEST"`.
2.  **Cola de Notificaciones:**
    *   En lugar de enviar el email inmediatamente, guardar en una tabla `PendingEmails`.
3.  **Cron Job (Vercel Cron):**
    *   Ejecutar un job diario (ej: 08:00 AM).
    *   Agrupar pendientes por usuario.
    *   Generar un email HTML: "Resumen diario: Tienes 3 vacaciones por aprobar y 2 alertas de fichaje".

---

## 5. Línea de Tiempo de Auditoría Visual
**Prioridad:** Baja (Polished UI)
**Impacto:** Transparencia

### El Problema
Actualmente solo vemos el estado final ("Aprobado por X"). No vemos el ciclo completo de vida de la solicitud de forma visual.

### Solución Técnica
Mostrar un timeline vertical en el detalle de la solicitud.

**Pasos de Implementación:**
1.  **Frontend (`ApprovalDialog`):**
    *   Componente visual (timeline) con pasos:
        *   ⭕ Solicitado (Fecha/Hora - Empleado)
        *   👀 Visto (Fecha/Hora - Opcional si implementamos tracking de lectura)
        *   ✅/❌ Resuelto (Fecha/Hora - Aprobador - Comentario)
2.  **Backend:**
    *   Asegurar que `createdAt`, `approvedAt`, `rejectedAt` se envían correctamente.
    *   (Futuro) Si hay múltiples niveles de aprobación, esto será imprescindible.

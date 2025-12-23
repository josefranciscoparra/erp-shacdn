# Mejora 7: Firma Masiva y Doble Firma

## Resumen

Sistema completo de firma masiva de documentos con soporte para doble firma secuencial (empleado + manager/HR).

**Funcionalidades principales:**

- Crear lotes de firma para múltiples destinatarios
- Doble firma configurable (Manager, HR o usuario específico)
- Recordatorios automáticos in-app
- Dashboard de seguimiento con estadísticas
- Vista de auditoría con timeline de eventos
- Documentos firmados accesibles desde expediente del empleado

---

## Decisiones de Diseño

| Aspecto               | Decisión                                                |
| --------------------- | ------------------------------------------------------- |
| **Segundo firmante**  | Configurable: Manager, HR o usuario específico          |
| **Recordatorios**     | Solo notificación in-app (sin emails)                   |
| **Permisos creación** | Solo HR/Admin pueden crear lotes                        |
| **Repositorio docs**  | Mostrar en expediente SIN duplicar archivo (referencia) |
| **Modo de firma**     | Solo secuencial (no paralelo en esta versión)           |
| **Manager faltante**  | Flag `secondSignerMissing` para corrección manual en UI |

---

## Arquitectura

### Modelos de Prisma

```prisma
enum SignatureBatchStatus {
  DRAFT       // Configurando, sin SignatureRequest creadas
  ACTIVE      // SignatureRequest creadas y en curso
  COMPLETED   // Todos firmaron o cerrado manualmente
  CANCELLED   // Cancelado por HR/Admin
  EXPIRED     // expiresAt alcanzado
}

enum SecondSignerRole {
  MANAGER         // Manager directo del empleado
  HR              // Cualquier usuario con rol HR
  SPECIFIC_USER   // Usuario específico (secondSignerUserId)
}

model SignatureBatch {
  id                     String   @id @default(cuid())
  name                   String
  description            String?
  status                 SignatureBatchStatus @default(DRAFT)

  documentId             String
  document               SignableDocument @relation(...)

  requireDoubleSignature Boolean @default(false)
  secondSignerRole       SecondSignerRole?
  secondSignerUserId     String?

  expiresAt              DateTime
  reminderDays           Int[]   @default([7, 3, 1])
  lastReminderAt         DateTime?

  totalRecipients        Int     @default(0)
  signedCount            Int     @default(0)
  pendingCount           Int     @default(0)
  rejectedCount          Int     @default(0)

  createdAt              DateTime @default(now())
  createdById            String
  orgId                  String

  requests               SignatureRequest[]

  @@index([orgId, status])
}

// Modificación a SignatureRequest existente
model SignatureRequest {
  // ... campos existentes ...
  batchId              String?
  batch                SignatureBatch? @relation(...)
  secondSignerMissing  Boolean @default(false)
}
```

### Reglas de Negocio

**Ciclo de vida del lote:**

- `DRAFT` → `ACTIVE`: Al confirmar y crear SignatureRequests
- `ACTIVE` → `COMPLETED`: Todos firmaron o cierre manual
- `ACTIVE` → `CANCELLED`: HR/Admin cancela
- `ACTIVE` → `EXPIRED`: Cron detecta expiresAt alcanzado

**Doble firma secuencial:**

- Signer[0]: empleado (order = 1) → Notificación inmediata
- Signer[1]: segundo firmante (order = 2) → Solo puede firmar cuando [0] complete

**Resolución del segundo firmante:**

- `MANAGER`: Buscar manager directo → Si no existe: `secondSignerMissing = true`
- `HR`: Usuario con rol HR de la org
- `SPECIFIC_USER`: Usar `secondSignerUserId` (validar misma org)

---

## Navegación

```
/dashboard/signatures                    # Vista principal (existente)
/dashboard/signatures/batches            # Lista de lotes (NUEVO)
/dashboard/signatures/batches/[id]       # Detalle de lote (NUEVO)
/dashboard/signatures/[id]               # Detalle solicitud (existente)
/dashboard/signatures/[id]/audit         # Auditoría (NUEVO)
/dashboard/me/signatures                 # Mis firmas (existente)
```

---

## TODOs por Fase

### Fase 0: Preparación

- [x] Crear rama `feature/mejora-07-firma-masiva-doble-firma`
- [x] Crear documento del plan `/docs/PLAN_MEJORA_07_FIRMA_MASIVA.md`

### Fase 1: Base de Datos

- [x] Crear enum `SignatureBatchStatus`
- [x] Crear enum `SecondSignerRole`
- [x] Crear modelo `SignatureBatch`
- [x] Agregar `batchId` a `SignatureRequest`
- [x] Agregar `secondSignerMissing` a `SignatureRequest`
- [x] Agregar `SIGNATURE_REMINDER` al enum de notificaciones
- [x] Sincronizar DB con `prisma db push`

### Fase 2: Server Actions

- [x] Crear `/src/server/actions/signature-batch.ts`
- [x] Crear `/src/lib/validations/signature-batch.ts`
- [x] Crear `/src/lib/signatures/double-signature.ts`
- [x] Implementar `createSignatureBatch()`
- [x] Implementar `activateBatch()`
- [x] Implementar `getBatchStats()`
- [x] Implementar `listBatches()`
- [x] Implementar `cancelBatch()`
- [x] Implementar `resendBatchReminders()`
- [x] Implementar `resolveSecondSigner()`

### Fase 3: UI Creación de Lote

- [x] Crear `/src/app/(main)/dashboard/signatures/_components/create-batch-dialog.tsx`
- [x] Paso 1: Selección de documento
- [x] Paso 2: Selección de destinatarios (Todos | Por Dpto | Manual)
- [x] Paso 3: Configuración de doble firma
- [x] Paso 4: Fecha expiración y recordatorios
- [x] Paso 5: Resumen y confirmación
- [x] Contador "Se crearán X solicitudes"

### Fase 4: Dashboard de Lotes

- [x] Crear `/src/app/(main)/dashboard/signatures/batches/page.tsx`
- [x] Crear `/src/app/(main)/dashboard/signatures/batches/[id]/page.tsx`
- [x] Crear `_components/batch-stats-cards.tsx`
- [x] Crear `_components/batch-recipients-table.tsx`
- [x] Crear `_components/batch-status-badge.tsx`
- [x] DataTable con progreso, badge estado, acciones
- [x] Filtros por estado
- [x] Detalle con cards de estadísticas
- [x] Tabla de destinatarios con estado individual
- [x] Flag visual para `secondSignerMissing`
- [x] Botones: Cancelar, Reenviar recordatorios, Exportar

### Fase 5: Sistema de Recordatorios (TODO - Pospuesto)

- [ ] Crear `/src/server/actions/signature-reminders.ts`
- [ ] Crear `/src/app/api/cron/signature-reminders/route.ts`
- [ ] Lógica de cron (solo lotes ACTIVE)
- [ ] Calcular días restantes vs reminderDays
- [ ] Control de duplicados (lastReminderAt)
- [ ] Crear notificación SIGNATURE_REMINDER
- [ ] Proteger endpoint con secret header
  > **Nota**: Esta fase se implementará en una iteración futura.

### Fase 6: Vista de Auditoría

- [x] Crear `/src/app/(main)/dashboard/signatures/[id]/audit/page.tsx`
- [x] Crear `_components/audit-timeline.tsx`
- [x] Timeline: creación, envíos, consentimientos, firmas, rechazos, recordatorios
- [x] Detalles técnicos (hashes, IP, User Agent)
- [x] Exportación JSON de evidencia
- [x] Enlace a PDF firmado

### Fase 7: Documentos en Expediente

- [x] Crear `/src/server/actions/employee-signatures.ts`
- [x] Implementar `getEmployeeSignedDocuments()`
- [x] Crear componente `employee-signed-documents.tsx`
- [x] Nueva sección "Documentos Firmados" en expediente empleado
- [x] Enlace a detalle de solicitud
- [x] Descarga directa sin duplicar archivo

### Fase 8: Permisos y Visibilidad

- [x] Validar permisos HR/Admin en creación de lotes
- [x] Validar permisos HR/Admin en vista de lotes
- [x] Empleados solo ven sus SignatureRequest
- [x] Empleados no ven vista de lotes
- [x] Documentos firmados visibles en expediente propio

---

## Checklist de Validación Final

- [ ] SignatureBatch con todos los estados funcionales
- [ ] Doble firma secuencial funcionando
- [ ] Resolución de segundo firmante con flag `secondSignerMissing`
- [ ] Cron de recordatorios sin duplicados
- [ ] UI de wizard con contador de solicitudes
- [ ] Dashboard de lotes con progreso visual
- [ ] Vista de auditoría con timeline completo
- [ ] Documentos firmados en expediente (sin duplicar)
- [ ] Permisos HR/Admin validados
- [ ] Empleados solo ven sus firmas

---

## Archivos Críticos Existentes

- `/prisma/schema.prisma` - Modelos actuales de firma
- `/src/server/actions/signatures-v2.ts` - Server actions de firmas
- `/src/lib/signatures/notifications.ts` - Sistema de notificaciones
- `/src/components/signatures/` - Componentes UI reutilizables
- `/src/app/(main)/dashboard/signatures/` - Páginas actuales
- `/src/stores/signatures-store.tsx` - Estado Zustand

---

## Historial de Cambios

| Fecha      | Cambio                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------- |
| 2024-12-08 | Creación del plan                                                                            |
| 2024-12-08 | Fase 1 completada: Schema de Prisma actualizado con SignatureBatch                           |
| 2024-12-08 | Fase 2 completada: Server actions, validaciones y lógica de doble firma                      |
| 2024-12-08 | Fase 3 completada: UI wizard de creación de lote (5 pasos)                                   |
| 2024-12-08 | Fase 4 completada: Dashboard de lotes (página lista, detalle, componentes)                   |
| 2024-12-09 | Fase 6 completada: Vista de auditoría con timeline, evidencia y exportación JSON             |
| 2024-12-09 | Fase 7 completada: Documentos firmados en expediente del empleado                            |
| 2024-12-09 | Fase 8 completada: Permisos y visibilidad (roles correctos HR_ADMIN, ORG_ADMIN, SUPER_ADMIN) |

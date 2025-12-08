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

| Aspecto | Decisión |
|---------|----------|
| **Segundo firmante** | Configurable: Manager, HR o usuario específico |
| **Recordatorios** | Solo notificación in-app (sin emails) |
| **Permisos creación** | Solo HR/Admin pueden crear lotes |
| **Repositorio docs** | Mostrar en expediente SIN duplicar archivo (referencia) |
| **Modo de firma** | Solo secuencial (no paralelo en esta versión) |
| **Manager faltante** | Flag `secondSignerMissing` para corrección manual en UI |

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
- [ ] Crear enum `SignatureBatchStatus`
- [ ] Crear enum `SecondSignerRole`
- [ ] Crear modelo `SignatureBatch`
- [ ] Agregar `batchId` a `SignatureRequest`
- [ ] Agregar `secondSignerMissing` a `SignatureRequest`
- [ ] Agregar `SIGNATURE_REMINDER` al enum de notificaciones
- [ ] Ejecutar migración `add_signature_batch_system`

### Fase 2: Server Actions
- [ ] Crear `/src/server/actions/signature-batch.ts`
- [ ] Crear `/src/lib/validations/signature-batch.ts`
- [ ] Crear `/src/lib/signatures/double-signature.ts`
- [ ] Implementar `createSignatureBatch()`
- [ ] Implementar `activateBatch()`
- [ ] Implementar `getBatchStats()`
- [ ] Implementar `listBatches()`
- [ ] Implementar `cancelBatch()`
- [ ] Implementar `resendBatchReminders()`
- [ ] Implementar `resolveSecondSigner()`

### Fase 3: UI Creación de Lote
- [ ] Crear `/src/app/(main)/dashboard/signatures/_components/create-batch-dialog.tsx`
- [ ] Crear `/src/app/(main)/dashboard/signatures/_components/recipient-selector.tsx`
- [ ] Paso 1: Selección de documento
- [ ] Paso 2: Selección de destinatarios (Todos | Por Dpto | Por Rol | Manual)
- [ ] Paso 3: Configuración de doble firma
- [ ] Paso 4: Fecha expiración y recordatorios
- [ ] Paso 5: Resumen y confirmación
- [ ] Contador "Se crearán X solicitudes"

### Fase 4: Dashboard de Lotes
- [ ] Crear `/src/app/(main)/dashboard/signatures/batches/page.tsx`
- [ ] Crear `/src/app/(main)/dashboard/signatures/batches/[id]/page.tsx`
- [ ] Crear `_components/batch-stats-cards.tsx`
- [ ] Crear `_components/batch-recipients-table.tsx`
- [ ] Crear `_components/batch-status-badge.tsx`
- [ ] DataTable con progreso, badge estado, acciones
- [ ] Filtros por estado
- [ ] Detalle con cards de estadísticas
- [ ] Tabla de destinatarios con estado individual
- [ ] Flag visual para `secondSignerMissing`
- [ ] Botones: Cancelar, Reenviar recordatorios, Exportar

### Fase 5: Sistema de Recordatorios
- [ ] Crear `/src/server/actions/signature-reminders.ts`
- [ ] Crear `/src/app/api/cron/signature-reminders/route.ts`
- [ ] Lógica de cron (solo lotes ACTIVE)
- [ ] Calcular días restantes vs reminderDays
- [ ] Control de duplicados (lastReminderAt)
- [ ] Crear notificación SIGNATURE_REMINDER
- [ ] Proteger endpoint con secret header

### Fase 6: Vista de Auditoría
- [ ] Crear `/src/app/(main)/dashboard/signatures/[id]/audit/page.tsx`
- [ ] Crear `_components/audit-timeline.tsx`
- [ ] Timeline: creación, envíos, consentimientos, firmas, rechazos, recordatorios
- [ ] Detalles técnicos (hashes, IP, User Agent)
- [ ] Exportación JSON de evidencia
- [ ] Enlace a PDF firmado

### Fase 7: Documentos en Expediente
- [ ] Crear `/src/server/actions/employee-signatures.ts`
- [ ] Implementar `getEmployeeSignedDocuments()`
- [ ] Modificar `documents-tab.tsx`
- [ ] Nueva sección "Documentos Firmados"
- [ ] Enlace a detalle de solicitud
- [ ] Descarga directa sin duplicar archivo

### Fase 8: Permisos y Visibilidad
- [ ] Validar permisos HR/Admin en creación de lotes
- [ ] Validar permisos HR/Admin en vista de lotes
- [ ] Empleados solo ven sus SignatureRequest
- [ ] Empleados no ven vista de lotes
- [ ] Documentos firmados visibles en expediente propio

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

| Fecha | Cambio |
|-------|--------|
| 2024-12-08 | Creación del plan |

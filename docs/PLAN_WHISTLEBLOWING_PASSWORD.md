# Plan: Canal de Denuncias + Cambio de Contraseña

> **Documento de referencia** - Creado como parte del Sprint 0
> **Última actualización**: Diciembre 2024

## Resumen

Implementar dos funcionalidades:
1. **Canal de Denuncias** (Whistleblowing) - Conforme Ley 2/2023
2. **Cambio de Contraseña Voluntario** - En Mi Perfil

**Prioridad**: Canal de Denuncias primero (cumplimiento legal)

---

## Decisiones de Diseño

| Aspecto | Decisión |
|---------|----------|
| Anonimato | Ambos: empleados autenticados + portal público anónimo |
| Gestores | Permiso configurable `MANAGE_WHISTLEBLOWING` asignable a cualquier usuario |
| Prioridad | Denuncias primero, luego cambio de contraseña |

---

## IMPORTANTE: Alcance MVP vs Fase 2

### MVP (Sprint 1-3)
- 4 tablas: Category, Report, Document, Activity
- 4 estados: SUBMITTED, IN_REVIEW, RESOLVED, CLOSED
- Flujos básicos: crear, ver, filtrar, cambiar estado, adjuntar docs
- Sin chat bidireccional, sin emails automáticos

### Fase 2 (Futuro)
- WhistleblowingComment (tabla separada)
- Estados adicionales: DRAFT, ASSIGNED, REFERRED
- Notificaciones por email
- Chat con el denunciante

---

## PARTE 1: CANAL DE DENUNCIAS

### Fase 1.1: Modelos Prisma (MVP)

**Archivo**: `/prisma/schema.prisma`

```prisma
// ========== ENUMS ==========

enum ReporterType {
  EMPLOYEE   // Empleado autenticado
  EXTERNAL   // Proveedor/cliente sin cuenta
  ANONYMOUS  // Sin identificación
}

// MVP: Solo 4 estados
enum WhistleblowingStatus {
  SUBMITTED   // Enviada (estado inicial)
  IN_REVIEW   // En investigación
  RESOLVED    // Resuelta
  CLOSED      // Cerrada
}

enum WhistleblowingPriority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum ResolutionType {
  SUBSTANTIATED          // Fundada
  UNSUBSTANTIATED        // No fundada
  PARTIALLY_SUBSTANTIATED
  NO_ACTION              // Sin acción
}

// Tipos de actividad (incluye notas internas)
enum WhistleblowingActivityType {
  CREATED
  SUBMITTED
  ASSIGNED
  STATUS_CHANGED
  PRIORITY_CHANGED
  DOCUMENT_ADDED
  INTERNAL_NOTE      // Reemplaza a Comment en MVP
  RESOLVED
  CLOSED
}

// ========== MODELOS MVP (4 tablas) ==========

model WhistleblowingCategory {
  id              String   @id @default(cuid())
  name            String
  description     String?
  requiresEvidence Boolean @default(false)
  active          Boolean  @default(true)
  order           Int      @default(0)

  orgId           String
  organization    Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  reports         WhistleblowingReport[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([orgId])
  @@map("whistleblowing_categories")
}

model WhistleblowingReport {
  id              String   @id @default(cuid())

  // Tracking y acceso anónimo
  trackingCode    String   @unique  // WB-YYYYMMDD-XXXXX (visible al usuario)
  accessCodeHash  String?  // SOLO hash bcrypt, nunca el código en claro

  // Informante (simplificado)
  reporterType        ReporterType
  reporterDisplayLabel String?  // "Empleado interno", "Proveedor", "Anónimo"
  reporterMetadata    String?  @db.Text  // JSON cifrado (email, teléfono, etc.)

  // Contenido de la denuncia
  title               String
  description         String   @db.Text
  involvedParties     String?  @db.Text  // JSON cifrado
  incidentDate        DateTime?
  incidentLocation    String?

  // Estado y prioridad
  status          WhistleblowingStatus @default(SUBMITTED)
  priority        WhistleblowingPriority @default(MEDIUM)

  // Asignación (campo, no estado separado)
  assignedToId    String?
  assignedTo      User?    @relation("WhistleblowingAssignee", fields: [assignedToId], references: [id])
  assignedAt      DateTime?

  // Resolución
  resolution      String?  @db.Text
  resolutionType  ResolutionType?
  resolvedAt      DateTime?
  resolvedById    String?
  resolvedBy      User?    @relation("WhistleblowingResolver", fields: [resolvedById], references: [id])

  // Cierre
  closedAt        DateTime?
  closedById      String?
  closedBy        User?    @relation("WhistleblowingCloser", fields: [closedById], references: [id])

  // Timestamps
  submittedAt     DateTime @default(now())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relaciones
  categoryId      String
  category        WhistleblowingCategory @relation(fields: [categoryId], references: [id])
  employeeId      String?  // Solo si reporterType = EMPLOYEE
  employee        Employee? @relation(fields: [employeeId], references: [id])
  orgId           String
  organization    Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  documents       WhistleblowingDocument[]
  activities      WhistleblowingActivity[]

  @@index([orgId, status])
  @@index([trackingCode])
  @@index([assignedToId])
  @@map("whistleblowing_reports")
}

model WhistleblowingDocument {
  id          String   @id @default(cuid())

  reportId    String
  report      WhistleblowingReport @relation(fields: [reportId], references: [id], onDelete: Cascade)

  fileName    String
  filePath    String   // Ruta cifrada en storage
  fileSize    Int
  mimeType    String
  description String?

  uploadedById String?  // null si anónimo
  uploadedBy   User?    @relation(fields: [uploadedById], references: [id])
  uploadedAt   DateTime @default(now())

  @@index([reportId])
  @@map("whistleblowing_documents")
}

model WhistleblowingActivity {
  id            String   @id @default(cuid())

  reportId      String
  report        WhistleblowingReport @relation(fields: [reportId], references: [id], onDelete: Cascade)

  type          WhistleblowingActivityType
  description   String   @db.Text  // Para INTERNAL_NOTE, el contenido de la nota
  oldValue      String?  // Para cambios de estado/prioridad
  newValue      String?

  performedById String?  // null si acción anónima
  performedBy   User?    @relation(fields: [performedById], references: [id])
  performedAt   DateTime @default(now())
  ipAddress     String?  // Para auditoría de anónimos

  @@index([reportId])
  @@map("whistleblowing_activities")
}

// ========== EN ORGANIZATION, AGREGAR ==========
// whistleblowingEnabled       Boolean @default(false)
// whistleblowingPublicSlug    String? @unique  // Para URL pública
// whistleblowingManagerIds    String[] // IDs de usuarios gestores
```

**Migración**: `npx prisma migrate dev --name add_whistleblowing_system`

---

### Cifrado - Decisiones Explícitas

**Cifrar con `encryptField()`/`decryptField()`:**
- `involvedParties` (personas implicadas)
- `reporterMetadata` (datos de contacto opcionales)

**NO cifrar (para poder filtrar/indexar):**
- `title`
- `status`
- `priority`
- `trackingCode`
- `reporterType`
- `reporterDisplayLabel`

---

### Reglas de Visualización

**En UI de gestión (`/dashboard/whistleblowing`):**
- Si `reporterType = ANONYMOUS` → NO mostrar datos identificativos aunque exista `reporterMetadata`
- Mostrar solo `reporterDisplayLabel` ("Anónimo", "Empleado interno", etc.)

**En portal de seguimiento (`/whistleblowing/[orgSlug]/track`):**
- NUNCA mostrar: `assignedTo`, nombres de gestores, notas internas
- Solo mostrar: estado + mensajes genéricos ("En estudio", "Resuelta", etc.)

---

### Fase 1.2: Sistema de Permisos

**Nuevo permiso**: `MANAGE_WHISTLEBLOWING`

**Archivo a modificar**: `/src/lib/permissions.ts` (o donde estén definidos los permisos)

```typescript
// Agregar permiso
MANAGE_WHISTLEBLOWING: "manage_whistleblowing",

// Configuración en Organization
whistleblowingManagerIds: String[]  // IDs de usuarios con permiso
```

**Configuración en Settings**: Toggle en `/dashboard/settings` para:
- Activar/desactivar canal de denuncias
- Asignar gestores (multiselect de usuarios)
- Configurar categorías

---

### Fase 1.3: Server Actions (MVP)

**Archivo nuevo**: `/src/server/actions/whistleblowing.ts`

```typescript
// === ACCIONES PÚBLICAS ===
export async function createWhistleblowingReport(data)    // Empleado autenticado
export async function createAnonymousReport(orgSlug, data) // Portal público
export async function checkAnonymousReportStatus(trackingCode, accessCode)
export async function getWhistleblowingCategories(orgId?)
export async function uploadWhistleblowingDocument(reportId, formData)

// === ACCIONES DE GESTIÓN (requiere MANAGE_WHISTLEBLOWING) ===
export async function getWhistleblowingReports(filters?)
export async function getWhistleblowingReportDetail(reportId)
export async function assignReportManager(reportId, managerId)
export async function updateReportStatus(reportId, status)
export async function updateReportPriority(reportId, priority)
export async function resolveReport(reportId, resolutionType, resolution)
export async function closeReport(reportId)
export async function addInternalNote(reportId, content)  // Usa Activity con INTERNAL_NOTE
export async function getWhistleblowingStats()
```

**NO incluir en MVP:**
- `addReportComment()` → Usar `addInternalNote()` con Activity
- Chat bidireccional
- Emails automáticos

---

### Fase 1.4: Estructura de Páginas (MVP)

```
src/app/(main)/dashboard/whistleblowing/
├── page.tsx                    # Lista de denuncias (gestores)
├── [id]/
│   └── page.tsx               # Detalle de denuncia
├── new/
│   └── page.tsx               # Nueva denuncia (empleado)
└── _components/
    ├── whistleblowing-reports-table.tsx   # DataTable MVP
    ├── whistleblowing-report-detail.tsx
    ├── whistleblowing-form.tsx
    ├── whistleblowing-status-badge.tsx
    ├── whistleblowing-priority-badge.tsx
    ├── whistleblowing-timeline.tsx        # Usa Activity
    ├── whistleblowing-documents.tsx
    ├── assign-manager-dialog.tsx
    └── resolve-dialog.tsx

src/app/(external)/whistleblowing/[orgSlug]/
├── page.tsx                    # Portal público (info + link a form)
├── new/
│   └── page.tsx               # Formulario anónimo
└── track/
    └── page.tsx               # Consulta estado con código
```

**Fase 2 (no MVP):**
- `/categories/page.tsx` → Gestión de categorías (usar seed inicial)
- `whistleblowing-stats-cards.tsx`

---

### MVP Tabla - Columnas

| Columna | Campo |
|---------|-------|
| Código | `trackingCode` |
| Fecha | `submittedAt` |
| Categoría | `category.name` |
| Tipo | `reporterType` (badge: Interno/Anónimo/Externo) |
| Estado | `status` (badge coloreado) |
| Prioridad | `priority` (badge) |

**Fase 2:** Agregar "Gestor asignado" y "Última actividad"

---

### Fase 1.5: Sidebar

**Archivo**: `/src/navigation/sidebar/sidebar-items.ts`

```typescript
// En grupo "Gestión", agregar:
{
  title: "Canal de Denuncias",
  url: "/dashboard/whistleblowing",
  icon: Shield,  // o AlertTriangle
  isNew: true,
}
```

---

### Fase 1.6: Componentes Reutilizables

Reutilizar de PTO:
- `DocumentUploadZone` → Para evidencias
- `DocumentViewer` → Para ver documentos
- DataTable pattern → Para tabla de denuncias

---

## PARTE 2: CAMBIO DE CONTRASEÑA VOLUNTARIO

### Fase 2.1: PasswordPolicy (Interface)

**Archivo nuevo**: `/src/lib/password-policy.ts`

```typescript
// Interfaz preparada para futura configuración en Settings
export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSymbol: boolean;
}

// Defaults en código (no configurar en UI aún)
export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSymbol: true,
};

export function validatePassword(password: string, policy = DEFAULT_PASSWORD_POLICY): {
  valid: boolean;
  errors: string[];
} { ... }
```

---

### Fase 2.2: Server Action

**Archivo nuevo**: `/src/server/actions/change-password.ts`

```typescript
"use server";

export async function changePasswordVoluntary(
  currentPassword: string,
  newPassword: string,
  invalidateOtherSessions: boolean = true  // Por defecto cierra otras sesiones
): Promise<{ success: boolean; error?: string }> {
  // 1. Verificar autenticación
  // 2. Validar contraseña actual con bcrypt.compare()
  // 3. Verificar que nueva != actual
  // 4. Validar nueva contraseña contra PasswordPolicy
  // 5. Hash con bcrypt.hash(newPassword, 10)
  // 6. Actualizar en BD
  // 7. **Invalidar otras sesiones del usuario** (opcional pero recomendado)
  //    - Eliminar sesiones de BD donde sessionToken != current
  //    - O actualizar updatedAt para invalidar tokens JWT antiguos
  // 8. Return success
}
```

**Invalidación de sesiones:**
- Opción mínima: mantener sesión actual, cerrar las demás
- Implementar eliminando registros de Session donde `userId = currentUser.id` AND `id != currentSession.id`

---

### Fase 2.3: Componente UI

**Archivo nuevo**: `/src/app/(main)/dashboard/me/profile/_components/change-password-section.tsx`

Características:
- Card con título "Seguridad"
- Campos: contraseña actual, nueva, confirmar
- Toggle mostrar/ocultar contraseña (por campo)
- Indicador de fortaleza (Progress bar con colores)
- Checklist de requisitos basado en PasswordPolicy
- Checkbox "Cerrar sesión en otros dispositivos" (checked por defecto)
- Botón "Cambiar contraseña" con loading
- Toast de éxito + redirect a login si se invalidan sesiones

---

### Fase 2.4: Integración en Perfil

**Archivo a modificar**: `/src/app/(main)/dashboard/me/profile/_components/my-profile.tsx`

```tsx
// Agregar import
import { ChangePasswordSection } from "./change-password-section";

// Agregar al final del render:
<ChangePasswordSection />
```

---

## Archivos a Crear (MVP)

| Ruta | Propósito |
|------|-----------|
| `/src/server/actions/whistleblowing.ts` | Server actions canal denuncias |
| `/src/server/actions/change-password.ts` | Server action cambio contraseña |
| `/src/lib/password-policy.ts` | Interfaz PasswordPolicy con defaults |
| `/src/app/(main)/dashboard/whistleblowing/page.tsx` | Lista denuncias |
| `/src/app/(main)/dashboard/whistleblowing/[id]/page.tsx` | Detalle denuncia |
| `/src/app/(main)/dashboard/whistleblowing/new/page.tsx` | Nueva denuncia |
| `/src/app/(main)/dashboard/whistleblowing/_components/*.tsx` | ~9 componentes MVP |
| `/src/app/(external)/whistleblowing/[orgSlug]/page.tsx` | Portal público |
| `/src/app/(external)/whistleblowing/[orgSlug]/new/page.tsx` | Form anónimo |
| `/src/app/(external)/whistleblowing/[orgSlug]/track/page.tsx` | Seguimiento |
| `/src/app/(main)/dashboard/me/profile/_components/change-password-section.tsx` | UI cambio pwd |

## Archivos a Modificar

| Ruta | Cambio |
|------|--------|
| `/prisma/schema.prisma` | Agregar modelos whistleblowing (4 tablas) |
| `/src/navigation/sidebar/sidebar-items.ts` | Agregar enlace sidebar |
| `/src/app/(main)/dashboard/me/profile/_components/my-profile.tsx` | Agregar sección pwd |

**Fase 2 (no MVP):**
- `/src/app/(main)/dashboard/settings/_components/*` → Tab configuración denuncias
- `/src/app/(main)/dashboard/whistleblowing/categories/page.tsx` → Gestión categorías

---

## Orden de Implementación (MVP)

### Sprint 0: Documentación
1. **Crear `/docs/PLAN_WHISTLEBLOWING_PASSWORD.md`** - Copia de este plan como referencia permanente ✅

### Sprint 1: Base de Datos
1. Agregar enums y 4 modelos a schema.prisma
2. Crear migración: `npx prisma migrate dev --name add_whistleblowing_system`
3. Seed inicial con 3-4 categorías básicas

### Sprint 2: Server Actions Whistleblowing
1. Actions públicas: `createWhistleblowingReport`, `createAnonymousReport`, `checkAnonymousReportStatus`
2. Actions gestión: `getWhistleblowingReports`, `getWhistleblowingReportDetail`, `updateReportStatus`
3. `addInternalNote` usando Activity con tipo INTERNAL_NOTE

### Sprint 3: UI Gestión Interna
1. DataTable con 6 columnas MVP
2. Vista detalle con timeline (Activity)
3. Diálogos: asignar, resolver, cerrar

### Sprint 4: Portal Público + Formulario Empleado
1. Formulario empleados autenticados (`/whistleblowing/new`)
2. Portal público (`/whistleblowing/[orgSlug]`)
3. Página de seguimiento anónimo

### Sprint 5: Cambio de Contraseña
1. PasswordPolicy interface
2. Server action con invalidación de sesiones
3. Componente UI con indicador de fortaleza
4. Integración en Mi Perfil

---

## Instrucciones para Claude

```
IMPORTANTE: Céntrate en un MVP sencillo:

- Solo 4 estados de denuncia: SUBMITTED, IN_REVIEW, RESOLVED, CLOSED
- Usa WhistleblowingActivity como 'notas internas' (tipo INTERNAL_NOTE), NO crear tabla Comment
- accessCodeHash: NUNCA guardar el código en claro, solo el hash bcrypt
- Cifrar SOLO: involvedParties y reporterMetadata
- NO cifrar: title, status, priority, trackingCode (para filtros/índices)
- NO inventar chat bidireccional ni emails automáticos
- Tabla MVP solo 6 columnas: Código, Fecha, Categoría, Tipo, Estado, Prioridad
- En portal seguimiento: NUNCA mostrar gestor asignado ni notas internas
```

---

## Consideraciones de Seguridad

1. **Cifrado**: Solo `involvedParties` y `reporterMetadata` con `encryptField()`
2. **Anonimato**:
   - `trackingCode`: visible al usuario (WB-YYYYMMDD-XXXXX)
   - `accessCodeHash`: SOLO hash bcrypt, código original mostrado una vez
3. **Audit trail**: Toda acción registrada en `WhistleblowingActivity`
4. **Permisos**: Solo usuarios con `MANAGE_WHISTLEBLOWING` pueden gestionar
5. **Visualización**:
   - Anónimos: nunca mostrar metadata aunque exista
   - Portal seguimiento: solo estado + mensajes genéricos
6. **Contraseñas**: Invalidar otras sesiones tras cambio

---

## Contexto Legal: Ley 2/2023

### Requisitos Principales
- **Obligatorio para**: Empresas con 50+ empleados
- **Accesibilidad**: Empleados, clientes, proveedores
- **Confidencialidad**: Garantizada por ley
- **Sanciones**: Hasta 1.000.000€ por incumplimiento

### Materias Cubiertas
- Actos ilegales
- Mala praxis
- Violaciones regulatorias
- Fraudes
- Corrupción

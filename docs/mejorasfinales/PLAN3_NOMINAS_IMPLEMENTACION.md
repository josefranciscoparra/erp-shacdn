# Plan: Mejora 3 - Subida Masiva de Nóminas

## Estado: 🟡 En desarrollo

**Rama:** `feature/mejora-03-nominas-masivas`
**Documento de requisitos:** `docs/mejorasfinales/PLAN3_NOMINAS.md`

---

## Resumen Ejecutivo

Sistema para que RRHH pueda subir nóminas de forma masiva (ZIP con PDFs o PDF multipágina), con detección automática del empleado mediante OCR y asignación manual para casos no detectados.

---

## Decisiones Acordadas

### 1. OCR
- **Solución inicial:** Tesseract.js (local, sin coste)
- **Arquitectura:** Desacoplada (`ocr-engine.ts` con interfaz clara) para poder sustituir por Azure/Google en el futuro
- **Patrones:** Regex para DNI español y códigos internos en `config.ts`

### 2. Procesamiento
- **Modo:** Background (no bloquea UI)
- **Comportamiento:**
  - Al subir: crear `PayslipBatch` en estado `PROCESSING`
  - Proceso background actualiza contadores progresivamente
  - Usuario ve estado "Procesando nóminas..." con progreso
- **Razón:** Evitar timeouts con lotes grandes

### 3. Notificaciones
- **In-app:** Obligatoria ("Ya tienes disponible tu nómina de {mes}/{año}")
- **Email:** Opcional, configurable por organización

### 4. Límites
- **Máximo:** 500 documentos por lote (configurable en `config.ts`)
- **Validación:** Si ZIP excede límite → ERROR o procesar hasta límite

### 5. Navegación
- **RRHH/Admin:**
  - `/dashboard/payslips` → Listado de lotes
  - `/dashboard/payslips/upload` → Subida masiva
  - `/dashboard/payslips/[batchId]` → Revisión del lote
- **Empleados:**
  - `/dashboard/me/payslips` → "Mis nóminas"

### 6. Matching (Detección automática)
- **IMPORTANTE:** Los archivos PDF tienen el DNI en el nombre del archivo (ej: `12345678A_enero_2025.pdf`)
- **Prioridad:**
  1. **DNI en nombre de archivo** (regex en fileName) → 90%+ de casos
  2. OCR del contenido (fallback si no hay DNI en nombre)
  3. Nombre + Apellidos (fuzzy matching, último recurso)
- **Regex DNI español:** `/\b(\d{8}[A-Za-z])\b/`
- **Umbral:** Auto-asignar solo si `confidenceScore ≥ 0.8`
- **Múltiples matches:** Marcar como `PENDING` (nunca auto-asignar)

### 7. Seguridad
- **RRHH/Admin:** Gestión completa (subir, ver lotes, asignar)
- **Empleados:** Solo ver sus propias nóminas
- **APIs:** Validar permisos en preview/download

---

## Modelo de Datos

### PayslipBatch (Lote de subida)

```prisma
model PayslipBatch {
  id          String   @id @default(cuid())

  // Periodo de las nóminas
  month       Int?     // 1-12 (opcional si se usa periodo)
  year        Int?     // 2024, 2025...
  periodStart DateTime? // Opcional para periodos no mensuales
  periodEnd   DateTime? // Opcional para periodos no mensuales

  // Archivos originales
  originalFileName  String   // nombre.zip o nominas.pdf
  originalFileType  String   // "ZIP" | "PDF_MULTIPAGE"

  // Estadísticas del procesamiento
  totalFiles        Int      @default(0)
  assignedCount     Int      @default(0)
  pendingCount      Int      @default(0)
  errorCount        Int      @default(0)

  // Estado del lote
  status      PayslipBatchStatus @default(PROCESSING)

  // Auditoría
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Multi-tenancy
  orgId        String
  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  // Usuario que subió
  uploadedById String
  uploadedBy   User   @relation(fields: [uploadedById], references: [id])

  // Items del lote
  items PayslipUploadItem[]

  // Documentos generados
  documents EmployeeDocument[] @relation("PayslipBatchDocuments")

  @@index([orgId])
  @@index([year, month])
  @@index([status])
  @@map("payslip_batches")
}

enum PayslipBatchStatus {
  PROCESSING    // En proceso de extracción/OCR
  REVIEW        // Pendiente de revisión manual
  COMPLETED     // Todas las nóminas asignadas
  PARTIAL       // Parcialmente completado
  ERROR         // Error en procesamiento
}
```

### PayslipUploadItem (Item individual)

```prisma
model PayslipUploadItem {
  id          String   @id @default(cuid())

  // Referencia al lote
  batchId     String
  batch       PayslipBatch @relation(fields: [batchId], references: [id], onDelete: Cascade)

  // Archivo temporal
  tempFilePath    String   // Ruta temporal del PDF individual
  pageNumber      Int?     // Si viene de PDF multipágina

  // Detección automática (OCR)
  detectedDni       String?
  detectedName      String?
  detectedCode      String?
  confidenceScore   Float    @default(0)  // 0-1

  // Estado y errores
  status          PayslipItemStatus @default(PENDING)
  errorMessage    String?   // Para registrar fallos de OCR o matching

  // Empleado asignado
  employeeId      String?
  employee        Employee? @relation(fields: [employeeId], references: [id], onDelete: SetNull)

  // Documento final creado
  documentId      String?   @unique
  document        EmployeeDocument? @relation(fields: [documentId], references: [id], onDelete: SetNull)

  // Auditoría
  createdAt       DateTime @default(now())
  assignedAt      DateTime?
  assignedById    String?  // Usuario que asignó (null si automático)

  // Multi-tenancy
  orgId        String
  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@index([batchId])
  @@index([orgId])
  @@index([status])
  @@map("payslip_upload_items")
}

enum PayslipItemStatus {
  PENDING       // Pendiente de asignación
  ASSIGNED      // Asignado a un empleado
  ERROR         // Error en procesamiento
  SKIPPED       // Saltado/descartado manualmente
}
```

### Modificaciones a EmployeeDocument

```prisma
model EmployeeDocument {
  // ... campos existentes ...

  // Campos específicos para nóminas (kind = PAYSLIP)
  payslipMonth    Int?     // Mes de la nómina (1-12)
  payslipYear     Int?     // Año de la nómina

  // Trazabilidad con lote de subida masiva
  payslipBatchId  String?
  payslipBatch    PayslipBatch? @relation("PayslipBatchDocuments", fields: [payslipBatchId], references: [id])

  // Relación inversa con item
  payslipUploadItem PayslipUploadItem?

  @@index([kind, payslipYear, payslipMonth])
}
```

---

## Estructura de Archivos

```
src/
├── lib/
│   └── payslip/
│       ├── config.ts           # Constantes, regex DNI, límites
│       ├── zip-processor.ts    # Extraer archivos de ZIP
│       ├── pdf-splitter.ts     # Dividir PDF multipágina
│       ├── ocr-engine.ts       # Interfaz OCR (Tesseract.js)
│       └── employee-matcher.ts # Match DNI/nombre con BD
├── server/actions/
│   └── payslips.ts             # Server actions CRUD
├── app/
│   ├── api/payslips/
│   │   ├── upload/route.ts     # POST subida de archivo
│   │   ├── process/route.ts    # POST procesamiento background
│   │   └── items/[id]/
│   │       ├── preview/route.ts  # GET preview PDF
│   │       └── download/route.ts # GET descarga
│   └── (main)/dashboard/
│       ├── payslips/              # RRHH: gestión
│       │   ├── page.tsx           # Listado de lotes
│       │   ├── upload/page.tsx    # Subida masiva
│       │   ├── [batchId]/page.tsx # Revisión lote
│       │   └── _components/
│       │       ├── batch-list.tsx
│       │       ├── upload-zone.tsx
│       │       ├── review-table.tsx
│       │       ├── item-preview.tsx
│       │       └── employee-selector.tsx
│       └── me/payslips/           # Empleado: mis nóminas
│           ├── page.tsx
│           └── _components/
│               ├── payslip-list.tsx
│               └── payslip-viewer.tsx
└── navigation/
    └── sidebar-nav.tsx            # Añadir entrada "Nóminas"
```

---

## Dependencias NPM

```bash
npm install jszip tesseract.js pdf-lib pdfjs-dist
```

---

## Checkpoints de Implementación

### Checkpoint 1: Modelo de Datos ✅
- [x] Añadir enums `PayslipBatchStatus`, `PayslipItemStatus` a Prisma
- [x] Añadir modelo `PayslipBatch`
- [x] Añadir modelo `PayslipUploadItem`
- [x] Modificar `EmployeeDocument` (campos payslip)
- [x] Añadir relaciones en `Organization`, `User`, `Employee`
- [x] Ejecutar `npx prisma db push`
- [x] Crear archivo `src/lib/payslip/config.ts`
- [x] **COMMIT**: `feat(payslips): add data model for bulk payslip upload`

### Checkpoint 2: Procesamiento de Archivos ✅
- [x] Instalar dependencias: `jszip`, `pdf-lib`
- [x] Crear `src/lib/payslip/zip-processor.ts`
- [x] Crear `src/lib/payslip/pdf-splitter.ts`
- [ ] Tests unitarios de extracción (omitido - se probará en integración)
- [ ] **COMMIT**: `feat(payslips): add ZIP and PDF processing utilities`

### Checkpoint 3: OCR y Matching ✅
- [x] Instalar dependencia: `tesseract.js`
- [x] Crear `src/lib/payslip/ocr-engine.ts` (interfaz desacoplada)
- [x] Implementar detección DNI español (regex)
- [x] Crear `src/lib/payslip/employee-matcher.ts`
- [x] Implementar fuzzy matching para nombres
- [ ] Tests de detección (omitido - se probará en integración)
- [ ] **COMMIT**: `feat(payslips): add OCR engine and employee matching`

### Checkpoint 4: Server Actions y APIs ✅
- [x] Crear `src/server/actions/payslips.ts`:
  - `getPayslipBatches()`
  - `getBatchWithItems()`
  - `assignPayslipItem()`
  - `skipPayslipItem()`
  - `retryOcrItem()`
  - `getMyPayslips()`
  - `getMyPayslipYears()`
  - `searchEmployeesForPayslip()`
- [x] Crear API routes:
  - `/api/payslips/upload`
  - `/api/payslips/items/[id]/preview`
- [x] Validación de permisos en todas las rutas
- [x] **COMMIT**: `feat(payslips): add server actions and API routes`

### Checkpoint 5: UI Subida Masiva ✅
- [x] Crear página `/dashboard/payslips/page.tsx` (listado)
- [x] Crear página `/dashboard/payslips/upload/page.tsx`
- [x] Crear componente `upload-zone.tsx` (drag & drop) - integrado en upload/page.tsx
- [x] Crear componente `batch-list.tsx`
- [x] Selector de periodo (mes/año)
- [x] Indicador de progreso de procesamiento
- [x] Añadir entrada en navegación lateral
- [x] **COMMIT**: `feat(payslips): add bulk upload UI`

### Checkpoint 6: UI Revisión y Asignación ✅
- [x] Crear página `/dashboard/payslips/[batchId]/page.tsx`
- [x] Crear componente `review-table.tsx`
- [x] Crear componente `item-preview-dialog.tsx` (modal preview PDF)
- [x] Crear componente `employee-selector-dialog.tsx` (búsqueda)
- [x] Crear componente `batch-summary.tsx`
- [x] Acciones: Asignar, Saltar
- [x] Filtros por estado (PENDING, ASSIGNED, ERROR, SKIPPED)
- [x] **COMMIT**: `feat(payslips): add review and assignment UI`

### Checkpoint 7: Vista "Mis Nóminas"
- [ ] Crear página `/dashboard/me/payslips/page.tsx`
- [ ] Crear componente `payslip-list.tsx`
- [ ] Crear componente `payslip-viewer.tsx` (preview inline)
- [ ] Filtro por año
- [ ] Descarga de nóminas
- [ ] **COMMIT**: `feat(payslips): add employee payslips view`

### Checkpoint 8: Notificaciones y Finalización
- [ ] Crear notificación in-app al asignar nómina
- [ ] Configuración de email opcional (org settings)
- [ ] Envío de email con enlace a "Mis nóminas"
- [ ] Auditoría completa de acciones
- [ ] Tests E2E del flujo completo
- [ ] Actualizar PLAN_MAESTRO.md
- [ ] **COMMIT**: `feat(payslips): add notifications and complete implementation`

---

## Flujo de Estados

```
PayslipBatch:
  PROCESSING → REVIEW → COMPLETED
                     ↘ PARTIAL
            ↘ ERROR

PayslipUploadItem:
  PENDING → ASSIGNED
         ↘ SKIPPED
         ↘ ERROR
```

---

## Vista de Revisión (UI Reference)

```
┌─────────────────────────────────────────────────────────────────────┐
│ Lote: nominas_enero_2025.zip                                        │
│ Periodo: Enero 2025 | Total: 45 | Asignados: 40 | Pendientes: 3    │
├─────────────────────────────────────────────────────────────────────┤
│ [Tabs: Todos | Pendientes (3) | Asignados (40) | Errores (2)]      │
├─────────────────────────────────────────────────────────────────────┤
│ # │ DNI Detectado │ Nombre Detectado │ Empleado │ Estado │ Acciones│
├───┼───────────────┼──────────────────┼──────────┼────────┼─────────┤
│ 1 │ 12345678A     │ Juan García      │ ✓ Juan G.│ASSIGNED│ [Ver]   │
│ 2 │ 87654321B     │ María López      │ ✓ María L│ASSIGNED│ [Ver]   │
│ 3 │ ?             │ Pedro Sánchez    │ [Select] │PENDING │[Asignar]│
│ 4 │ ERROR         │ -                │ -        │ERROR   │[Reinten]│
└─────────────────────────────────────────────────────────────────────┘
```

---

## Notas de Implementación

1. **tempFilePath**: Nunca exponer en UI, solo uso interno
2. **Concurrencia**: Procesar items en batches de 10 para no saturar
3. **Cleanup**: Eliminar archivos temporales después de asignar
4. **Timeout OCR**: Máximo 30 segundos por página
5. **Preview**: Usar `pdfjs-dist` para renderizar en canvas

---

## Referencias

- Requisitos originales: `docs/mejorasfinales/PLAN3_NOMINAS.md`
- Sistema de storage: `src/lib/storage/`
- Modelo EmployeeDocument existente: `prisma/schema.prisma:623`
- Enum DocumentKind.PAYSLIP: `prisma/schema.prisma:655`

# 📋 Plan de Implementación: Módulo de Gestión de Gastos

**Proyecto:** TimeNow ERP
**Módulo:** Employee Expenses Management
**Fecha inicio:** 2025-11-02
**Estimación total:** 24-30 horas

---

## 📊 Estado General

- [ ] Fase 1: Base de Datos y Modelos Prisma (2-3h)
- [ ] Fase 2: API y Server Actions (4-5h)
- [ ] Fase 3: UI - Área de Empleado (6-8h)
- [ ] Fase 4: UI - Área de Administración (6-8h)
- [ ] Fase 5: OCR y Procesamiento de Tickets (4-5h)
- [ ] Fase 6: Validaciones y Notificaciones (2-3h)
- [ ] Fase 7: Navegación y Features Flag (1h)
- [ ] Fase 8: Documentación y README (1h)

**Progreso Total:** 0% (0/8 fases completadas)

---

## 🗂️ FASE 1: Base de Datos y Modelos Prisma (2-3h)

### 1.1 Añadir Enums y Modelos al Schema

**Archivo:** `prisma/schema.prisma`

- [ ] **1.1.1** Añadir enums al final del archivo:
  ```prisma
  enum ExpenseStatus {
    DRAFT          // Borrador (no enviado)
    SUBMITTED      // Enviado a aprobación
    APPROVED       // Aprobado por manager
    REJECTED       // Rechazado
    REIMBURSED     // Reembolsado
  }

  enum ExpenseCategory {
    FUEL           // Combustible
    MILEAGE        // Kilometraje
    MEAL           // Comidas
    TOLL           // Peajes
    PARKING        // Parking
    LODGING        // Alojamiento
    OTHER          // Otros
  }

  enum ApprovalDecision {
    PENDING        // Pendiente
    APPROVED       // Aprobado
    REJECTED       // Rechazado
  }
  ```

- [ ] **1.1.2** Añadir modelo `Expense`:
  ```prisma
  model Expense {
    id              String          @id @default(cuid())

    // Datos del gasto
    date            DateTime        // Fecha del gasto
    currency        String          @default("EUR")
    amount          Decimal         @db.Decimal(10, 2) // Importe base sin IVA
    vatPercent      Decimal?        @db.Decimal(5, 2)  // % IVA (ej: 21.00)
    totalAmount     Decimal         @db.Decimal(10, 2) // Total = amount + IVA
    category        ExpenseCategory

    // Kilometraje (solo si category = MILEAGE)
    mileageKm       Decimal?        @db.Decimal(10, 2)
    mileageRate     Decimal?        @db.Decimal(5, 3)  // €/km aplicado

    // Clasificación
    costCenterId    String?
    costCenter      CostCenter?     @relation(fields: [costCenterId], references: [id])

    // Notas y metadata
    notes           String?
    merchantName    String?         // Nombre del comercio (OCR)
    merchantVat     String?         // CIF/NIF del comercio (OCR)
    ocrRawData      Json?           // Datos brutos del OCR para auditoría

    // Estado
    status          ExpenseStatus   @default(DRAFT)

    // Auditoría
    createdBy       String
    creator         User            @relation("ExpenseCreator", fields: [createdBy], references: [id])
    updatedBy       String?
    createdAt       DateTime        @default(now())
    updatedAt       DateTime        @updatedAt

    // Multi-tenancy
    orgId           String
    organization    Organization    @relation(fields: [orgId], references: [id], onDelete: Cascade)

    // Empleado que crea el gasto
    employeeId      String
    employee        Employee        @relation(fields: [employeeId], references: [id], onDelete: Cascade)

    // Informe de gastos (opcional)
    reportId        String?
    report          ExpenseReport?  @relation(fields: [reportId], references: [id])

    // Relaciones
    attachments     ExpenseAttachment[]
    approvals       ExpenseApproval[]
    policySnapshot  PolicySnapshot?

    @@index([orgId])
    @@index([employeeId])
    @@index([status])
    @@index([category])
    @@index([date])
    @@index([reportId])
    @@map("expenses")
  }
  ```

- [ ] **1.1.3** Añadir modelo `ExpenseAttachment`:
  ```prisma
  model ExpenseAttachment {
    id          String   @id @default(cuid())
    url         String   // URL en storage
    fileName    String
    mimeType    String?
    fileSize    Int
    createdAt   DateTime @default(now())

    expenseId   String
    expense     Expense  @relation(fields: [expenseId], references: [id], onDelete: Cascade)

    @@index([expenseId])
    @@map("expense_attachments")
  }
  ```

- [ ] **1.1.4** Añadir modelo `ExpenseApproval`:
  ```prisma
  model ExpenseApproval {
    id              String            @id @default(cuid())
    decision        ApprovalDecision  @default(PENDING)
    comment         String?
    decidedAt       DateTime?
    level           Int               @default(1) // Nivel de aprobación (1, 2, 3...)

    approverId      String
    approver        User              @relation(fields: [approverId], references: [id])

    expenseId       String
    expense         Expense           @relation(fields: [expenseId], references: [id], onDelete: Cascade)

    @@index([expenseId])
    @@index([approverId])
    @@index([decision])
    @@map("expense_approvals")
  }
  ```

- [ ] **1.1.5** Añadir modelo `ExpenseReport`:
  ```prisma
  model ExpenseReport {
    id          String   @id @default(cuid())
    title       String
    description String?
    periodFrom  DateTime
    periodTo    DateTime
    status      String   @default("OPEN") // OPEN, SUBMITTED, APPROVED, REJECTED
    total       Decimal  @default(0) @db.Decimal(10, 2)

    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt

    // Multi-tenancy
    orgId       String
    organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

    // Propietario del informe
    ownerId     String
    owner       Employee @relation(fields: [ownerId], references: [id])

    // Gastos incluidos
    expenses    Expense[]

    @@index([orgId])
    @@index([ownerId])
    @@index([status])
    @@map("expense_reports")
  }
  ```

- [ ] **1.1.6** Añadir modelo `PolicySnapshot`:
  ```prisma
  model PolicySnapshot {
    id                      String   @id @default(cuid())
    mileageRateEurPerKm     Decimal? @db.Decimal(5, 3)
    mealDailyLimit          Decimal? @db.Decimal(10, 2)
    fuelRequiresReceipt     Boolean  @default(true)
    vatAllowed              Boolean  @default(true)
    costCenterRequired      Boolean  @default(false)

    expenseId               String   @unique
    expense                 Expense  @relation(fields: [expenseId], references: [id], onDelete: Cascade)

    @@map("policy_snapshots")
  }
  ```

- [ ] **1.1.7** Añadir modelo `ExpensePolicy`:
  ```prisma
  model ExpensePolicy {
    id                      String   @id @default(cuid())

    // Tarifas y límites
    mileageRateEurPerKm     Decimal  @default(0.26) @db.Decimal(5, 3)
    mealDailyLimit          Decimal? @db.Decimal(10, 2)
    lodgingDailyLimit       Decimal? @db.Decimal(10, 2)

    // Requisitos por categoría (JSON)
    // Formato: { FUEL: { requiresReceipt: true, vatAllowed: true }, ... }
    categoryRequirements    Json     @default("{}")

    // Configuración general
    attachmentRequired      Boolean  @default(true)
    costCenterRequired      Boolean  @default(false)
    vatAllowed              Boolean  @default(true)

    // Aprobación
    approvalLevels          Int      @default(1) // Niveles de aprobación (1, 2, 3)

    createdAt               DateTime @default(now())
    updatedAt               DateTime @updatedAt

    // Multi-tenancy (1:1 con Organization)
    orgId                   String   @unique
    organization            Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

    @@map("expense_policies")
  }
  ```

- [ ] **1.1.8** Actualizar modelo `Organization` (añadir relaciones):
  ```prisma
  // En model Organization, añadir:
  expenses          Expense[]
  expenseReports    ExpenseReport[]
  expensePolicy     ExpensePolicy?
  ```

- [ ] **1.1.9** Actualizar modelo `Employee` (añadir relaciones):
  ```prisma
  // En model Employee, añadir:
  expenses          Expense[]
  expenseReports    ExpenseReport[]
  ```

- [ ] **1.1.10** Actualizar modelo `User` (añadir relaciones):
  ```prisma
  // En model User, añadir:
  createdExpenses   Expense[]         @relation("ExpenseCreator")
  expenseApprovals  ExpenseApproval[]
  ```

- [ ] **1.1.11** Actualizar modelo `CostCenter` (añadir relación):
  ```prisma
  // En model CostCenter, añadir:
  expenses          Expense[]
  ```

- [ ] **1.1.12** Actualizar enum `PtoNotificationType` (añadir tipos):
  ```prisma
  // En enum PtoNotificationType, añadir:
  EXPENSE_SUBMITTED        // Nueva solicitud de gasto
  EXPENSE_APPROVED         // Gasto aprobado
  EXPENSE_REJECTED         // Gasto rechazado
  EXPENSE_REIMBURSED       // Gasto reembolsado
  ```

- [ ] **1.1.13** Actualizar modelo `PtoNotification` (añadir relación con gastos):
  ```prisma
  // En model PtoNotification, añadir:
  expenseId   String?
  expense     Expense? @relation(fields: [expenseId], references: [id], onDelete: Cascade)

  // Y añadir índice:
  @@index([expenseId])
  ```

- [ ] **1.1.14** Añadir relación a `Expense`:
  ```prisma
  // En model Expense, añadir:
  notifications   PtoNotification[]
  ```

### 1.2 Crear Migración

- [ ] **1.2.1** Ejecutar comando de migración:
  ```bash
  npx prisma migrate dev --name add_expense_management_module
  ```

- [ ] **1.2.2** Verificar que se creó `prisma/migrations/[timestamp]_add_expense_management_module/`

- [ ] **1.2.3** Verificar que `migration.sql` contiene todas las tablas

### 1.3 Seed de Políticas por Defecto

- [ ] **1.3.1** Añadir al final de `prisma/seed.ts`:
  ```typescript
  console.log("🏢 Creando políticas de gastos por defecto...");

  const organizations = await prisma.organization.findMany();

  for (const org of organizations) {
    await prisma.expensePolicy.upsert({
      where: { orgId: org.id },
      update: {},
      create: {
        orgId: org.id,
        mileageRateEurPerKm: 0.26,
        mealDailyLimit: 30.00,
        lodgingDailyLimit: 100.00,
        categoryRequirements: {
          FUEL: { requiresReceipt: true, vatAllowed: true },
          MILEAGE: { requiresReceipt: false, vatAllowed: false },
          MEAL: { requiresReceipt: true, vatAllowed: true },
          TOLL: { requiresReceipt: true, vatAllowed: true },
          PARKING: { requiresReceipt: false, vatAllowed: true },
          LODGING: { requiresReceipt: true, vatAllowed: true },
          OTHER: { requiresReceipt: true, vatAllowed: true },
        },
        attachmentRequired: true,
        costCenterRequired: false,
        vatAllowed: true,
        approvalLevels: 1,
      },
    });
  }

  console.log("✅ Políticas de gastos creadas");
  ```

- [ ] **1.3.2** Ejecutar seed:
  ```bash
  npx prisma db seed
  ```

- [ ] **1.3.3** Verificar en base de datos que se crearon las políticas

---

## 🔌 FASE 2: API y Server Actions (4-5h)

### 2.1 Server Actions - Gastos Básicos

**Crear:** `src/server/actions/expenses.ts`

- [ ] **2.1.1** Crear estructura base del archivo con imports
- [ ] **2.1.2** Implementar `getMyExpenses(filters?)`:
  - Obtener gastos del empleado autenticado
  - Filtros: status, category, dateFrom, dateTo, costCenterId
  - Incluir attachments, approvals
  - Ordenar por fecha desc
- [ ] **2.1.3** Implementar `getExpenseById(id)`:
  - Validar permisos (solo owner o aprobador)
  - Incluir todas las relaciones
- [ ] **2.1.4** Implementar `createExpense(data)`:
  - Validar con Zod
  - Crear en estado DRAFT
  - Obtener política actual y crear snapshot
  - Si category = MILEAGE, calcular totalAmount = km × rate
  - Si no, calcular totalAmount = amount + (amount × vatPercent)
- [ ] **2.1.5** Implementar `updateExpense(id, data)`:
  - Solo permitir si status = DRAFT
  - Recalcular totalAmount
- [ ] **2.1.6** Implementar `deleteExpense(id)`:
  - Solo permitir si status = DRAFT
  - Eliminar attachments del storage
- [ ] **2.1.7** Implementar `submitExpense(id)`:
  - Validar que tenga attachments (si policy requiere)
  - Cambiar status a SUBMITTED
  - Obtener manager del empleado
  - Crear ExpenseApproval (level 1, PENDING)
  - Crear notificación para manager

### 2.2 Server Actions - Aprobaciones

**Crear:** `src/server/actions/expense-approvals.ts`

- [ ] **2.2.1** Crear estructura base del archivo
- [ ] **2.2.2** Implementar `getPendingApprovals(filters?)`:
  - Obtener gastos con status = SUBMITTED
  - Donde approverId = usuario actual
  - Filtros: employeeId, category, dateFrom, dateTo
  - Incluir employee, attachments
- [ ] **2.2.3** Implementar `approveExpense(id, comment?)`:
  - Validar permisos (solo aprobador asignado)
  - Actualizar ExpenseApproval: decision = APPROVED, decidedAt
  - Cambiar Expense.status a APPROVED
  - Crear notificación para empleado
- [ ] **2.2.4** Implementar `rejectExpense(id, reason)`:
  - Validar permisos
  - Actualizar ExpenseApproval: decision = REJECTED, comment, decidedAt
  - Cambiar Expense.status a REJECTED
  - Crear notificación para empleado
- [ ] **2.2.5** Implementar `getApprovalStats()`:
  - Total pendientes
  - Total aprobados este mes
  - Total rechazados este mes

### 2.3 Server Actions - Políticas

**Crear:** `src/server/actions/expense-policies.ts`

- [ ] **2.3.1** Crear estructura base
- [ ] **2.3.2** Implementar `getOrganizationPolicy()`:
  - Obtener política de la org del usuario
  - Si no existe, crearla con valores por defecto
- [ ] **2.3.3** Implementar `updatePolicy(data)`:
  - Validar rol (solo ADMIN/HR)
  - Actualizar política
  - Retornar política actualizada

### 2.4 Server Actions - Analytics

**Crear:** `src/server/actions/expense-analytics.ts`

- [ ] **2.4.1** Crear estructura base
- [ ] **2.4.2** Implementar `getExpenseStats(filters)`:
  - Total gastado (período)
  - Total pendiente
  - Total aprobado
  - Total rechazado
  - Por mes actual
  - Comparación vs mes anterior
- [ ] **2.4.3** Implementar `getExpensesByCategory(year, month)`:
  - Agrupar por categoría
  - Sumar totalAmount
  - Contar número de gastos
- [ ] **2.4.4** Implementar `getMonthlyTrend(months = 12)`:
  - Últimos X meses
  - Total por mes
  - Por categoría
- [ ] **2.4.5** Implementar `getTopSpenders(limit = 5, period?)`:
  - Empleados con más gasto
  - Total por empleado
  - Número de gastos
- [ ] **2.4.6** Implementar `getExpensesByCostCenter(period?)`:
  - Agrupar por centro de coste
  - Total y count
- [ ] **2.4.7** Implementar `exportExpensesCSV(filters)`:
  - Obtener gastos filtrados
  - Generar CSV con columnas: fecha, empleado, categoría, importe, IVA, total, estado, aprobador
  - Retornar string CSV

### 2.5 API Endpoints - Expenses

- [ ] **2.5.1** Crear `src/app/api/expenses/route.ts`:
  - `GET`: Listar gastos (call `getMyExpenses`)
  - `POST`: Crear gasto (call `createExpense`)

- [ ] **2.5.2** Crear `src/app/api/expenses/[id]/route.ts`:
  - `GET`: Detalle (call `getExpenseById`)
  - `PUT`: Actualizar (call `updateExpense`)
  - `DELETE`: Eliminar (call `deleteExpense`)

- [ ] **2.5.3** Crear `src/app/api/expenses/[id]/submit/route.ts`:
  - `POST`: Enviar a aprobación (call `submitExpense`)

- [ ] **2.5.4** Crear `src/app/api/expenses/[id]/approve/route.ts`:
  - `POST`: Aprobar (call `approveExpense`)

- [ ] **2.5.5** Crear `src/app/api/expenses/[id]/reject/route.ts`:
  - `POST`: Rechazar (call `rejectExpense`)

- [ ] **2.5.6** Crear `src/app/api/expenses/[id]/attachments/upload/route.ts`:
  - `POST`: Subir adjunto
  - Usar `documentStorageService` para storage
  - Crear `ExpenseAttachment`

- [ ] **2.5.7** Crear `src/app/api/expenses/[id]/attachments/[attachmentId]/download/route.ts`:
  - `GET`: Descargar adjunto
  - Obtener URL firmada del storage

- [ ] **2.5.8** Crear `src/app/api/expenses/export.csv/route.ts`:
  - `GET`: Exportar CSV (call `exportExpensesCSV`)
  - Retornar con headers correctos

- [ ] **2.5.9** Crear `src/app/api/expenses/analytics/route.ts`:
  - `GET`: Estadísticas (call varios métodos de analytics)

### 2.6 API Endpoints - Políticas

- [ ] **2.6.1** Crear `src/app/api/expense-policies/route.ts`:
  - `GET`: Obtener política (call `getOrganizationPolicy`)
  - `PUT`: Actualizar política (call `updatePolicy`)

### 2.7 API Endpoints - Reports (Opcional MVP)

- [ ] **2.7.1** Crear `src/app/api/expense-reports/route.ts`:
  - `GET`: Listar informes
  - `POST`: Crear informe

- [ ] **2.7.2** Crear `src/app/api/expense-reports/[id]/route.ts`:
  - `GET`: Detalle
  - `PUT`: Actualizar
  - `DELETE`: Eliminar

---

## 🎨 FASE 3: UI - Área de Empleado (6-8h)

### 3.1 Store Zustand

**Crear:** `src/stores/expenses-store.tsx`

- [ ] **3.1.1** Crear estructura base del store
- [ ] **3.1.2** Definir tipos/interfaces:
  - `Expense`
  - `ExpenseFilters`
  - `ExpensesState`
- [ ] **3.1.3** Implementar state inicial
- [ ] **3.1.4** Implementar `loadMyExpenses(filters?)`
- [ ] **3.1.5** Implementar `loadExpenseById(id)`
- [ ] **3.1.6** Implementar `createExpense(data)`
- [ ] **3.1.7** Implementar `updateExpense(id, data)`
- [ ] **3.1.8** Implementar `submitExpense(id)`
- [ ] **3.1.9** Implementar `deleteExpense(id)`
- [ ] **3.1.10** Implementar `uploadAttachment(expenseId, file)`
- [ ] **3.1.11** Implementar `deleteAttachment(expenseId, attachmentId)`
- [ ] **3.1.12** Implementar setters para filtros y estado

### 3.2 Componentes Compartidos

**Crear:** `src/app/(main)/dashboard/me/expenses/_components/`

- [ ] **3.2.1** Crear `expense-status-badge.tsx`:
  - Componente Badge con colores por estado
  - DRAFT: gray, SUBMITTED: blue, APPROVED: green, REJECTED: red, REIMBURSED: purple

- [ ] **3.2.2** Crear `expense-category-icon.tsx`:
  - Iconos de Lucide por categoría
  - FUEL: Fuel, MILEAGE: Car, MEAL: UtensilsCrossed, etc.

- [ ] **3.2.3** Crear `expense-amount-display.tsx`:
  - Mostrar importe formateado
  - Con IVA desglosado si aplica

### 3.3 Página: Listado de Gastos

**Crear:** `src/app/(main)/dashboard/me/expenses/page.tsx`

- [ ] **3.3.1** Crear estructura base de la página
- [ ] **3.3.2** Implementar Tabs con Select responsive:
  - Tabs desktop: `@4xl/main:flex`
  - Select móvil: `@4xl/main:hidden`
- [ ] **3.3.3** Implementar tabs:
  - Borradores (DRAFT)
  - Enviados (SUBMITTED)
  - Aprobados (APPROVED)
  - Rechazados (REJECTED)
  - Reembolsados (REIMBURSED)
- [ ] **3.3.4** Implementar contadores en badges
- [ ] **3.3.5** Integrar con store: cargar datos al montar
- [ ] **3.3.6** Botón "Nuevo gasto" en header

**Crear:** `src/app/(main)/dashboard/me/expenses/_components/expenses-columns.tsx`

- [ ] **3.3.7** Definir columnas para TanStack Table:
  - Fecha (sortable)
  - Categoría (con icono, filterable)
  - Descripción/Comercio
  - Importe
  - IVA
  - Total
  - Estado (badge)
  - Acciones (ver, editar, eliminar, enviar)

**Crear:** `src/app/(main)/dashboard/me/expenses/_components/expenses-data-table.tsx`

- [ ] **3.3.8** Implementar DataTable siguiendo patrón del proyecto:
  - TanStack Table
  - Paginación con `DataTablePagination`
  - Filtros con `DataTableFacetedFilter`
  - Búsqueda global
  - View options con `DataTableViewOptions`
  - Estados vacíos con EmptyState
- [ ] **3.3.9** Implementar toolbar con filtros:
  - Categoría (faceted)
  - Centro de coste (faceted)
  - Rango de fechas
  - Botón "Limpiar filtros"
- [ ] **3.3.10** Implementar acciones de fila:
  - Ver detalle
  - Editar (solo DRAFT)
  - Eliminar (solo DRAFT)
  - Enviar a aprobación (solo DRAFT con attachments)

### 3.4 Página: Crear/Editar Gasto

**Crear:** `src/app/(main)/dashboard/me/expenses/new/page.tsx`
**Crear:** `src/app/(main)/dashboard/me/expenses/[id]/edit/page.tsx`

- [ ] **3.4.1** Crear estructura base de la página
- [ ] **3.4.2** Usar SectionHeader para título
- [ ] **3.4.3** Cargar política de la organización
- [ ] **3.4.4** Integrar componentes principales:
  - AttachmentUploader
  - OcrSuggestions
  - ExpenseForm

**Crear:** `src/app/(main)/dashboard/me/expenses/_components/attachment-uploader.tsx`

- [ ] **3.4.5** Implementar upload de archivos:
  - Drag & drop
  - Input file con `accept="image/*,.pdf"`
  - Captura desde cámara en móvil: `capture="environment"`
  - Preview de imágenes subidas
  - Lista de archivos con miniaturas
  - Botón eliminar por archivo
  - Comprimir imágenes antes de subir (browser-image-compression)
  - Límite de 10MB por archivo
  - Múltiples archivos permitidos

- [ ] **3.4.6** Integrar OCR automático:
  - Al subir imagen, ejecutar `useReceiptOcr()`
  - Mostrar spinner "Escaneando ticket..."
  - Al terminar, mostrar OcrSuggestions

**Crear:** `src/app/(main)/dashboard/me/expenses/_components/ocr-suggestions.tsx`

- [ ] **3.4.7** Implementar panel de sugerencias:
  - Mostrar chips con valores detectados:
    - Fecha
    - Total
    - Comercio
    - CIF/NIF
    - IVA%
    - Litros (si FUEL)
  - Cada chip con ícono ✓
  - Botón "Usar sugerencias"
  - Al hacer click, rellenar formulario
  - Indicador de confianza (confidence%)

**Crear:** `src/app/(main)/dashboard/me/expenses/_components/expense-form.tsx`

- [ ] **3.4.8** Crear schema Zod de validación
- [ ] **3.4.9** Implementar formulario con react-hook-form:
  - Fecha (DatePicker)
  - Categoría (Select con iconos)
  - Importe base (Input number)
  - IVA% (Select: 0%, 10%, 21%, otro)
  - Total (calculado automáticamente, readonly)
  - Centro de coste (Select, si policy.costCenterRequired)
  - Notas (Textarea)
  - Comercio (Input, pre-rellenado por OCR)
  - CIF comercio (Input, pre-rellenado por OCR)

- [ ] **3.4.10** Si categoría = MILEAGE:
  - Mostrar MileageCalculator en lugar de importe base
  - Ocultar IVA (no aplica)

**Crear:** `src/app/(main)/dashboard/me/expenses/_components/mileage-calculator.tsx`

- [ ] **3.4.11** Implementar calculadora de kilometraje:
  - Input: Kilómetros
  - Mostrar tarifa actual (desde policy)
  - Calcular automáticamente: km × tarifa
  - Mostrar total en grande
  - Permitir override de tarifa (con warning)

- [ ] **3.4.12** Implementar botones de acción:
  - "Guardar borrador" → createExpense/updateExpense con status DRAFT
  - "Enviar a aprobación" → submitExpense (validar attachments si required)
  - "Cancelar" → volver a listado
  - Validar antes de enviar:
    - Fecha no futura
    - Si policy requiere attachment → al menos 1
    - Si costCenterRequired → obligatorio
    - Si MILEAGE → km > 0

### 3.5 Página: Detalle de Gasto

**Crear:** `src/app/(main)/dashboard/me/expenses/[id]/page.tsx`

- [ ] **3.5.1** Crear estructura base
- [ ] **3.5.2** Cargar gasto por ID
- [ ] **3.5.3** Mostrar información completa:
  - Header con SectionHeader: título + estado badge
  - Card con detalles del gasto:
    - Fecha
    - Categoría (con icono)
    - Importe base
    - IVA (si aplica)
    - Total (destacado)
    - Centro de coste
    - Notas
    - Comercio
    - CIF
    - Km (si MILEAGE)

- [ ] **3.5.4** Galería de adjuntos:
  - Grid de imágenes
  - Click para ver en grande (Dialog)
  - Botón descargar

- [ ] **3.5.5** Sección de aprobación:
  - Estado actual
  - Aprobador asignado
  - Fecha de decisión (si aplica)
  - Comentarios del aprobador

- [ ] **3.5.6** Timeline de estados:
  - Creado (fecha, usuario)
  - Enviado (fecha)
  - Aprobado/Rechazado (fecha, aprobador, comentario)
  - Reembolsado (fecha)

- [ ] **3.5.7** Botones de acción (según estado):
  - Si DRAFT: Editar, Eliminar, Enviar
  - Si SUBMITTED: Ver aprobador, cancelar
  - Si APPROVED/REJECTED: Solo ver

### 3.6 Página: Informes de Gastos (Opcional MVP)

**Crear:** `src/app/(main)/dashboard/me/expense-reports/page.tsx`

- [ ] **3.6.1** Listado de informes creados
- [ ] **3.6.2** Botón "Nuevo informe"
- [ ] **3.6.3** DataTable con informes:
  - Título
  - Período
  - Total
  - Número de gastos
  - Estado

**Crear:** `src/app/(main)/dashboard/me/expense-reports/new/page.tsx`

- [ ] **3.6.4** Formulario para crear informe:
  - Título
  - Período (desde-hasta)
  - Seleccionar gastos a incluir (solo APPROVED)
  - Calcular total automáticamente
  - Botón "Crear informe"

- [ ] **3.6.5** Vista de detalle de informe:
  - Resumen de totales
  - Tabla de gastos incluidos
  - Desglose por categoría
  - Botón exportar CSV/PDF

---

## 👔 FASE 4: UI - Área de Administración (6-8h)

### 4.1 Store Zustand Admin

**Crear:** `src/stores/admin-expenses-store.tsx`

- [ ] **4.1.1** Crear estructura base del store
- [ ] **4.1.2** Definir tipos/interfaces:
  - `AdminExpense`
  - `ApprovalFilters`
  - `AdminExpensesState`
- [ ] **4.1.3** Implementar state inicial
- [ ] **4.1.4** Implementar `loadPendingApprovals(filters?)`
- [ ] **4.1.5** Implementar `loadAllExpenses(filters?)`
- [ ] **4.1.6** Implementar `approveExpense(id, comment?)`
- [ ] **4.1.7** Implementar `rejectExpense(id, reason)`
- [ ] **4.1.8** Implementar `loadAnalytics(filters?)`
- [ ] **4.1.9** Implementar `exportCSV(filters?)`
- [ ] **4.1.10** Implementar setters para filtros

### 4.2 Página: Bandeja de Aprobación

**Crear:** `src/app/(main)/dashboard/approvals/expenses/page.tsx`

- [ ] **4.2.1** Crear estructura base
- [ ] **4.2.2** Layout en dos columnas:
  - Izquierda: Filtros
  - Centro: DataTable de gastos pendientes
  - Derecha: Panel de detalle (aparece al seleccionar)

- [ ] **4.2.3** Implementar filtros en sidebar:
  - Empleado (autocomplete)
  - Categoría (select múltiple)
  - Rango de fechas
  - Centro de coste
  - Importe (desde-hasta)
  - Botón "Limpiar filtros"

- [ ] **4.2.4** Integrar con store: cargar aprobaciones pendientes

**Crear:** `src/app/(main)/dashboard/approvals/expenses/_components/approvals-columns.tsx`

- [ ] **4.2.5** Definir columnas:
  - Empleado (con avatar)
  - Fecha
  - Categoría (con icono)
  - Descripción
  - Total
  - Días pendiente
  - Acciones (ver detalle)

**Crear:** `src/app/(main)/dashboard/approvals/expenses/_components/approvals-data-table.tsx`

- [ ] **4.2.6** Implementar DataTable:
  - TanStack Table
  - Paginación
  - Row selection (para seleccionar gasto)
  - Highlight row seleccionada
  - Al seleccionar → mostrar panel de detalle

**Crear:** `src/app/(main)/dashboard/approvals/expenses/_components/approval-detail-panel.tsx`

- [ ] **4.2.7** Implementar panel lateral (Sheet o Card fijo):
  - Cabecera con empleado y fecha
  - Galería de tickets (imágenes)
  - Zoom de imagen al click
  - Detalles del gasto:
    - Categoría
    - Importe + IVA + Total
    - Centro de coste
    - Notas del empleado
    - Comercio y CIF
  - Histórico de cambios (si aplicable)
  - Botones de acción:
    - Aprobar (Dialog de confirmación)
    - Rechazar (Dialog con campo de motivo)

**Crear:** `src/app/(main)/dashboard/approvals/expenses/_components/approve-dialog.tsx`

- [ ] **4.2.8** Implementar diálogo de aprobación:
  - Resumen del gasto
  - Campo opcional: Comentarios para el empleado
  - Checkbox: "Notificar por email"
  - Botón "Confirmar aprobación"
  - Al confirmar: call `approveExpense()`

**Crear:** `src/app/(main)/dashboard/approvals/expenses/_components/reject-dialog.tsx`

- [ ] **4.2.9** Implementar diálogo de rechazo:
  - Resumen del gasto
  - Campo OBLIGATORIO: Motivo del rechazo
  - Textarea con placeholder: "Explica por qué se rechaza este gasto..."
  - Botón "Confirmar rechazo"
  - Al confirmar: call `rejectExpense()`

### 4.3 Página: Políticas de Gastos

**Crear:** `src/app/(main)/dashboard/admin/expenses/policy/page.tsx`

- [ ] **4.3.1** Crear estructura base
- [ ] **4.3.2** Usar SectionHeader
- [ ] **4.3.3** Cargar política actual
- [ ] **4.3.4** Validar permisos (solo ADMIN/HR)

**Crear:** `src/app/(main)/dashboard/admin/expenses/_components/policy-form.tsx`

- [ ] **4.3.5** Implementar formulario de política:
  - Sección: Tarifas
    - Kilometraje (€/km) - Input number
    - Límite diario comidas (€) - Input number
    - Límite diario alojamiento (€) - Input number

  - Sección: Requisitos generales
    - Adjunto obligatorio - Switch
    - Centro de coste obligatorio - Switch
    - IVA permitido - Switch

  - Sección: Requisitos por categoría
    - Tabla expandible por categoría:
      - FUEL: Ticket obligatorio, IVA permitido
      - MILEAGE: Sin ticket, sin IVA
      - MEAL: Ticket obligatorio, IVA permitido
      - etc.

  - Sección: Aprobación
    - Niveles de aprobación (1, 2, 3) - Select
    - Información: "MVP solo soporta 1 nivel"

- [ ] **4.3.6** Botones:
  - "Guardar cambios" → call `updatePolicy()`
  - "Restablecer valores por defecto" → Dialog confirmación

- [ ] **4.3.7** Mostrar alert de éxito al guardar

### 4.4 Página: Dashboard Analytics

**Crear:** `src/app/(main)/dashboard/admin/expenses/analytics/page.tsx`

- [ ] **4.4.1** Crear estructura base
- [ ] **4.4.2** SectionHeader con botón "Exportar CSV"
- [ ] **4.4.3** Filtros globales en toolbar:
  - Año (Select)
  - Mes (Select, o "Todo el año")
  - Centro de coste (Select)
  - Empleado (Autocomplete)
  - Botón "Aplicar filtros"

- [ ] **4.4.4** Cargar datos de analytics con filtros

**Crear:** `src/app/(main)/dashboard/admin/expenses/_components/expense-stats-cards.tsx`

- [ ] **4.4.5** Implementar cards de métricas (4 cards en grid):
  - Total gastado (período seleccionado)
    - Comparación vs período anterior (%)
  - Gastos pendientes de aprobación
    - Número de solicitudes
  - Gastos aprobados este mes
    - % del total
  - Promedio por empleado
    - Por mes

**Crear:** `src/app/(main)/dashboard/admin/expenses/_components/category-chart.tsx`

- [ ] **4.4.6** Implementar gráfico de pastel (Recharts):
  - Gasto por categoría (mes actual)
  - PieChart con leyenda
  - Colores por categoría
  - Tooltip con importe y %

**Crear:** `src/app/(main)/dashboard/admin/expenses/_components/monthly-trend-chart.tsx`

- [ ] **4.4.7** Implementar gráfico de líneas (Recharts):
  - Evolución de gasto mensual (últimos 12 meses)
  - LineChart con:
    - Total por mes
    - Línea por categoría (opcional, toggle)
  - Tooltip con desglose
  - Eje X: Meses
  - Eje Y: Importe (€)

**Crear:** `src/app/(main)/dashboard/admin/expenses/_components/top-spenders-chart.tsx`

- [ ] **4.4.8** Implementar gráfico de barras (Recharts):
  - Top 5 empleados por gasto
  - BarChart horizontal
  - Tooltip con:
    - Total gastado
    - Número de gastos
    - Promedio por gasto

**Crear:** `src/app/(main)/dashboard/admin/expenses/_components/cost-center-breakdown.tsx`

- [ ] **4.4.9** Implementar tabla/gráfico:
  - Gasto por centro de coste
  - Tabla con columnas:
    - Centro
    - Total
    - % del total
    - Número de gastos
    - Promedio
  - Ordenable por columna

**Crear:** `src/app/(main)/dashboard/admin/expenses/_components/export-csv-dialog.tsx`

- [ ] **4.4.10** Implementar diálogo de exportación:
  - Filtros:
    - Rango de fechas (desde-hasta)
    - Estado (múltiple: draft, submitted, approved, rejected)
    - Categoría (múltiple)
    - Empleado (autocomplete múltiple)
    - Centro de coste
  - Preview del número de registros
  - Botón "Exportar CSV"
  - Al exportar:
    - call `exportExpensesCSV(filters)`
    - Descargar archivo con nombre: `gastos_[fecha].csv`

### 4.5 Página: Listado Global de Gastos

**Crear:** `src/app/(main)/dashboard/admin/expenses/page.tsx`

- [ ] **4.5.1** Crear listado completo de gastos (todos los empleados)
- [ ] **4.5.2** Tabs por estado (igual que empleado pero con todos)
- [ ] **4.5.3** DataTable con columnas adicionales:
  - Empleado
  - Departamento
  - Manager
- [ ] **4.5.4** Filtros avanzados:
  - Todos los del empleado +
  - Departamento
  - Manager
  - Estado de aprobación
- [ ] **4.5.5** Acciones masivas:
  - Exportar seleccionados
  - Marcar como reembolsado (bulk)

---

## 🤖 FASE 5: OCR y Procesamiento de Tickets (4-5h)

### 5.1 Instalación de Dependencias

- [ ] **5.1.1** Instalar tesseract.js:
  ```bash
  npm install tesseract.js
  ```

- [ ] **5.1.2** Instalar browser-image-compression:
  ```bash
  npm install browser-image-compression
  ```

- [ ] **5.1.3** Verificar instalación:
  ```bash
  npm list tesseract.js browser-image-compression
  ```

### 5.2 Preprocesamiento de Imágenes

**Crear:** `src/lib/ocr/image-preprocessor.ts`

- [ ] **5.2.1** Crear función `compressImage(file: File)`:
  - Usar browser-image-compression
  - Opciones:
    - maxSizeMB: 1
    - maxWidthOrHeight: 1920
    - useWebWorker: true
  - Retornar File comprimido

- [ ] **5.2.2** Crear función `convertToGrayscale(imageDataURL)`:
  - Canvas API
  - Obtener ImageData
  - Convertir píxeles a escala de grises
  - Retornar DataURL

- [ ] **5.2.3** Crear función `binarizeImage(imageDataURL, threshold = 128)`:
  - Canvas API
  - Aplicar binarización (blanco/negro)
  - Mejorar contraste
  - Retornar DataURL

- [ ] **5.2.4** Crear función `preprocessImage(file: File)`:
  - Comprimir → Grayscale → Binarize
  - Retornar File procesado

### 5.3 Worker de OCR con Tesseract

**Crear:** `src/lib/ocr/tesseract-worker.ts`

- [ ] **5.3.1** Importar Tesseract
- [ ] **5.3.2** Crear función `initTesseractWorker()`:
  - Crear worker
  - Cargar idioma español ('spa')
  - Configurar opciones
  - Retornar worker

- [ ] **5.3.3** Crear función `processReceipt(imageFile: File)`:
  ```typescript
  async function processReceipt(imageFile: File) {
    // 1. Preprocesar
    const preprocessed = await preprocessImage(imageFile);

    // 2. OCR
    const worker = await initTesseractWorker();
    const { data } = await worker.recognize(preprocessed);
    await worker.terminate();

    // 3. Retornar
    return {
      text: data.text,
      confidence: data.confidence,
      words: data.words,
    };
  }
  ```

- [ ] **5.3.4** Añadir logger para progreso (opcional)

### 5.4 Parser de Texto del Ticket

**Crear:** `src/lib/ocr/receipt-parser.ts`

- [ ] **5.4.1** Definir tipos:
  ```typescript
  interface ParsedReceipt {
    total?: number;
    date?: string;
    vatPercent?: number;
    merchantName?: string;
    merchantVat?: string;
    fuelLiters?: number;
    fuelPricePerLiter?: number;
    confidence: {
      total: number;
      date: number;
      merchantVat: number;
    };
  }
  ```

- [ ] **5.4.2** Crear regex patterns:
  ```typescript
  const patterns = {
    total: /(?:TOTAL|IMPORTE\s*TOTAL|A\s*PAGAR)[\s:]*(\d+[\.,]\d{2})/gi,
    date: /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g,
    vat: /IVA\s*(\d{1,2}[\.,]?\d{0,2})\s*%/gi,
    cif: /\b[ABCDEFGHJKLMNPQRSUVW]\d{7}[0-9A-J]\b/g,
    nif: /\b\d{8}[A-Z]\b/g,
    liters: /(\d+[\.,]\d{2,3})\s*(L|LITROS)/gi,
    pricePerLiter: /(\d+[\.,]\d{3})\s*€?\s*\/\s*L/gi,
  };
  ```

- [ ] **5.4.3** Implementar `extractTotal(text: string)`:
  - Buscar patrón TOTAL
  - Si no encuentra, buscar mayor cantidad con 2 decimales
  - Normalizar separadores (coma → punto)
  - Retornar número
  - Calcular confidence (alta si encontró "TOTAL", media si es heurística)

- [ ] **5.4.4** Implementar `extractDate(text: string)`:
  - Buscar fechas
  - Validar que no sea futura
  - Preferir fechas recientes
  - Normalizar formato (DD/MM/YYYY)
  - Retornar string

- [ ] **5.4.5** Implementar `extractVAT(text: string)`:
  - Buscar "IVA XX%"
  - Retornar número (0, 10, 21, etc.)
  - Si encuentra varios, usar el más común (21%)

- [ ] **5.4.6** Implementar `extractMerchantVAT(text: string)`:
  - Buscar CIF (empresas)
  - Buscar NIF (autónomos)
  - Validar formato
  - Retornar string

- [ ] **5.4.7** Implementar `extractMerchantName(text: string)`:
  - Heurística: primera línea en mayúsculas
  - O buscar después de CIF
  - O línea con más palabras en mayúsculas
  - Limpiar caracteres especiales
  - Retornar string

- [ ] **5.4.8** Implementar `extractFuelData(text: string)`:
  - Buscar litros
  - Buscar precio por litro
  - Calcular total = litros × precio/L
  - Comparar con total general (validación)
  - Retornar objeto { liters, pricePerLiter }

- [ ] **5.4.9** Implementar función principal `parseReceiptText(text: string)`:
  ```typescript
  export function parseReceiptText(text: string): ParsedReceipt {
    return {
      total: extractTotal(text),
      date: extractDate(text),
      vatPercent: extractVAT(text),
      merchantName: extractMerchantName(text),
      merchantVat: extractMerchantVAT(text),
      fuelLiters: extractFuelData(text).liters,
      fuelPricePerLiter: extractFuelData(text).pricePerLiter,
      confidence: {
        total: /* calcular */,
        date: /* calcular */,
        merchantVat: /* calcular */,
      },
    };
  }
  ```

### 5.5 Hook React para OCR

**Crear:** `src/hooks/use-receipt-ocr.ts`

- [ ] **5.5.1** Crear estructura del hook:
  ```typescript
  export function useReceiptOcr() {
    const [isProcessing, setIsProcessing] = useState(false);
    const [suggestions, setSuggestions] = useState<ParsedReceipt | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
  ```

- [ ] **5.5.2** Implementar `processFile`:
  ```typescript
  const processFile = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setProgress(0);

    try {
      // 1. Validar tipo de archivo
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        throw new Error('Solo se permiten imágenes o PDFs');
      }

      setProgress(20);

      // 2. Si es PDF, convertir primera página a imagen
      let imageFile = file;
      if (file.type === 'application/pdf') {
        imageFile = await convertPdfToImage(file);
      }

      setProgress(40);

      // 3. OCR
      const ocrResult = await processReceipt(imageFile);

      setProgress(70);

      // 4. Parse
      const parsed = parseReceiptText(ocrResult.text);

      setProgress(100);

      setSuggestions({
        ...parsed,
        rawText: ocrResult.text, // Para debugging
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error procesando ticket');
      console.error('Error en OCR:', err);
    } finally {
      setIsProcessing(false);
    }
  };
  ```

- [ ] **5.5.3** Implementar `reset`:
  ```typescript
  const reset = () => {
    setSuggestions(null);
    setError(null);
    setProgress(0);
  };
  ```

- [ ] **5.5.4** Retornar:
  ```typescript
  return {
    processFile,
    reset,
    isProcessing,
    suggestions,
    error,
    progress,
  };
  ```

### 5.6 Soporte para PDF (Opcional)

**Crear:** `src/lib/ocr/pdf-converter.ts`

- [ ] **5.6.1** Instalar pdfjs-dist:
  ```bash
  npm install pdfjs-dist
  ```

- [ ] **5.6.2** Implementar `extractTextFromPdf(file: File)`:
  - Usar pdfjs-dist para extraer texto
  - Si tiene capa de texto → retornar directamente
  - Si no → null (requiere renderizar)

- [ ] **5.6.3** Implementar `renderPdfPageToImage(file: File, page = 1)`:
  - Renderizar página a canvas
  - Convertir canvas a Blob
  - Retornar File

- [ ] **5.6.4** Implementar `convertPdfToImage(file: File)`:
  ```typescript
  export async function convertPdfToImage(file: File): Promise<File> {
    // 1. Intentar extraer texto
    const text = await extractTextFromPdf(file);

    if (text) {
      // Tiene texto → crear imagen "virtual" con el texto
      // O mejor: parsear directamente el texto
      return parseTextDirectly(text);
    }

    // 2. Sin texto → renderizar primera página
    return renderPdfPageToImage(file, 1);
  }
  ```

### 5.7 Plantillas por Comercio (Futuro - Opcional)

**Crear:** `src/lib/ocr/merchant-templates.json`

- [ ] **5.7.1** Definir estructura JSON:
  ```json
  {
    "REPSOL": {
      "cif": "A12345678",
      "patterns": {
        "total": {
          "keyword": "TOTAL EUR",
          "position": "bottom",
          "linesOffset": 2
        },
        "liters": {
          "keyword": "LITROS",
          "position": "middle"
        }
      }
    }
  }
  ```

- [ ] **5.7.2** Implementar `detectMerchant(text: string)`:
  - Buscar CIF en templates
  - O buscar nombre del comercio
  - Retornar template

- [ ] **5.7.3** Implementar `parseWithTemplate(text, template)`:
  - Usar posiciones del template para extraer valores
  - Mayor precisión que regex genéricos
  - Fallback a regex si falla

---

## ✅ FASE 6: Validaciones y Notificaciones (2-3h)

### 6.1 Validaciones con Zod

**Crear:** `src/lib/validations/expense.ts`

- [ ] **6.1.1** Crear schema base:
  ```typescript
  import { z } from 'zod';
  import { ExpenseCategory } from '@prisma/client';

  export const expenseBaseSchema = z.object({
    date: z.date()
      .max(new Date(), "La fecha no puede ser futura")
      .refine((date) => {
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        return date >= sixtyDaysAgo;
      }, "El gasto no puede tener más de 60 días de antigüedad"),

    category: z.nativeEnum(ExpenseCategory),

    amount: z.number()
      .positive("El importe debe ser mayor a 0")
      .max(10000, "El importe no puede superar 10.000€"),

    vatPercent: z.number()
      .min(0)
      .max(100)
      .optional()
      .nullable(),

    costCenterId: z.string().optional().nullable(),

    notes: z.string()
      .max(500, "Las notas no pueden superar 500 caracteres")
      .optional()
      .nullable(),

    merchantName: z.string()
      .max(200)
      .optional()
      .nullable(),

    merchantVat: z.string()
      .regex(/^[A-Z]\d{7}[0-9A-J]$|^\d{8}[A-Z]$/, "CIF/NIF inválido")
      .optional()
      .nullable(),
  });
  ```

- [ ] **6.1.2** Crear schema para MILEAGE:
  ```typescript
  export const mileageExpenseSchema = expenseBaseSchema.extend({
    category: z.literal(ExpenseCategory.MILEAGE),
    mileageKm: z.number()
      .positive("Los kilómetros deben ser mayores a 0")
      .max(1000, "Los kilómetros no pueden superar 1000"),
    mileageRate: z.number()
      .positive()
      .optional(),
    vatPercent: z.literal(null).optional(), // Sin IVA en kilometraje
  });
  ```

- [ ] **6.1.3** Crear schema discriminado:
  ```typescript
  export const expenseSchema = z.discriminatedUnion("category", [
    mileageExpenseSchema,
    expenseBaseSchema.extend({
      category: z.enum([
        ExpenseCategory.FUEL,
        ExpenseCategory.MEAL,
        ExpenseCategory.TOLL,
        ExpenseCategory.PARKING,
        ExpenseCategory.LODGING,
        ExpenseCategory.OTHER,
      ]),
    }),
  ]);
  ```

- [ ] **6.1.4** Crear validador de política:
  ```typescript
  export async function validateExpenseAgainstPolicy(
    expense: z.infer<typeof expenseSchema>,
    policy: ExpensePolicy
  ): Promise<{ valid: boolean; warnings: string[] }> {
    const warnings: string[] = [];

    // Validar límite diario de comidas
    if (expense.category === ExpenseCategory.MEAL && policy.mealDailyLimit) {
      const todayExpenses = await getTodayMealExpenses(expense.employeeId);
      const totalToday = todayExpenses.reduce((sum, e) => sum + e.totalAmount, 0);

      if (totalToday + expense.totalAmount > policy.mealDailyLimit) {
        warnings.push(`El total de comidas hoy supera el límite diario de ${policy.mealDailyLimit}€`);
      }
    }

    // Validar requisitos por categoría
    const catRequirements = policy.categoryRequirements[expense.category];
    if (catRequirements?.requiresReceipt && !expense.attachments?.length) {
      return { valid: false, warnings: ['Esta categoría requiere adjuntar ticket'] };
    }

    // Validar centro de coste
    if (policy.costCenterRequired && !expense.costCenterId) {
      return { valid: false, warnings: ['El centro de coste es obligatorio'] };
    }

    return { valid: true, warnings };
  }
  ```

### 6.2 Validaciones en Server Actions

**En:** `src/server/actions/expenses.ts`

- [ ] **6.2.1** Añadir validación en `createExpense`:
  ```typescript
  // Validar datos
  const validated = expenseSchema.parse(data);

  // Validar contra política
  const policy = await getOrganizationPolicy();
  const { valid, warnings } = await validateExpenseAgainstPolicy(validated, policy);

  if (!valid) {
    throw new Error(warnings[0]);
  }

  // Crear gasto...
  ```

- [ ] **6.2.2** Añadir validación en `submitExpense`:
  ```typescript
  // Validar que tenga attachments si required
  if (policy.attachmentRequired && expense.attachments.length === 0) {
    throw new Error("Debes adjuntar al menos un ticket");
  }

  // Validar que no esté pendiente de aprobación ya
  if (expense.status !== ExpenseStatus.DRAFT) {
    throw new Error("Solo se pueden enviar gastos en borrador");
  }
  ```

### 6.3 Integración con Sistema de Notificaciones

**En:** `src/server/actions/expenses.ts`

- [ ] **6.3.1** Importar función de notificaciones:
  ```typescript
  import { createNotification } from './notifications';
  ```

- [ ] **6.3.2** En `submitExpense`, añadir notificación al manager:
  ```typescript
  // Obtener manager del empleado
  const contract = await prisma.employmentContract.findFirst({
    where: {
      employeeId: expense.employeeId,
      active: true,
    },
    include: {
      manager: {
        include: { user: true },
      },
    },
  });

  if (!contract?.manager?.user) {
    throw new Error("No tienes un manager asignado. Contacta con RRHH.");
  }

  // Crear aprobación pendiente
  await prisma.expenseApproval.create({
    data: {
      expenseId: expense.id,
      approverId: contract.manager.user.id,
      level: 1,
      decision: ApprovalDecision.PENDING,
    },
  });

  // Notificar al manager
  await createNotification(
    contract.manager.user.id,
    expense.orgId,
    'EXPENSE_SUBMITTED',
    'Nueva solicitud de gasto',
    `${employee.firstName} ${employee.lastName} ha enviado un gasto de ${expense.totalAmount}€ para aprobación`,
    undefined, // ptoRequestId
    undefined, // manualTimeEntryRequestId
    expense.id, // expenseId (NUEVO PARÁMETRO)
  );
  ```

**En:** `src/server/actions/expense-approvals.ts`

- [ ] **6.3.3** En `approveExpense`, notificar al empleado:
  ```typescript
  await createNotification(
    expense.creator.id,
    expense.orgId,
    'EXPENSE_APPROVED',
    'Gasto aprobado',
    `Tu gasto de ${expense.totalAmount}€ ha sido aprobado por ${approver.name}`,
    undefined,
    undefined,
    expense.id,
  );
  ```

- [ ] **6.3.4** En `rejectExpense`, notificar al empleado:
  ```typescript
  await createNotification(
    expense.creator.id,
    expense.orgId,
    'EXPENSE_REJECTED',
    'Gasto rechazado',
    `Tu gasto de ${expense.totalAmount}€ ha sido rechazado. Motivo: ${reason}`,
    undefined,
    undefined,
    expense.id,
  );
  ```

### 6.4 Actualizar Sistema de Notificaciones

**En:** `src/server/actions/notifications.ts`

- [ ] **6.4.1** Modificar firma de `createNotification`:
  ```typescript
  export async function createNotification(
    userId: string,
    orgId: string,
    type: PtoNotificationType,
    title: string,
    message: string,
    ptoRequestId?: string,
    manualTimeEntryRequestId?: string,
    expenseId?: string, // NUEVO
  ) {
    // ...
    const notification = await prisma.ptoNotification.create({
      data: {
        userId,
        orgId,
        type,
        title,
        message,
        ptoRequestId,
        manualTimeEntryRequestId,
        expenseId, // NUEVO
        isRead: false,
      },
    });
    // ...
  }
  ```

- [ ] **6.4.2** Actualizar `getMyNotifications` para incluir expense:
  ```typescript
  include: {
    // ... existente
    expense: {
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        category: true,
      },
    },
  },
  ```

### 6.5 Validaciones de UI

**En componentes de formulario**

- [ ] **6.5.1** En `expense-form.tsx`, añadir validaciones en tiempo real:
  - Fecha no futura
  - Si MILEAGE → km obligatorio
  - Límites de importe
  - Formato de CIF/NIF

- [ ] **6.5.2** Mostrar warnings antes de enviar:
  - Si supera límite diario
  - Si no tiene adjuntos (pero no obligatorio)
  - Si centro de coste vacío (sugerencia)

---

## 🗂️ FASE 7: Navegación y Features Flag (1h)

### 7.1 Añadir a Navegación

**Buscar archivo de navegación del sidebar**

- [ ] **7.1.1** Ejecutar:
  ```bash
  find src -name "*nav*.tsx" -o -name "*sidebar*.tsx"
  ```

- [ ] **7.1.2** Identificar archivo correcto (probablemente `src/navigation/sidebar-nav.tsx` o similar)

- [ ] **7.1.3** Importar iconos necesarios:
  ```typescript
  import { Receipt, Wallet, Plus, CheckCircle, TrendingUp, Settings } from 'lucide-react';
  ```

- [ ] **7.1.4** Añadir sección para empleados (en área "Mi Espacio" o similar):
  ```typescript
  {
    title: "Gastos",
    icon: Receipt,
    items: [
      {
        title: "Mis Gastos",
        href: "/dashboard/me/expenses",
        icon: Wallet,
      },
      {
        title: "Nuevo Gasto",
        href: "/dashboard/me/expenses/new",
        icon: Plus,
      },
    ],
  },
  ```

- [ ] **7.1.5** Añadir en sección de administración/aprobaciones:
  ```typescript
  {
    title: "Aprobaciones",
    items: [
      // ... existentes (PTO, etc.)
      {
        title: "Gastos",
        href: "/dashboard/approvals/expenses",
        icon: CheckCircle,
        roles: [Role.MANAGER, Role.HR_ADMIN, Role.ORG_ADMIN],
      },
    ],
  },
  ```

- [ ] **7.1.6** Añadir en sección de administración:
  ```typescript
  {
    title: "Administración",
    items: [
      // ... existentes
      {
        title: "Analytics Gastos",
        href: "/dashboard/admin/expenses/analytics",
        icon: TrendingUp,
        roles: [Role.HR_ADMIN, Role.ORG_ADMIN],
      },
      {
        title: "Políticas Gastos",
        href: "/dashboard/admin/expenses/policy",
        icon: Settings,
        roles: [Role.HR_ADMIN, Role.ORG_ADMIN],
      },
    ],
  },
  ```

### 7.2 Feature Flag

**Crear o actualizar:** `src/config/features.ts`

- [ ] **7.2.1** Si el archivo no existe, crearlo:
  ```typescript
  export const features = {
    expenses: process.env.NEXT_PUBLIC_FEATURE_EXPENSES === 'true',
    // Otros features existentes...
  };
  ```

- [ ] **7.2.2** Si ya existe, añadir:
  ```typescript
  expenses: process.env.NEXT_PUBLIC_FEATURE_EXPENSES === 'true',
  ```

- [ ] **7.2.3** Actualizar `.env.local`:
  ```bash
  # Gestión de Gastos
  NEXT_PUBLIC_FEATURE_EXPENSES="true"
  ```

- [ ] **7.2.4** Actualizar `.env.example`:
  ```bash
  # Gestión de Gastos
  NEXT_PUBLIC_FEATURE_EXPENSES="true"
  ```

### 7.3 Proteger Rutas con Feature Flag

**En todas las páginas del módulo**

- [ ] **7.3.1** Añadir al inicio de cada página:
  ```typescript
  import { features } from '@/config/features';
  import { notFound } from 'next/navigation';

  export default async function ExpensesPage() {
    if (!features.expenses) {
      notFound();
    }

    // ... resto del código
  }
  ```

- [ ] **7.3.2** En navegación, condicionar items:
  ```typescript
  ...(features.expenses ? [{
    title: "Gastos",
    // ...
  }] : []),
  ```

### 7.4 Actualizar Breadcrumbs (si aplica)

- [ ] **7.4.1** Si hay sistema de breadcrumbs, añadir rutas:
  ```typescript
  '/dashboard/me/expenses': 'Mis Gastos',
  '/dashboard/me/expenses/new': 'Nuevo Gasto',
  '/dashboard/approvals/expenses': 'Aprobar Gastos',
  '/dashboard/admin/expenses/analytics': 'Analytics',
  '/dashboard/admin/expenses/policy': 'Políticas',
  ```

---

## 📄 FASE 8: Documentación y README (1h)

### 8.1 Crear README del Módulo

**Crear:** `docs/EXPENSES.md`

- [ ] **8.1.1** Crear estructura del documento:
  ```markdown
  # Módulo de Gestión de Gastos

  ## 📋 Tabla de Contenidos

  1. [Descripción General](#descripción-general)
  2. [Flujo de Usuario](#flujo-de-usuario)
  3. [Características](#características)
  4. [OCR: Cómo Funciona](#ocr-cómo-funciona)
  5. [Configuración](#configuración)
  6. [Políticas de Gastos](#políticas-de-gastos)
  7. [Exportación de Datos](#exportación-de-datos)
  8. [Roles y Permisos](#roles-y-permisos)
  9. [FAQs](#faqs)
  10. [Troubleshooting](#troubleshooting)
  ```

- [ ] **8.1.2** Sección: Descripción General
  - Qué es el módulo
  - Para quién es
  - Beneficios

- [ ] **8.1.3** Sección: Flujo de Usuario
  - Diagrama o descripción paso a paso:
    1. Empleado toma foto del ticket
    2. Sistema procesa con OCR
    3. Sugiere datos extraídos
    4. Empleado completa formulario
    5. Envía a aprobación
    6. Manager revisa y aprueba/rechaza
    7. Sistema notifica al empleado

- [ ] **8.1.4** Sección: Características
  - ✅ Captura desde cámara móvil
  - ✅ OCR gratuito con Tesseract.js
  - ✅ Múltiples categorías de gastos
  - ✅ Cálculo automático de kilometraje
  - ✅ Flujo de aprobación
  - ✅ Dashboard analytics
  - ✅ Exportación CSV
  - ✅ Notificaciones en tiempo real

- [ ] **8.1.5** Sección: OCR - Cómo Funciona
  ```markdown
  ## OCR: Cómo Funciona

  ### Tecnología
  - **Motor:** Tesseract.js (JavaScript OCR engine)
  - **Idioma:** Español (spa)
  - **Ejecución:** Cliente-side (navegador)

  ### Proceso
  1. **Preprocesamiento:**
     - Compresión de imagen (<1 MB)
     - Conversión a escala de grises
     - Binarización (blanco/negro)
     - Mejora de contraste

  2. **Reconocimiento:**
     - Tesseract analiza la imagen
     - Extrae texto línea por línea
     - Calcula confianza por palabra

  3. **Parsing:**
     - Regex patterns para buscar:
       - Total: `TOTAL`, `IMPORTE TOTAL`, `A PAGAR`
       - Fecha: `DD/MM/YYYY`
       - IVA: `IVA XX%`
       - CIF/NIF: Validación con algoritmo
     - Heurísticas para comercio y datos de combustible

  ### Precisión Esperada
  - ✅ **70-85%** en tickets impresos limpios
  - ✅ **50-70%** en tickets arrugados o con mala iluminación
  - ❌ **<30%** en tickets manuscritos

  ### Limitaciones
  - Requiere buena iluminación
  - No funciona con escritura a mano
  - Puede fallar con fonts muy pequeños
  - Performance: 3-8 segundos por imagen

  ### Mejoras Futuras
  - Plantillas por comercio conocido (REPSOL, BP, etc.)
  - ML para mejor extracción de campos
  - Soporte multi-idioma
  - OCR en servidor para PDFs pesados
  ```

- [ ] **8.1.6** Sección: Configuración
  ```markdown
  ## Configuración

  ### Variables de Entorno

  \`\`\`bash
  # Feature flag
  NEXT_PUBLIC_FEATURE_EXPENSES="true"

  # Storage (usa el ya configurado)
  STORAGE_PROVIDER="r2|azure|local"
  \`\`\`

  ### Activar Módulo

  1. Añadir variable en `.env.local`
  2. Ejecutar migraciones: `npx prisma migrate dev`
  3. Seed políticas: `npx prisma db seed`
  4. Reiniciar servidor: `npm run dev`
  ```

- [ ] **8.1.7** Sección: Políticas de Gastos
  ```markdown
  ## Políticas de Gastos

  ### Configuración por Organización

  Cada organización puede configurar:

  - **Tarifa de kilometraje:** €/km (por defecto: 0.26€)
  - **Límites diarios:**
    - Comidas: €/día
    - Alojamiento: €/día
  - **Requisitos:**
    - Adjunto obligatorio (sí/no)
    - Centro de coste obligatorio (sí/no)
    - IVA permitido (sí/no)
  - **Requisitos por categoría:**
    - FUEL: Requiere ticket + IVA
    - MILEAGE: Sin ticket + Sin IVA
    - MEAL: Requiere ticket + IVA
    - etc.

  ### Acceso

  Solo usuarios con rol `HR_ADMIN` o `ORG_ADMIN` pueden editar políticas.

  Ruta: `/dashboard/admin/expenses/policy`
  ```

- [ ] **8.1.8** Sección: Exportación de Datos
  ```markdown
  ## Exportación de Datos

  ### CSV Export

  Desde Analytics, hacer click en "Exportar CSV" para descargar todos los gastos con:

  - Filtros disponibles:
    - Rango de fechas
    - Estado
    - Categoría
    - Empleado
    - Centro de coste

  - Columnas exportadas:
    - ID
    - Fecha
    - Empleado
    - Departamento
    - Categoría
    - Comercio
    - Importe base
    - IVA %
    - IVA €
    - Total
    - Estado
    - Aprobador
    - Fecha aprobación
    - Comentarios

  ### Formato

  El archivo CSV usa:
  - Separador: `,` (coma)
  - Encoding: UTF-8 BOM (compatible con Excel)
  - Formato de fecha: `DD/MM/YYYY`
  - Formato de número: `0.00` (punto decimal)
  ```

- [ ] **8.1.9** Sección: Roles y Permisos
  ```markdown
  ## Roles y Permisos

  | Acción | EMPLOYEE | MANAGER | HR_ADMIN | ORG_ADMIN |
  |--------|----------|---------|----------|-----------|
  | Ver mis gastos | ✅ | ✅ | ✅ | ✅ |
  | Crear gasto | ✅ | ✅ | ✅ | ✅ |
  | Editar gasto (DRAFT) | ✅ (propios) | ✅ (propios) | ✅ (propios) | ✅ (propios) |
  | Eliminar gasto (DRAFT) | ✅ (propios) | ✅ (propios) | ✅ (propios) | ✅ (propios) |
  | Enviar a aprobación | ✅ | ✅ | ✅ | ✅ |
  | Ver gastos de equipo | ❌ | ✅ (su equipo) | ✅ (todos) | ✅ (todos) |
  | Aprobar/Rechazar | ❌ | ✅ (su equipo) | ✅ (todos) | ✅ (todos) |
  | Ver analytics | ❌ | ❌ | ✅ | ✅ |
  | Editar políticas | ❌ | ❌ | ✅ | ✅ |
  | Exportar CSV | ❌ | ❌ | ✅ | ✅ |
  ```

- [ ] **8.1.10** Sección: FAQs
  ```markdown
  ## FAQs

  ### ¿Puedo editar un gasto después de enviarlo?
  No. Una vez enviado a aprobación, solo el manager puede aprobarlo o rechazarlo. Si fue rechazado, vuelve a DRAFT y puedes editarlo.

  ### ¿Cuántos adjuntos puedo subir?
  No hay límite, pero cada archivo debe ser menor a 10MB.

  ### ¿El OCR funciona con tickets en papel térmico desgastado?
  La precisión baja considerablemente. Recomendamos tomar la foto inmediatamente después de recibir el ticket.

  ### ¿Puedo usar gastos de hace 3 meses?
  Por defecto, solo se permiten gastos de los últimos 60 días. Contacta con RRHH si necesitas una excepción.

  ### ¿Qué pasa si mi manager no aprueba en X días?
  Actualmente no hay auto-aprobación. Recibirás recordatorios automáticos.

  ### ¿Puedo agrupar varios gastos en un informe?
  Sí, desde "Informes de Gastos" puedes crear informes agrupando gastos aprobados por período o viaje.
  ```

- [ ] **8.1.11** Sección: Troubleshooting
  ```markdown
  ## Troubleshooting

  ### El OCR no detecta ningún dato

  **Causas:**
  - Imagen borrosa o con poca luz
  - Ticket manuscrito
  - Formato no estándar

  **Soluciones:**
  1. Retomar foto con mejor iluminación
  2. Asegurar que el ticket esté plano
  3. Rellenar campos manualmente

  ### Error: "Debes adjuntar al menos un ticket"

  La política de tu organización requiere adjunto obligatorio. Sube una foto o PDF del ticket antes de enviar.

  ### Error: "No tienes un manager asignado"

  Tu contrato no tiene manager configurado. Contacta con RRHH para que lo asignen.

  ### El total calculado no coincide con el ticket

  Verifica:
  - Importe base correcto
  - % IVA correcto
  - Fórmula: Total = Base + (Base × IVA%)

  ### No puedo ver el botón "Aprobar"

  Solo puedes aprobar gastos de tu equipo directo. Verifica:
  - Eres manager del empleado
  - El gasto está en estado SUBMITTED
  - Tienes permisos de MANAGER o superior
  ```

### 8.2 Actualizar README Principal

**Actualizar:** `README.md` (si existe en raíz)

- [ ] **8.2.1** Añadir sección de módulos:
  ```markdown
  ## 📦 Módulos

  - ✅ Gestión de Empleados
  - ✅ Control Horario
  - ✅ Vacaciones (PTO)
  - ✅ Firma Electrónica
  - ✅ **Gestión de Gastos** (Nuevo)

  Ver documentación completa en [docs/EXPENSES.md](docs/EXPENSES.md)
  ```

### 8.3 Changelog

**Crear o actualizar:** `CHANGELOG.md`

- [ ] **8.3.1** Añadir entrada:
  ```markdown
  ## [Unreleased]

  ### Added
  - 🎉 Nuevo módulo: Gestión de Gastos
    - Captura de tickets desde cámara móvil
    - OCR automático con Tesseract.js (gratuito)
    - Flujo de aprobación por manager
    - Dashboard analytics con gráficos
    - Exportación CSV
    - Políticas configurables por organización
    - Cálculo automático de kilometraje
    - Notificaciones integradas

  ### Technical
  - Added 8 new database tables for expense management
  - Added 11 API endpoints
  - Added 4 server actions modules
  - Added OCR processing library (Tesseract.js)
  - Added 20+ UI components for expenses
  ```

### 8.4 Comentarios en Código

**En archivos clave, añadir JSDoc:**

- [ ] **8.4.1** En `src/lib/ocr/receipt-parser.ts`:
  ```typescript
  /**
   * Parsea el texto extraído de un ticket por OCR.
   *
   * Utiliza regex patterns y heurísticas para extraer:
   * - Total del gasto
   * - Fecha de emisión
   * - IVA aplicado
   * - CIF/NIF del comercio
   * - Nombre del comercio
   * - Datos de combustible (litros, precio/L)
   *
   * @param text - Texto raw del OCR (output de Tesseract)
   * @returns Objeto con campos parseados y confianza de cada campo
   *
   * @example
   * const result = parseReceiptText(ocrText);
   * console.log(result.total); // 45.50
   * console.log(result.confidence.total); // 0.95
   */
  export function parseReceiptText(text: string): ParsedReceipt {
    // ...
  }
  ```

- [ ] **8.4.2** En `src/hooks/use-receipt-ocr.ts`:
  ```typescript
  /**
   * Hook para procesar tickets con OCR.
   *
   * Ejecuta Tesseract.js en el navegador del usuario para:
   * 1. Preprocesar la imagen (grayscale, binarización)
   * 2. Extraer texto con OCR
   * 3. Parsear campos específicos (total, fecha, IVA, etc.)
   *
   * Performance: 3-8 segundos por imagen (depende del dispositivo).
   *
   * @example
   * const { processFile, suggestions, isProcessing } = useReceiptOcr();
   *
   * // Al subir archivo
   * await processFile(file);
   *
   * // Usar sugerencias
   * if (suggestions?.total) {
   *   form.setValue('amount', suggestions.total);
   * }
   */
  export function useReceiptOcr() {
    // ...
  }
  ```

- [ ] **8.4.3** En `src/server/actions/expenses.ts`:
  ```typescript
  /**
   * Envía un gasto a aprobación.
   *
   * Flujo:
   * 1. Valida que el gasto esté en DRAFT
   * 2. Valida contra la política de la organización
   * 3. Obtiene el manager del empleado
   * 4. Crea ExpenseApproval (nivel 1, PENDING)
   * 5. Cambia estado del gasto a SUBMITTED
   * 6. Notifica al manager
   *
   * @param expenseId - ID del gasto
   * @throws Error si no tiene manager, si no cumple política, o si ya fue enviado
   */
  export async function submitExpense(expenseId: string) {
    // ...
  }
  ```

---

## ✅ Checklist Final

### Pre-Merge

- [ ] Todas las migraciones creadas y committeadas
- [ ] Seed ejecutado y verificado en base de datos
- [ ] Todas las APIs testeadas con Thunder Client/Postman
- [ ] Todas las páginas visitadas y probadas manualmente
- [ ] OCR testeado con al menos 5 tickets diferentes
- [ ] Feature flag configurado correctamente
- [ ] Variables de entorno documentadas en `.env.example`
- [ ] README del módulo completo
- [ ] Comentarios JSDoc en funciones críticas
- [ ] No hay errores de ESLint
- [ ] No hay warnings de TypeScript
- [ ] Código formateado con Prettier

### Testing Manual

- [ ] **Como Empleado:**
  - [ ] Crear gasto en borrador
  - [ ] Subir foto de ticket
  - [ ] Ver sugerencias de OCR
  - [ ] Aplicar sugerencias
  - [ ] Completar formulario manualmente
  - [ ] Guardar borrador
  - [ ] Editar borrador
  - [ ] Eliminar borrador
  - [ ] Crear gasto de kilometraje
  - [ ] Enviar gasto a aprobación
  - [ ] Recibir notificación de aprobación/rechazo
  - [ ] Ver histórico de gastos

- [ ] **Como Manager:**
  - [ ] Ver bandeja de aprobaciones
  - [ ] Filtrar gastos pendientes
  - [ ] Ver detalle de gasto con imágenes
  - [ ] Aprobar gasto
  - [ ] Rechazar gasto (con motivo)
  - [ ] Verificar notificación enviada

- [ ] **Como Admin:**
  - [ ] Ver analytics de gastos
  - [ ] Ver gráficos (categorías, trend, top spenders)
  - [ ] Exportar CSV con filtros
  - [ ] Editar política de gastos
  - [ ] Verificar que los cambios se aplican

### Performance

- [ ] OCR completa en <10 segundos
- [ ] Upload de imágenes <3 segundos
- [ ] Carga de listado de gastos <2 segundos
- [ ] Carga de analytics <3 segundos
- [ ] Exportación CSV de 100 registros <5 segundos

### Security

- [ ] Validación de permisos en todas las APIs
- [ ] Filtrado por orgId en todas las queries
- [ ] Validación de ownership en edit/delete
- [ ] Validación de rol en aprobaciones
- [ ] Sanitización de inputs en formularios
- [ ] Validación de tipos de archivo en uploads
- [ ] Límite de tamaño de archivos (10MB)

### Deployment

- [ ] Documentación de deployment actualizada
- [ ] Scripts de migración testeados
- [ ] Rollback plan preparado
- [ ] Monitoreo de errores configurado (si aplica)
- [ ] Logs de auditoría implementados

---

## 📊 Métricas de Éxito

### KPIs a Monitorear

- [ ] **Adopción:**
  - % de empleados que usan el módulo
  - Número de gastos creados/mes
  - Tiempo promedio de creación de gasto

- [ ] **OCR:**
  - % de éxito en detección de campos
  - Tiempo promedio de procesamiento
  - % de usuarios que usan sugerencias

- [ ] **Aprobación:**
  - Tiempo promedio de aprobación
  - % de gastos aprobados vs rechazados
  - Tiempo que los gastos están en SUBMITTED

- [ ] **Satisfacción:**
  - Feedback de usuarios
  - % de gastos enviados sin errores
  - Reducción de tiempo vs proceso manual anterior

---

## 🚀 Siguientes Pasos (Post-MVP)

### Fase 2 (Futuro)

- [ ] Segundo nivel de aprobación automático
- [ ] Integración con sistemas de nómina
- [ ] Marca automática como REIMBURSED al exportar
- [ ] Plantillas de comercios conocidos (REPSOL, BP, etc.)
- [ ] ML para mejorar precisión del OCR
- [ ] App móvil nativa para mejor captura de fotos
- [ ] Integración con sistemas bancarios (importar transacciones)
- [ ] Reportes automáticos mensuales por empleado
- [ ] Dashboard para empleado (mi resumen mensual)
- [ ] Recordatorios automáticos a managers
- [ ] Política de auto-aprobación para montos pequeños
- [ ] Soporte multi-moneda con conversión automática

---

## 📝 Notas de Implementación

### Decisiones Técnicas

1. **OCR en Cliente vs Servidor:**
   - ✅ Cliente: Gratis, rápido, privacidad
   - ❌ Servidor: Costo, latencia, pero más potente
   - **Decisión:** Cliente para MVP, servidor para Fase 2

2. **Storage de Adjuntos:**
   - Usar sistema existente (`documentStorageService`)
   - Soporta Azure, R2, Local
   - Mantener consistency con documentos de empleados

3. **Notificaciones:**
   - Reusar sistema existente de PTO
   - Añadir tipos específicos de gastos
   - Misma UI y lógica de lectura

4. **Validaciones:**
   - Zod en cliente y servidor
   - Validaciones de negocio en server actions
   - UI muestra errores en tiempo real

5. **Multi-nivel de Aprobación:**
   - MVP: Solo 1 nivel
   - Preparado para futuro: `ExpenseApproval.level`
   - Backend ya soporta múltiples niveles

### Riesgos Identificados

1. **Precisión del OCR:**
   - Mitigación: Permitir edición manual
   - Mostrar confidence score
   - Mejorar con feedback de usuarios

2. **Performance con muchos adjuntos:**
   - Mitigación: Compresión de imágenes
   - Lazy loading de imágenes
   - Límite de 10MB por archivo

3. **Complejidad de políticas:**
   - Mitigación: UI simple para MVP
   - Documentación clara
   - Valores por defecto sensatos

4. **Adopción de usuarios:**
   - Mitigación: Onboarding tutorial
   - Documentación con ejemplos
   - Soporte activo durante rollout

---

**Fecha última actualización:** 2025-11-02
**Responsable:** [Tu nombre]
**Estado:** ⏳ Pendiente de inicio

# 💰 Plan Maestro de Gestión de Gastos y Políticas

Este documento detalla la arquitectura, configuración y lógica de negocio del módulo de Finanzas y Gastos del ERP. Su principal valor diferencial es la capacidad de operar en **Modo Híbrido** (Sector Privado y Sector Público).

---

## 1. Configuración de Políticas (`/dashboard/expenses/policies`)

Esta página es el centro de control para definir las reglas del juego. Cualquier cambio aquí afecta inmediatamente a las validaciones y cálculos de nuevos gastos.

### 📋 Guía de Campos

#### A. Límites de Gasto (Control Financiero)
Estos valores actúan como "topes" para controlar el presupuesto.

| Campo | Unidad | Explicación Funcional |
| :--- | :--- | :--- |
| **Comidas (Diario)** | € / día | Importe máximo permitido por día en concepto de dietas/manutención. Si un empleado sube tickets que suman más de este valor, el sistema generará una alerta o bloqueará el exceso. |
| **Alojamiento** | € / noche | Precio máximo por noche de hotel. Útil para evitar reservas de lujo no autorizadas. |
| **Kilometraje** | **€ / km** | **CRÍTICO**. Tarifa de reembolso para uso de vehículo propio. <br>• **Cálculo Automático**: Al crear un gasto de tipo "Kilometraje", el sistema multiplica: `Km introducidos × Tarifa Actual`. <br>• Ejemplo: `100km × 0.26€ = 26€`. |

#### B. Reglas de Aprobación (Control de Procesos)
Define la rigurosidad necesaria para que un gasto se convierta en un reembolso.

| Regla | Configuración | Impacto en el Sistema |
| :--- | :--- | :--- |
| **Niveles de Aprobación** | 1, 2 o 3 | • **1 Nivel**: Manager directo aprueba → Listo para pago.<br>• **2 Niveles**: Manager → Finanzas.<br>• **3 Niveles**: Manager → Director → Finanzas. |
| **Ticket Obligatorio** | ON / OFF | Si está activo (**ON**), el sistema **impide guardar** cualquier gasto que no tenga un archivo adjunto (PDF/Imagen). Fundamental para la deducción del IVA. |

---

## 2. Arquitectura Dual: Público vs. Privado

El sistema está diseñado para soportar dos paradigmas opuestos de gestión de gastos en la misma plataforma.

### 🏢 Modo Privado (Empresa Estándar)
*Enfoque: "Gasta y luego te pago"*

1.  **Origen**: El empleado realiza el gasto con su dinero o tarjeta de empresa.
2.  **Justificación**: Sube el ticket a posteriori.
3.  **Flujo**:
    `Gasto Realizado` → `Subida de Ticket` → `Aprobación Manager` → `Reembolso en Nómina/Transferencia`
4.  **Cálculo**: Basado en el importe real del ticket.

### 🏛️ Modo Público (Administración / Licitaciones)
*Enfoque: "Pide permiso, viaja con dietas y justifica"*

1.  **Origen**: El empleado solicita una **Comisión de Servicio** (Expediente).
2.  **Autorización**: Se aprueba un presupuesto estimado (Retención de crédito).
3.  **Ejecución**: El empleado viaja.
4.  **Justificación**:
    *   **Alojamiento/Transporte**: Justifica con factura real (Factura).
    *   **Manutención (Comidas)**: **NO** requiere ticket (en muchos casos), se paga una **Dieta Fija** por día (ej. 53,34€/día en territorio nacional según BOE).
5.  **Flujo**:
    `Solicitud Expediente` → `Autorización Previa` → `Viaje` → `Liquidación (Dietas + Facturas)` → `Cierre`

---

## 3. Expedientes de Gasto (`/dashboard/procedures`)

El módulo de expedientes (ya implementado) es la base del Modo Público y de la gestión de proyectos grandes.

### Estados del Ciclo de Vida

1.  **DRAFT (Borrador)**: El empleado está preparando la solicitud. No visible para managers.
2.  **PENDING_AUTHORIZATION**: Enviado. El manager debe revisar el presupuesto estimado y las fechas.
3.  **AUTHORIZED (Autorizado)**: El viaje/gasto está aprobado. El empleado puede empezar a imputar gastos reales a este expediente.
4.  **JUSTIFICATION_PENDING**: El viaje ha terminado. El empleado ha subido los gastos y solicita el cierre.
5.  **JUSTIFIED (Justificado)**: Finanzas valida que los documentos son correctos.
6.  **CLOSED (Cerrado)**: Expediente finalizado y contablemente cerrado.
7.  **REJECTED**: Denegado en cualquier punto.

---

## 4. Roadmap de Implementación

### ✅ Fase 1: Cimientos (Completada)
- [x] Base de datos de Políticas (`ExpensePolicy`).
- [x] CRUD de Gastos básicos.
- [x] CRUD de Expedientes (`Procedures`).
- [x] Página de Configuración de Políticas (`/dashboard/expenses/policies`).
- [x] Lógica de tarifas de kilometraje.

### 🛠️ Tareas Técnicas Pendientes (Lo que falta por conectar)

Aunque la configuración se guarda en base de datos, **aún no se aplica en el flujo de creación de gastos**. Estas son las tareas pendientes para que las políticas sean efectivas:

#### 1. Conectar Validación de Límites (Frontend & Backend)
- [ ] **Acción**: Modificar `createExpense` y `updateExpense` en el servidor.
- [ ] **Lógica**: Leer la política activa (`getOrganizationPolicy`) antes de guardar.
- [ ] **Validación**:
    - Si `amount > mealDailyLimit` y categoría es `MEAL` → Marcar flag `policy_violation` o impedir guardar (según config).
    - Si `amount > lodgingDailyLimit` y categoría es `LODGING` → Alerta.
- [ ] **UI**: Mostrar warning en el formulario de gastos (`ExpenseForm`) si el usuario introduce un importe superior al límite configurado.

#### 2. Implementar Cálculo de Kilometraje Dinámico
- [ ] **Acción**: En el formulario de gastos (`ExpenseForm`), cuando la categoría sea `MILEAGE`.
- [ ] **Lógica**:
    - Leer `mileageRateEurPerKm` de la política.
    - Input de `distance` (km) en lugar de `amount`.
    - Calcular `amount = distance * rate` automáticamente y bloquear edición manual del importe.

#### 3. Implementar Regla "Ticket Obligatorio"
- [ ] **Acción**: Validación en `ExpenseForm` y Server Action.
- [ ] **Lógica**:
    - Si `attachmentRequired === true` en política global.
    - O si `categoryRequirements[CAT].requiresReceipt === true`.
    - **Resultado**: El campo de adjuntos debe ser `required` en Zod y en el formulario HTML. Impedir envío si está vacío.

#### 4. Implementar Niveles de Aprobación
- [ ] **Acción**: Modificar lógica de transición de estados en `approveExpense` / `approveProcedure`.
- [ ] **Lógica Actual**: `PENDING` → `APPROVED`.
- [ ] **Lógica Nueva**:
    - Si `approvalLevels > 1`:
    - `PENDING` → `APPROVED_L1` (Manager) → `PENDING_L2` (Finanzas) → `APPROVED`.
- [ ] **UI**: Mostrar barra de progreso de aprobación en el detalle del gasto.

#### 5. Selector de Modo (Público/Privado)
- [ ] **Acción**: Hacer que el switch de "Modo de Organización" en la página de políticas cambie realmente el comportamiento de la UI.
- [ ] **Efecto**:
    - Si `Modo === PUBLIC`: Ocultar menú "Mis Gastos" y forzar entrada por "Expedientes".
    - Si `Modo === PRIVATE`: Permitir gastos sueltos sin expediente.

### 🔮 Fase 3: Sector Público Avanzado (Futuro)
- [ ] **Motor de Dietas (Per Diem)**:
    - Calculadora automática: `Días de viaje × Tarifa BOE = Total a pagar`.
    - Detección de medias dietas vs. dietas completas.
- [ ] **Liquidación Oficial**:
    - Generación de PDF oficial de "Liquidación de Gastos de Viaje" (modelo estandarizado).

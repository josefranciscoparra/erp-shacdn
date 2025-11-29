# Plan: Sistema de Permisos Unificado

> **Estado:** Planificación futura
> **Fecha:** 2024-11-27
> **Prioridad:** Media-Alta

---

## Objetivo

Unificar todos los sistemas de permisos de la aplicación en un único modelo coherente, eliminando la fragmentación actual entre diferentes módulos (ausencias, fichajes, gastos, etc.).

---

## Estado Actual (Problema)

### Sistemas de permisos fragmentados:

| Módulo                | Sistema Actual                | Problema                            |
| --------------------- | ----------------------------- | ----------------------------------- |
| **Ausencias (PTO)**   | `AreaResponsible` + jerarquía | ✅ Funciona bien                    |
| **Fichajes manuales** | `AreaResponsible` + jerarquía | ✅ Funciona bien                    |
| **Alertas**           | `AreaResponsible` + scope     | ✅ Funciona bien                    |
| **Gastos**            | `ExpenseApprover` (separado)  | ❌ Sistema diferente, sin jerarquía |

### Código actual de gastos (`approval-engine.ts` línea 90):

```typescript
EXPENSE: "MANAGE_EMPLOYEES", // Temporal, debería ser APPROVE_EXPENSES si existiera
```

---

## Solución Propuesta

### 1. Modelo de Permisos Público vs Privado

#### Modelo Público (Cloud/SaaS)

- Permisos predefinidos por rol
- Jerarquía estándar: Manager → HR → Admin
- Configuración limitada por plan de suscripción

#### Modelo Privado (On-Premise/Enterprise)

- Permisos 100% configurables
- Jerarquía personalizable por organización
- Sin restricciones de plan

### 2. Unificación de Gastos al Sistema de Jerarquía

Los gastos deben funcionar **exactamente igual** que ausencias y fichajes:

```
Empleado solicita gasto
       ↓
Responsable directo (MANAGER)
       ↓ (si no hay o no aprueba)
Responsable de Equipo
       ↓ (si no hay)
Responsable del Centro
       ↓ (si no hay)
Recursos Humanos / Finanzas
```

### 3. Modos de Aprobación Configurables

#### Opción A: Aprobación Única

El gasto/ausencia requiere **UNA sola aprobación**:

```
┌─────────────────────────────────────────┐
│  MODO: Aprobación Única                 │
├─────────────────────────────────────────┤
│  Elegir aprobador:                      │
│  ○ Principio de jerarquía (Manager)     │
│  ○ Recursos Humanos                     │
│  ○ Finanzas (solo para gastos)          │
└─────────────────────────────────────────┘
```

**Flujo:**

```
Solicitud → Aprobador elegido → ✅ Aprobado / ❌ Rechazado
```

#### Opción B: Aprobación Doble

El gasto/ausencia requiere **DOS aprobaciones** en secuencia:

```
┌─────────────────────────────────────────┐
│  MODO: Aprobación Doble                 │
├─────────────────────────────────────────┤
│  1ª Aprobación: Principio de jerarquía  │
│  2ª Aprobación:                         │
│     ○ Recursos Humanos                  │
│     ○ Finanzas                          │
└─────────────────────────────────────────┘
```

**Flujo:**

```
Solicitud → Manager aprueba → RRHH/Finanzas aprueba → ✅ Aprobado final
                ↓                      ↓
           ❌ Rechazado           ❌ Rechazado
```

---

## Configuración por Tipo de Solicitud

Cada tipo de solicitud puede tener su propia configuración:

| Tipo                  | Modo por defecto             | Configurable |
| --------------------- | ---------------------------- | ------------ |
| **Ausencias**         | Única (Jerarquía)            | ✅           |
| **Fichajes manuales** | Única (Jerarquía)            | ✅           |
| **Gastos**            | Doble (Jerarquía + Finanzas) | ✅           |
| **Horas extra**       | Doble (Jerarquía + RRHH)     | ✅           |

---

## Modelo de Datos Propuesto

### Nueva tabla: `ApprovalConfiguration`

```prisma
model ApprovalConfiguration {
  id              String   @id @default(cuid())
  orgId           String

  // Tipo de solicitud
  requestType     RequestType  // PTO, MANUAL_TIME_ENTRY, EXPENSE, OVERTIME

  // Modo de aprobación
  approvalMode    ApprovalMode // SINGLE, DOUBLE

  // Para modo SINGLE: quién aprueba
  singleApprover  ApproverType? // HIERARCHY, HR, FINANCE

  // Para modo DOUBLE: segundo aprobador
  secondApprover  ApproverType? // HR, FINANCE

  // Configuraciones adicionales
  requiresAmount  Decimal?     // Monto mínimo para requerir doble aprobación

  organization    Organization @relation(fields: [orgId], references: [id])

  @@unique([orgId, requestType])
}

enum ApprovalMode {
  SINGLE
  DOUBLE
}

enum ApproverType {
  HIERARCHY   // Principio de jerarquía (Manager → Centro → RRHH)
  HR          // Recursos Humanos directamente
  FINANCE     // Finanzas directamente
}
```

### Modificar: `ExpenseApproval` para soportar doble aprobación

```prisma
model ExpenseApproval {
  id                String   @id @default(cuid())
  expenseId         String

  // Primera aprobación (jerarquía)
  firstApproverId   String?
  firstApprovalDate DateTime?
  firstApprovalStatus ApprovalStatus?

  // Segunda aprobación (RRHH/Finanzas)
  secondApproverId  String?
  secondApprovalDate DateTime?
  secondApprovalStatus ApprovalStatus?

  // Estado final
  finalStatus       ApprovalStatus

  expense           Expense  @relation(fields: [expenseId], references: [id])
  firstApprover     User?    @relation("FirstApprover", fields: [firstApproverId], references: [id])
  secondApprover    User?    @relation("SecondApprover", fields: [secondApproverId], references: [id])
}
```

---

## UI de Configuración

### Ubicación: `/dashboard/settings/approvals`

```
┌─────────────────────────────────────────────────────────────┐
│  Configuración de Aprobaciones                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Ausencias (PTO)                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Modo: [Aprobación única ▼]                          │   │
│  │ Aprobador: [Principio de jerarquía ▼]               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Fichajes Manuales                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Modo: [Aprobación única ▼]                          │   │
│  │ Aprobador: [Principio de jerarquía ▼]               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Gastos                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Modo: [Aprobación doble ▼]                          │   │
│  │ 1ª Aprobación: Principio de jerarquía (fijo)        │   │
│  │ 2ª Aprobación: [Finanzas ▼]                         │   │
│  │                                                      │   │
│  │ □ Requerir doble aprobación solo para gastos > €500 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Fases de Implementación

### Fase 1: Preparación (Estimación: 1 sprint)

- [ ] Crear modelo `ApprovalConfiguration`
- [ ] Migrar `ExpenseApprover` a usar `AreaResponsible`
- [ ] Añadir permiso `APPROVE_EXPENSES`

### Fase 2: Backend (Estimación: 2 sprints)

- [ ] Modificar `approval-engine.ts` para leer configuración
- [ ] Implementar lógica de doble aprobación
- [ ] Crear server actions para gestionar configuración

### Fase 3: UI (Estimación: 1 sprint)

- [ ] Crear página `/dashboard/settings/approvals`
- [ ] Actualizar flujos de aprobación existentes
- [ ] Añadir indicadores visuales de "pendiente 2ª aprobación"

### Fase 4: Migración (Estimación: 1 sprint)

- [ ] Script de migración de datos existentes
- [ ] Testing completo
- [ ] Documentación

---

## Mejora: Aprobadores de Gastos Designados (Organizaciones Grandes)

### Problema

En organizaciones grandes con muchos usuarios de RRHH (ej: 100 personas en el departamento), no tiene sentido que TODOS reciban las solicitudes de gastos. Se necesita poder designar **personas específicas** como aprobadores de gastos/finanzas.

### Solución Propuesta

Añadir un **flag/check** a nivel de usuario que indique si es "Aprobador de Gastos" o "Finanzas":

```
┌─────────────────────────────────────────────────────────────┐
│  Perfil de Usuario: María García                            │
├─────────────────────────────────────────────────────────────┤
│  Rol: HR_ADMIN                                              │
│                                                             │
│  Capacidades especiales:                                    │
│  ☑ Aprobador de gastos (Finanzas)                          │
│  ☐ Aprobador de horas extra                                 │
│  ☐ Aprobador de nóminas                                     │
└─────────────────────────────────────────────────────────────┘
```

### Modelo de Datos

```prisma
model User {
  // ... campos existentes ...

  // Flags de aprobador designado
  isExpenseApprover    Boolean @default(false)  // Aprobador de gastos
  isOvertimeApprover   Boolean @default(false)  // Aprobador de horas extra
  isPayrollApprover    Boolean @default(false)  // Aprobador de nóminas
}
```

### Flujo de Aprobación con Designados

```
Solicitud de gasto
       ↓
1ª Aprobación: Manager (jerarquía)
       ↓
2ª Aprobación: Usuario con flag `isExpenseApprover = true`
              (NO todo RRHH, solo los designados)
```

### UI de Configuración

**En la página de usuarios** (`/dashboard/employees/[id]/edit`):

```
┌─────────────────────────────────────────────────────────────┐
│  Permisos Especiales                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Este usuario puede aprobar:                                │
│                                                             │
│  ☑ Gastos                                                   │
│     Los gastos pendientes de 2ª aprobación le llegarán      │
│     a este usuario                                          │
│                                                             │
│  ☐ Horas extra                                              │
│     Las solicitudes de horas extra le llegarán              │
│                                                             │
│  ☐ Nóminas                                                  │
│     Puede aprobar y firmar nóminas                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Beneficios

- **Escalabilidad**: Funciona para organizaciones de cualquier tamaño
- **Flexibilidad**: No todos los RRHH/Admins reciben todo
- **Separación de responsabilidades**: Distintas personas para distintas aprobaciones
- **Auditoría**: Claro quién puede aprobar qué

### Ejemplo de Uso

| Organización      | RRHH Total | Aprobadores Gastos | Aprobadores Nóminas |
| ----------------- | ---------- | ------------------ | ------------------- |
| Pequeña (10 emp)  | 1          | 1 (mismo RRHH)     | 1 (mismo RRHH)      |
| Mediana (100 emp) | 5          | 2 designados       | 1 designado         |
| Grande (1000 emp) | 50         | 5 designados       | 3 designados        |

---

## Decisiones Pendientes

1. **¿Mantener `ExpenseApprover` o migrar todo a `AreaResponsible`?**
   - Opción A: Migrar completamente (más limpio)
   - Opción B: Mantener ambos (menos riesgo)

2. **¿Permitir configuración por centro de coste?**
   - Algunos centros pueden necesitar doble aprobación y otros no

3. **¿Límites de monto para escalar aprobaciones?**
   - Ej: Gastos > €1000 requieren aprobación de dirección

4. **¿Cómo distribuir gastos entre múltiples aprobadores designados?**
   - Opción A: Round-robin (reparto equitativo)
   - Opción B: Todos reciben notificación, el primero que actúa lo resuelve
   - Opción C: Por centro de coste (cada aprobador tiene centros asignados)

---

## Referencias

- `/docs/PLAN_ALERTAS_V2.md` - Sistema actual de responsables
- `/src/lib/approvals/approval-engine.ts` - Motor de aprobaciones
- `/src/server/actions/expense-approvals.ts` - Sistema actual de gastos
- `/src/lib/permissions/scope-helpers.ts` - Helpers de scope/jerarquía

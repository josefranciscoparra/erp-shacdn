# IMPL_01 - Liquidación de Vacaciones + Fijos Discontinuos

## Estado General: 🟡 En Progreso (Backend Completado)

> **Rama:** `feature/mejora-01-liquidacion`
> **Inicio:** 2024-12-05
> **Documento requisitos:** [PLAN1_LIQUIDACION.md](../PLAN1_LIQUIDACION.md)

---

## Información Funcional Recopilada

### Liquidación de Vacaciones

| Aspecto | Decisión |
|---------|----------|
| **Fórmula base** | 2.5 días/mes trabajado (configurable por org) |
| **Configurable** | Sí, usa `annualPtoDays` de Organization |
| **Ubicación UI** | Menú propio "Liquidaciones" + Pestaña en perfil empleado |
| **Fórmula liquidación** | `saldoFinal = devengado - disfrutado - pendiente` |

### Fijos Discontinuos

| Aspecto | Decisión |
|---------|----------|
| **Vacaciones al pausar** | Se mantienen congeladas (solo el intervalo pausado) |
| **Permisos pausa/reanuda** | Admin + RRHH (HR_MANAGER) |
| **Comportamiento pausado** | No genera vacaciones, no computa horas |
| **Devengo** | Solo durante períodos ACTIVE |

### Diferencia Contrato Normal vs Fijo Discontinuo

| Aspecto | Normal | Fijo Discontinuo |
|---------|--------|------------------|
| **Asignación inicial** | Días completos al inicio del año | NO se asignan días |
| **Devengo** | Todo el período | Solo períodos ACTIVE |
| **Liquidación** | Proporcional a días trabajados | Proporcional a días activos |

---

## Micro-tareas

### Fase 1: Análisis de Código Existente ✅ COMPLETADA
- [x] Revisar modelo Contract actual
- [x] Revisar modelo PtoBalance/PtoRequest
- [x] Identificar cálculos de vacaciones existentes
- [x] Documentar hallazgos

### Fase 2: Modelo de Datos ✅ COMPLETADA
- [x] Añadir enum `DiscontinuousStatus` (ACTIVE, PAUSED)
- [x] Añadir enum `SettlementStatus` (PENDING, PAID, COMPENSATED)
- [x] Añadir campo `discontinuousStatus` a EmploymentContract
- [x] Crear modelo `ContractPauseHistory`
- [x] Crear modelo `VacationSettlement`
- [x] Añadir relaciones en Organization y Employee
- [x] Ejecutar sincronización con `prisma db push`
- [x] Mantener `contractType` como String (ya tiene valor "FIJO_DISCONTINUO")

### Fase 3: Lógica de Cálculo ✅ COMPLETADA
- [x] Crear `/src/lib/vacation-calculator.ts`
- [x] Función `daysToMinutes(days, workdayMinutes)`
- [x] Función `minutesToDays(minutes, workdayMinutes)`
- [x] Función `getContractWorkdayMinutes(weeklyHours, workingDaysPerWeek)`
- [x] Función `daysBetween(startDate, endDate)`
- [x] Función `calculateActiveDays(contract, cutoffDate)` - meses trabajados (resta pausas)
- [x] Función `calculateVacationAccrual(employeeId, cutoffDate)` - devengo proporcional
- [x] Función `calculateSettlementBalance(employeeId, cutoffDate)` - balance final
- [x] Función `getDiscontinuousSummary(contractId)` - resumen de discontinuidad
- [x] Función `validateContractResume(contractId)` - validación para reanudar

### Fase 4: Server Actions - Fijos Discontinuos ✅ COMPLETADA
- [x] Crear `/src/server/actions/contract-discontinuous.ts`
- [x] Función `pauseContract(contractId, reason?)` - con auditoría
- [x] Función `resumeContract(contractId)` - con validaciones
- [x] Función `getDiscontinuousSummary(contractId)`
- [x] Función `getContractPauseHistory(contractId)`
- [x] Función `isContractPaused(employeeId)` - útil para validaciones

### Fase 5: Server Actions - Liquidación ✅ COMPLETADA
- [x] Crear `/src/server/actions/vacation-settlement.ts`
- [x] Función `calculateSettlement(employeeId, cutoffDate)` - solo cálculo
- [x] Función `createSettlement(data)` - crear manual
- [x] Función `autoCreateSettlement(contractId, date, userId)` - al finalizar contrato
- [x] Función `updateSettlementStatus(id, status, notes)`
- [x] Función `getEmployeeSettlements(employeeId)`
- [x] Función `getOrganizationSettlements(filters?)`
- [x] Función `getSettlementDetail(settlementId)`
- [x] Función `deleteSettlement(settlementId)` - solo PENDING

### Fase 6: Modificar Cálculo PTO Existente ✅ COMPLETADA
- [x] Modificar `calculateAnnualAllowance()` para soportar fijos discontinuos
- [x] Modificar `calculateOrUpdatePtoBalance()` para incluir historial de pausas
- [x] Devengo proporcional solo sobre días ACTIVE

### Fase 7: UI - Menú Liquidaciones ⏳ PENDIENTE
- [ ] Crear ruta `/dashboard/settlements/`
- [ ] Componente `SettlementsDataTable` - listado con tabs
- [ ] Componente `NewSettlementDialog` - calcular nueva
- [ ] Componente `SettlementDetail` - ver detalle
- [ ] Añadir al sidebar de navegación

### Fase 8: UI - Perfil Empleado ⏳ PENDIENTE
- [ ] Añadir pestaña "Liquidaciones" en `/dashboard/employees/[id]/`
- [ ] Mostrar historial de liquidaciones del empleado
- [ ] Botón "Nueva liquidación" desde perfil
- [ ] Indicador visual cuando devengo congelado (PAUSED)

### Fase 9: UI - Contratos Fijos Discontinuos ⏳ PENDIENTE
- [ ] Modificar formulario de contrato para tipo "Fijo Discontinuo"
- [ ] Añadir botones "Pausar" / "Reanudar" en detalle de contrato
- [ ] Mostrar estado actual (Activo/Pausado) con badge
- [ ] Mostrar historial de pausas/reanudaciones

### Fase 10: Finalización ⏳ PENDIENTE
- [ ] Exportar liquidación a PDF
- [ ] Exportar liquidación a CSV
- [ ] Pruebas completas de flujo
- [ ] Validación con usuario
- [ ] Merge a main
- [ ] Actualizar DUS

---

## Archivos Creados/Modificados

### Nuevos ✅
- `/prisma/schema.prisma` - Enums y modelos nuevos
- `/src/lib/vacation-calculator.ts` - Lógica de cálculo
- `/src/server/actions/vacation-settlement.ts` - Server actions liquidación
- `/src/server/actions/contract-discontinuous.ts` - Server actions fijos discontinuos

### Modificados ✅
- `/src/server/actions/pto-balance.ts` - Soporte para fijos discontinuos

### Pendientes UI
- `/src/app/(main)/dashboard/settlements/` - Nueva ruta
- `/src/navigation/sidebar-nav.tsx` - Añadir menú Liquidaciones
- Componentes de contrato existentes

---

## Modelo de Datos Implementado

```prisma
// Enums añadidos
enum DiscontinuousStatus {
  ACTIVE
  PAUSED
}

enum SettlementStatus {
  PENDING
  PAID
  COMPENSATED
}

// Campo añadido a EmploymentContract
model EmploymentContract {
  // ... existentes
  discontinuousStatus DiscontinuousStatus?
  pauseHistory        ContractPauseHistory[]
}

// Nuevo modelo: Historial de pausas
model ContractPauseHistory {
  id          String   @id @default(cuid())
  contractId  String
  contract    EmploymentContract @relation(...)
  action      String   // "PAUSE" | "RESUME"
  startDate   DateTime
  endDate     DateTime?
  reason      String?
  performedBy String
  performedAt DateTime @default(now())
}

// Nuevo modelo: Liquidaciones
model VacationSettlement {
  id              String   @id @default(cuid())
  orgId           String
  employeeId      String
  contractId      String?
  settlementDate  DateTime

  // Días
  accruedDays     Decimal @db.Decimal(5, 2)
  usedDays        Decimal @db.Decimal(5, 2)
  pendingDays     Decimal @db.Decimal(5, 2)
  balanceDays     Decimal @db.Decimal(5, 2)

  // Minutos (coherencia con sistema PTO)
  accruedMinutes  Int
  usedMinutes     Int
  pendingMinutes  Int
  balanceMinutes  Int
  workdayMinutes  Int

  status          SettlementStatus @default(PENDING)
  isAutoGenerated Boolean @default(false)
  notes           String?
  createdBy       String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

---

## Notas Técnicas

- `contractType` se mantiene como String (ya existía "FIJO_DISCONTINUO")
- Sistema PTO usa minutos internamente, liquidaciones muestran días
- Auditoría completa en AuditLog para todas las operaciones
- Validación de reanudación: no fichajes en período pausado
- Permisos: Solo ADMIN y HR_MANAGER pueden pausar/reanudar/liquidar

---

## Historial

| Fecha | Cambio |
|-------|--------|
| 2024-12-05 | Documento creado con información inicial |
| 2024-12-05 | Fase 1 completada - Análisis de código |
| 2024-12-05 | Fase 2 completada - Modelo de datos |
| 2024-12-05 | Fase 3 completada - Lógica de cálculo |
| 2024-12-05 | Fase 4 completada - Server actions fijos discontinuos |
| 2024-12-05 | Fase 5 completada - Server actions liquidación |
| 2024-12-05 | Fase 6 completada - Modificación cálculo PTO |

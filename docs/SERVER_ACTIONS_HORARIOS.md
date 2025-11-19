# Server Actions - Sistema de Horarios V2.0

**Fecha:** 2025-11-19
**Versión:** 1.0
**Estado:** Implementado ✅

---

## 📄 Navegación

← [Volver al Plan Principal](./PLAN_MIGRACION_HORARIOS_V2.md)
← [Ver Arquitectura](./ARQUITECTURA_HORARIOS_V2.md)
← [Ver Motor de Cálculo](./MOTOR_CALCULO_HORARIOS.md)

---

## 📚 Índice

1. [CRUD de Plantillas](#crud-de-plantillas)
2. [Gestión de Períodos](#gestión-de-períodos)
3. [Gestión de Patrones y Slots](#gestión-de-patrones-y-slots)
4. [Asignación a Empleados](#asignación-a-empleados)
5. [Excepciones de Día](#excepciones-de-día)
6. [Importación/Exportación](#importaciónexportación)

---

## 📂 Archivo Principal

**Ubicación:** `/src/server/actions/schedules-v2.ts`

Contiene todas las server actions del sistema de horarios V2.0.

---

## 🗂️ CRUD de Plantillas

### `createScheduleTemplate()`

**Firma:**
```typescript
export async function createScheduleTemplate(data: {
  name: string
  description?: string
  templateType: ScheduleTemplateType
}): Promise<{ success: boolean; data?: ScheduleTemplate; error?: string }>
```

**Descripción:**
Crea una nueva plantilla de horario.

**Ejemplo:**
```typescript
const result = await createScheduleTemplate({
  name: "Horario Oficina 40h",
  description: "Horario estándar L-V 9:00-18:00",
  templateType: "FIXED"
})

if (result.success) {
  console.log("Plantilla creada:", result.data.id)
}
```

---

### `updateScheduleTemplate()`

**Firma:**
```typescript
export async function updateScheduleTemplate(
  id: string,
  data: Partial<ScheduleTemplate>
): Promise<{ success: boolean; error?: string }>
```

**Descripción:**
Actualiza una plantilla existente.

**Ejemplo:**
```typescript
await updateScheduleTemplate('tpl_123', {
  name: "Horario Oficina 40h (Actualizado)",
  isActive: true
})
```

---

### `deleteScheduleTemplate()`

**Firma:**
```typescript
export async function deleteScheduleTemplate(
  id: string
): Promise<{ success: boolean; error?: string }>
```

**Descripción:**
Elimina una plantilla (solo si no tiene empleados asignados).

**Validación:**
- Verifica que no haya asignaciones activas
- Si hay empleados asignados, retorna error

**Ejemplo:**
```typescript
const result = await deleteScheduleTemplate('tpl_123')

if (!result.success) {
  console.error(result.error) // "No se puede eliminar: tiene empleados asignados"
}
```

---

### `duplicateScheduleTemplate()`

**Firma:**
```typescript
export async function duplicateScheduleTemplate(
  id: string,
  newName: string
): Promise<{ success: boolean; data?: ScheduleTemplate; error?: string }>
```

**Descripción:**
Duplica una plantilla completa (incluye períodos, patrones y slots).

**Ejemplo:**
```typescript
const result = await duplicateScheduleTemplate(
  'tpl_123',
  "Horario Oficina 40h (Copia)"
)

console.log("Nueva plantilla:", result.data.id)
```

---

### `getScheduleTemplates()`

**Firma:**
```typescript
export async function getScheduleTemplates(
  filters?: { templateType?: ScheduleTemplateType; isActive?: boolean }
): Promise<ScheduleTemplate[]>
```

**Descripción:**
Obtiene todas las plantillas de la organización con filtros opcionales.

**Ejemplo:**
```typescript
// Todas las plantillas activas de tipo FIXED
const templates = await getScheduleTemplates({
  templateType: "FIXED",
  isActive: true
})
```

---

## 📅 Gestión de Períodos

### `createSchedulePeriod()`

**Firma:**
```typescript
export async function createSchedulePeriod(
  templateId: string,
  data: {
    periodType: SchedulePeriodType
    name?: string
    validFrom?: Date
    validTo?: Date
  }
): Promise<{ success: boolean; data?: SchedulePeriod; error?: string }>
```

**Descripción:**
Crea un nuevo período dentro de una plantilla.

**Validación:**
- REGULAR debe tener `validFrom=null, validTo=null`
- INTENSIVE/SPECIAL deben tener fechas definidas
- No permitir solapamientos de fechas

**Ejemplo:**
```typescript
// Período intensivo de verano
await createSchedulePeriod('tpl_123', {
  periodType: "INTENSIVE",
  name: "Verano 2025",
  validFrom: new Date('2025-06-15'),
  validTo: new Date('2025-09-01')
})
```

---

### `updateSchedulePeriod()`

**Firma:**
```typescript
export async function updateSchedulePeriod(
  id: string,
  data: Partial<SchedulePeriod>
): Promise<{ success: boolean; error?: string }>
```

**Descripción:**
Actualiza un período existente.

---

### `deleteSchedulePeriod()`

**Firma:**
```typescript
export async function deleteSchedulePeriod(
  id: string
): Promise<{ success: boolean; error?: string }>
```

**Descripción:**
Elimina un período (no se puede eliminar el período REGULAR).

**Validación:**
- Impide eliminar período REGULAR (obligatorio)
- Elimina en cascada patrones y slots

---

## 🕐 Gestión de Patrones y Slots

### `updateWorkDayPattern()`

**Firma:**
```typescript
export async function updateWorkDayPattern(
  periodId: string,
  dayOfWeek: number,
  data: {
    isWorkingDay: boolean
    timeSlots: Array<{
      startTimeMinutes: number
      endTimeMinutes: number
      slotType: TimeSlotType
      presenceType: PresenceType
      description?: string
    }>
  }
): Promise<{ success: boolean; error?: string }>
```

**Descripción:**
Actualiza el patrón de un día de la semana (reemplaza slots existentes).

**Ejemplo:**
```typescript
await updateWorkDayPattern('period_123', 1, { // Lunes (1)
  isWorkingDay: true,
  timeSlots: [
    {
      startTimeMinutes: 540,  // 09:00
      endTimeMinutes: 840,    // 14:00
      slotType: "WORK",
      presenceType: "MANDATORY"
    },
    {
      startTimeMinutes: 840,  // 14:00
      endTimeMinutes: 900,    // 15:00
      slotType: "BREAK",
      presenceType: "MANDATORY"
    },
    {
      startTimeMinutes: 900,  // 15:00
      endTimeMinutes: 1080,   // 18:00
      slotType: "WORK",
      presenceType: "MANDATORY"
    }
  ]
})
```

---

## 👥 Asignación a Empleados

### `assignScheduleToEmployee()`

**Firma:**
```typescript
export async function assignScheduleToEmployee(
  employeeId: string,
  data: {
    assignmentType: ScheduleAssignmentType
    scheduleTemplateId?: string
    rotationPatternId?: string
    rotationStartDate?: Date
    validFrom: Date
    validTo?: Date
  }
): Promise<{ success: boolean; data?: EmployeeScheduleAssignment; error?: string }>
```

**Descripción:**
Asigna una plantilla o rotación a un empleado.

**Lógica:**
- Cierra asignaciones anteriores que se solapen (establece `validTo`)
- Auto-infiere `assignmentType` desde `templateType` de la plantilla
- Mantiene `isActive=true` para consultas históricas

**Ejemplo FIXED:**
```typescript
await assignScheduleToEmployee('emp_123', {
  assignmentType: "FIXED",
  scheduleTemplateId: 'tpl_123',
  validFrom: new Date('2025-01-01'),
  validTo: null // Indefinido
})
```

**Ejemplo ROTATION:**
```typescript
await assignScheduleToEmployee('emp_456', {
  assignmentType: "ROTATION",
  rotationPatternId: 'rot_123',
  rotationStartDate: new Date('2025-01-15'),
  validFrom: new Date('2025-01-15'),
  validTo: null
})
```

---

### `getEmployeeScheduleHistory()`

**Firma:**
```typescript
export async function getEmployeeScheduleHistory(
  employeeId: string
): Promise<EmployeeScheduleAssignment[]>
```

**Descripción:**
Obtiene el historial completo de asignaciones de un empleado (incluye pasadas y futuras).

**Ejemplo:**
```typescript
const history = await getEmployeeScheduleHistory('emp_123')

history.forEach(assignment => {
  console.log(
    `${assignment.scheduleTemplate.name}: ${assignment.validFrom} - ${assignment.validTo ?? 'Actual'}`
  )
})
// Horario A: 2025-01-01 - 2025-06-14
// Horario B: 2025-06-15 - Actual
```

---

### `getEmployeeCurrentSchedule()`

**Firma:**
```typescript
export async function getEmployeeCurrentSchedule(
  employeeId: string,
  date?: Date
): Promise<EmployeeScheduleAssignment | null>
```

**Descripción:**
Obtiene la asignación activa de un empleado en una fecha específica (por defecto hoy).

**Ejemplo:**
```typescript
const current = await getEmployeeCurrentSchedule('emp_123')

console.log(current.scheduleTemplate.name) // "Horario Oficina 40h"
```

---

### `getAvailableEmployeesForTemplate()`

**Firma:**
```typescript
export async function getAvailableEmployeesForTemplate(
  templateId: string
): Promise<Employee[]>
```

**Descripción:**
Obtiene empleados que NO están asignados a una plantilla específica (para dialog de asignación).

---

### `getTemplateAssignedEmployees()`

**Firma:**
```typescript
export async function getTemplateAssignedEmployees(
  templateId: string
): Promise<EmployeeScheduleAssignment[]>
```

**Descripción:**
Obtiene todos los empleados asignados a una plantilla (incluye datos de empleado).

---

### `endEmployeeAssignment()`

**Firma:**
```typescript
export async function endEmployeeAssignment(
  assignmentId: string
): Promise<{ success: boolean; error?: string }>
```

**Descripción:**
Finaliza una asignación (establece `validTo` a hoy).

**Ejemplo:**
```typescript
await endEmployeeAssignment('assignment_123')
```

---

## 🚨 Excepciones de Día

### `createExceptionDay()`

**Firma:**
```typescript
export async function createExceptionDay(data: {
  employeeId?: string
  scheduleTemplateId?: string
  date: Date
  reason?: string
  overrideSlots: Array<{
    startTimeMinutes: number
    endTimeMinutes: number
    slotType: TimeSlotType
    presenceType: PresenceType
  }>
}): Promise<{ success: boolean; data?: ExceptionDayOverride; error?: string }>
```

**Descripción:**
Crea una excepción de día para un empleado o plantilla específica.

**Ejemplo - Viernes Santo:**
```typescript
await createExceptionDay({
  scheduleTemplateId: 'tpl_123',
  date: new Date('2025-04-18'),
  reason: "Viernes Santo",
  overrideSlots: [
    {
      startTimeMinutes: 540,  // 09:00
      endTimeMinutes: 768,    // 12:48
      slotType: "WORK",
      presenceType: "MANDATORY"
    }
  ]
})
```

**Ejemplo - Cierre excepcional:**
```typescript
await createExceptionDay({
  scheduleTemplateId: 'tpl_123',
  date: new Date('2025-12-24'),
  reason: "Nochebuena - Cierre empresa",
  overrideSlots: [] // Sin slots = día no laboral
})
```

---

### `deleteExceptionDay()`

**Firma:**
```typescript
export async function deleteExceptionDay(
  id: string
): Promise<{ success: boolean; error?: string }>
```

**Descripción:**
Elimina una excepción.

---

## 📊 Importación/Exportación

### `importSchedulesFromCSV()`

**Firma:**
```typescript
export async function importSchedulesFromCSV(
  file: File
): Promise<{ success: boolean; imported: number; errors: string[] }>
```

**Descripción:**
Importa asignaciones de horarios desde archivo CSV/Excel.

**Formato CSV esperado:**
```csv
empleado_numero,plantilla_horario,tipo_asignacion,fecha_desde,fecha_hasta,rotacion_inicio
TMNW00001,horario-oficina-40h,FIXED,2025-01-01,2025-12-31,
TMNW00002,rotacion-policia-6x6,ROTATION,2025-01-01,,2025-01-15
TMNW00003,teletrabajo-flexible,FLEXIBLE,2025-01-01,,
```

**Validaciones:**
- Empleado existe
- Plantilla/rotación existe
- Fechas válidas
- No solapamientos

**Retorno:**
```typescript
{
  success: true,
  imported: 15,
  errors: [
    "Línea 3: Empleado TMNW99999 no encontrado",
    "Línea 5: Plantilla inexistente"
  ]
}
```

---

### `exportSchedulesToExcel()`

**Firma:**
```typescript
export async function exportSchedulesToExcel(
  filters?: { employeeIds?: string[]; templateIds?: string[] }
): Promise<{ success: boolean; fileUrl?: string; error?: string }>
```

**Descripción:**
Exporta plantillas y asignaciones a Excel (múltiples hojas).

**Hojas:**
1. Plantillas
2. Períodos
3. Asignaciones
4. Patrones semanales

---

### `exportScheduleReport()`

**Firma:**
```typescript
export async function exportScheduleReport(
  employeeId: string,
  month: Date,
  format: 'PDF' | 'EXCEL'
): Promise<{ success: boolean; fileUrl?: string; error?: string }>
```

**Descripción:**
Exporta reporte legal de jornada para un empleado (mensual).

**Contenido:**
- Horario esperado cada día
- Fichajes reales
- Desviaciones
- Firma digital (hash SHA256)

---

## 🔗 Server Actions Auxiliares

### `getDepartments()`

**Firma:**
```typescript
export async function getDepartments(): Promise<Department[]>
```

**Descripción:**
Obtiene departamentos activos de la organización (para excepciones globales).

---

### `getCostCenters()`

**Firma:**
```typescript
export async function getCostCenters(): Promise<CostCenter[]>
```

**Descripción:**
Obtiene centros de costes activos de la organización (para excepciones globales).

---

## 📚 Documentos Relacionados

- [Arquitectura](./ARQUITECTURA_HORARIOS_V2.md) - Modelos de datos
- [Motor de Cálculo](./MOTOR_CALCULO_HORARIOS.md) - Lógica de horarios efectivos
- [Guía de UI](./GUIA_UI_HORARIOS.md) - Uso en componentes

---

**Versión:** 1.0
**Última actualización:** 2025-11-19
**Autor:** Sistema de Planificación ERP TimeNow

# Migración de Datos V1 → V2

**Fecha:** 2025-11-19
**Versión:** 1.0
**Estado:** Opcional

---

## 📄 Navegación

← [Volver al Plan Principal](./PLAN_MIGRACION_HORARIOS_V2.md)

---

## 📚 Índice

1. [Consideraciones Previas](#consideraciones-previas)
2. [Script de Migración](#script-de-migración)
3. [Ejecución](#ejecución)

---

## ⚠️ Consideraciones Previas

**Como NO necesitas datos históricos**, esta fase es **OPCIONAL**.

### Escenarios

#### Escenario 1: Empezar de Cero (RECOMENDADO)

**Ventajas:**
- No arrastrar deuda técnica del sistema antiguo
- Datos limpios desde el inicio
- Simplifica testing y validación

**Proceso:**
1. Crear plantillas nuevas en Schedule V2.0
2. Asignar plantillas a empleados desde hoy
3. Datos históricos quedan en sistema V1 (solo lectura)

---

#### Escenario 2: Migrar Datos Históricos

**Razones para migrar:**
- Necesitas continuidad de reportes históricos
- Auditorías requieren datos de años anteriores
- Comparativas de cumplimiento año a año

**Desventajas:**
- Script complejo (100+ campos → nuevo modelo)
- Datos históricos pueden tener inconsistencias
- Requiere validación exhaustiva

---

## 🔧 Script de Migración

**Archivo:** `/scripts/migrate-schedules-v1-to-v2.ts`

### Lógica Completa

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateSchedules() {
  console.log('🚀 Iniciando migración de horarios V1 → V2...\n')

  // 1. Obtener todos los contratos con horario definido
  const contracts = await prisma.employmentContract.findMany({
    where: {
      scheduleType: { not: null }
    },
    include: {
      employee: {
        include: {
          user: true
        }
      }
    }
  })

  console.log(`📋 Encontrados ${contracts.length} contratos con horario\n`)

  let migrated = 0
  let errors = 0

  for (const contract of contracts) {
    try {
      console.log(`\n──────────────────────────────────────────────`)
      console.log(`Migrando: ${contract.employee.firstName} ${contract.employee.lastName}`)

      // 2. Crear ScheduleTemplate "Migrado - {employeeName}"
      const template = await prisma.scheduleTemplate.create({
        data: {
          name: `Migrado - ${contract.employee.firstName} ${contract.employee.lastName}`,
          description: `Horario migrado desde sistema V1 (contrato ${contract.id})`,
          templateType: mapScheduleType(contract.scheduleType),
          orgId: contract.orgId,
          isActive: contract.active
        }
      })
      console.log(`  ✅ Plantilla creada: ${template.id}`)

      // 3. Crear SchedulePeriod REGULAR
      const regularPeriod = await prisma.schedulePeriod.create({
        data: {
          scheduleTemplateId: template.id,
          periodType: 'REGULAR',
          validFrom: null,
          validTo: null
        }
      })
      console.log(`  ✅ Periodo REGULAR creado`)

      // 4. Crear WorkDayPattern + TimeSlot para cada día
      const daysOfWeek = [0, 1, 2, 3, 4, 5, 6] // Domingo a Sábado
      for (const day of daysOfWeek) {
        const isWorking = getIsWorkingDay(contract, day)
        const pattern = await prisma.workDayPattern.create({
          data: {
            schedulePeriodId: regularPeriod.id,
            dayOfWeek: day,
            isWorkingDay: isWorking
          }
        })

        if (isWorking) {
          const slots = buildTimeSlotsFromContract(contract, day)
          for (const slot of slots) {
            await prisma.timeSlot.create({
              data: {
                workDayPatternId: pattern.id,
                startTimeMinutes: slot.startTimeMinutes,
                endTimeMinutes: slot.endTimeMinutes,
                slotType: slot.slotType,
                presenceType: slot.presenceType,
                description: slot.description
              }
            })
          }
          console.log(`  ✅ Día ${getDayName(day)}: ${slots.length} slots creados`)
        } else {
          console.log(`  ⚪ Día ${getDayName(day)}: Descanso`)
        }
      }

      // 5. Si tiene jornada intensiva, crear periodo INTENSIVE
      if (contract.hasIntensiveSchedule) {
        console.log(`  🏖️  Creando periodo INTENSIVE (verano)...`)

        const intensivePeriod = await prisma.schedulePeriod.create({
          data: {
            scheduleTemplateId: template.id,
            periodType: 'INTENSIVE',
            name: 'Verano (migrado)',
            validFrom: parseMMDD(contract.intensiveStartDate!),
            validTo: parseMMDD(contract.intensiveEndDate!)
          }
        })

        // Crear patterns + slots para verano
        for (const day of daysOfWeek) {
          const isWorking = getIsWorkingDay(contract, day)
          const pattern = await prisma.workDayPattern.create({
            data: {
              schedulePeriodId: intensivePeriod.id,
              dayOfWeek: day,
              isWorkingDay: isWorking
            }
          })

          if (isWorking) {
            const slots = buildIntensiveTimeSlotsFromContract(contract, day)
            for (const slot of slots) {
              await prisma.timeSlot.create({
                data: {
                  workDayPatternId: pattern.id,
                  startTimeMinutes: slot.startTimeMinutes,
                  endTimeMinutes: slot.endTimeMinutes,
                  slotType: slot.slotType,
                  presenceType: slot.presenceType,
                  description: slot.description
                }
              })
            }
            console.log(`    ✅ Día ${getDayName(day)} (verano): ${slots.length} slots`)
          }
        }
      }

      // 6. Crear EmployeeScheduleAssignment
      const assignment = await prisma.employeeScheduleAssignment.create({
        data: {
          employeeId: contract.employeeId,
          assignmentType: mapScheduleType(contract.scheduleType),
          scheduleTemplateId: template.id,
          validFrom: contract.startDate,
          validTo: contract.endDate,
          isActive: contract.active
        }
      })
      console.log(`  ✅ Asignación creada: ${assignment.id}`)

      migrated++
      console.log(`✅ Migrado: ${contract.employee.firstName} ${contract.employee.lastName}`)

    } catch (error) {
      errors++
      console.error(`❌ Error migrando contrato ${contract.id}:`, error)
    }
  }

  console.log(`\n──────────────────────────────────────────────`)
  console.log(`\n✅ Migración completada:`)
  console.log(`   - Total contratos: ${contracts.length}`)
  console.log(`   - Migrados correctamente: ${migrated}`)
  console.log(`   - Errores: ${errors}`)
}

// ========================================
// Funciones Auxiliares
// ========================================

function mapScheduleType(scheduleType: string | null): 'FIXED' | 'SHIFT' | 'ROTATION' | 'FLEXIBLE' {
  if (!scheduleType) return 'FIXED'

  switch (scheduleType.toUpperCase()) {
    case 'FIXED':
      return 'FIXED'
    case 'SHIFT':
      return 'SHIFT'
    case 'ROTATION':
      return 'ROTATION'
    case 'FLEXIBLE':
      return 'FLEXIBLE'
    default:
      return 'FIXED'
  }
}

function getIsWorkingDay(contract: any, dayOfWeek: number): boolean {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const fieldName = `work${dayNames[dayOfWeek]}`
  return contract[fieldName] ?? false
}

function buildTimeSlotsFromContract(contract: any, dayOfWeek: number): any[] {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const day = dayNames[dayOfWeek]

  const startTime = contract[`${day}StartTime`]
  const endTime = contract[`${day}EndTime`]
  const breakStartTime = contract[`${day}BreakStartTime`]
  const breakEndTime = contract[`${day}BreakEndTime`]

  const slots: any[] = []

  if (!startTime || !endTime) return slots

  const startMinutes = timeToMinutes(startTime)
  const endMinutes = timeToMinutes(endTime)

  // Si hay pausa
  if (breakStartTime && breakEndTime) {
    const breakStart = timeToMinutes(breakStartTime)
    const breakEnd = timeToMinutes(breakEndTime)

    // Trabajo antes de pausa
    slots.push({
      startTimeMinutes: startMinutes,
      endTimeMinutes: breakStart,
      slotType: 'WORK',
      presenceType: 'MANDATORY',
      description: 'Mañana'
    })

    // Pausa
    slots.push({
      startTimeMinutes: breakStart,
      endTimeMinutes: breakEnd,
      slotType: 'BREAK',
      presenceType: 'MANDATORY',
      description: 'Pausa comida'
    })

    // Trabajo después de pausa
    slots.push({
      startTimeMinutes: breakEnd,
      endTimeMinutes: endMinutes,
      slotType: 'WORK',
      presenceType: 'MANDATORY',
      description: 'Tarde'
    })
  } else {
    // Sin pausa - slot continuo
    slots.push({
      startTimeMinutes: startMinutes,
      endTimeMinutes: endMinutes,
      slotType: 'WORK',
      presenceType: 'MANDATORY'
    })
  }

  return slots
}

function buildIntensiveTimeSlotsFromContract(contract: any, dayOfWeek: number): any[] {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const day = dayNames[dayOfWeek]

  const startTime = contract[`intensive${capitalize(day)}StartTime`]
  const endTime = contract[`intensive${capitalize(day)}EndTime`]
  const breakStartTime = contract[`intensive${capitalize(day)}BreakStartTime`]
  const breakEndTime = contract[`intensive${capitalize(day)}BreakEndTime`]

  const slots: any[] = []

  if (!startTime || !endTime) return slots

  const startMinutes = timeToMinutes(startTime)
  const endMinutes = timeToMinutes(endTime)

  if (breakStartTime && breakEndTime) {
    const breakStart = timeToMinutes(breakStartTime)
    const breakEnd = timeToMinutes(breakEndTime)

    slots.push({
      startTimeMinutes: startMinutes,
      endTimeMinutes: breakStart,
      slotType: 'WORK',
      presenceType: 'MANDATORY'
    })

    slots.push({
      startTimeMinutes: breakStart,
      endTimeMinutes: breakEnd,
      slotType: 'BREAK',
      presenceType: 'MANDATORY'
    })

    slots.push({
      startTimeMinutes: breakEnd,
      endTimeMinutes: endMinutes,
      slotType: 'WORK',
      presenceType: 'MANDATORY'
    })
  } else {
    slots.push({
      startTimeMinutes: startMinutes,
      endTimeMinutes: endMinutes,
      slotType: 'WORK',
      presenceType: 'MANDATORY'
    })
  }

  return slots
}

function timeToMinutes(time: string | null): number {
  if (!time) return 0
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function parseMMDD(mmdd: string | null): Date {
  if (!mmdd) return new Date()
  const year = new Date().getFullYear()
  const [month, day] = mmdd.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function getDayName(dayOfWeek: number): string {
  const names = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  return names[dayOfWeek]
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// ========================================
// Ejecutar migración
// ========================================

migrateSchedules()
  .catch((error) => {
    console.error('❌ Error fatal en migración:', error)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })
```

---

## 🚀 Ejecución

### Paso 1: Backup de Base de Datos

**CRÍTICO:** Hacer backup ANTES de ejecutar migración.

```bash
# PostgreSQL
pg_dump -U erp_user -d erp_dev > backups/erp_dev_backup_$(date +%Y%m%d).sql

# Verificar que el backup se creó correctamente
ls -lh backups/
```

---

### Paso 2: Ejecutar Script de Migración

**SOLO si decides migrar datos:**

```bash
npx tsx scripts/migrate-schedules-v1-to-v2.ts
```

**Salida esperada:**

```
🚀 Iniciando migración de horarios V1 → V2...

📋 Encontrados 25 contratos con horario

──────────────────────────────────────────────
Migrando: Juan Pérez
  ✅ Plantilla creada: tpl_abc123
  ✅ Periodo REGULAR creado
  ✅ Día Lunes: 3 slots creados
  ✅ Día Martes: 3 slots creados
  ✅ Día Miércoles: 3 slots creados
  ✅ Día Jueves: 3 slots creados
  ✅ Día Viernes: 3 slots creados
  ⚪ Día Sábado: Descanso
  ⚪ Día Domingo: Descanso
  🏖️  Creando periodo INTENSIVE (verano)...
    ✅ Día Lunes (verano): 1 slots
    ✅ Día Martes (verano): 1 slots
    ...
  ✅ Asignación creada: asg_xyz789
✅ Migrado: Juan Pérez

──────────────────────────────────────────────
Migrando: Ana López
  ✅ Plantilla creada: tpl_def456
  ...

──────────────────────────────────────────────

✅ Migración completada:
   - Total contratos: 25
   - Migrados correctamente: 25
   - Errores: 0
```

---

### Paso 3: Validación Post-Migración

**Verificar que los datos migrados son correctos:**

```typescript
// Script de validación: /scripts/validate-migration.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function validateMigration() {
  // 1. Contar plantillas migradas
  const templates = await prisma.scheduleTemplate.count({
    where: {
      name: { startsWith: 'Migrado - ' }
    }
  })
  console.log(`✅ Plantillas migradas: ${templates}`)

  // 2. Verificar que todas tienen períodos
  const templatesWithoutPeriods = await prisma.scheduleTemplate.count({
    where: {
      name: { startsWith: 'Migrado - ' },
      periods: { none: {} }
    }
  })
  if (templatesWithoutPeriods > 0) {
    console.error(`❌ ${templatesWithoutPeriods} plantillas SIN períodos`)
  } else {
    console.log(`✅ Todas las plantillas tienen períodos`)
  }

  // 3. Verificar que todos los empleados tienen asignación
  const employeesWithoutSchedule = await prisma.employee.count({
    where: {
      scheduleAssignments: { none: {} }
    }
  })
  console.log(`⚠️  Empleados sin horario: ${employeesWithoutSchedule}`)

  // 4. Comparar horas semanales (V1 vs V2)
  const contracts = await prisma.employmentContract.findMany({
    where: { scheduleType: { not: null } },
    include: { employee: true }
  })

  for (const contract of contracts) {
    const assignment = await prisma.employeeScheduleAssignment.findFirst({
      where: { employeeId: contract.employeeId },
      include: {
        scheduleTemplate: {
          include: {
            periods: {
              where: { periodType: 'REGULAR' },
              include: {
                workDayPatterns: {
                  include: { timeSlots: true }
                }
              }
            }
          }
        }
      }
    })

    if (assignment) {
      // Calcular horas V2
      const period = assignment.scheduleTemplate.periods[0]
      let totalMinutesV2 = 0
      for (const pattern of period.workDayPatterns) {
        for (const slot of pattern.timeSlots) {
          if (slot.slotType === 'WORK') {
            totalMinutesV2 += slot.endTimeMinutes - slot.startTimeMinutes
          }
        }
      }
      const hoursV2 = totalMinutesV2 / 60

      // Horas V1
      const hoursV1 = Number(contract.weeklyHours ?? 0)

      if (Math.abs(hoursV1 - hoursV2) > 1) {
        console.warn(
          `⚠️  Diferencia en ${contract.employee.firstName}: V1=${hoursV1}h, V2=${hoursV2}h`
        )
      }
    }
  }

  console.log('\n✅ Validación completada')
}

validateMigration()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

**Ejecutar validación:**

```bash
npx tsx scripts/validate-migration.ts
```

---

### Paso 4: Rollback (si algo falla)

**Si la migración tiene errores, restaurar backup:**

```bash
# 1. Detener aplicación
pkill -f "next|node.*3000"

# 2. Restaurar base de datos
psql -U erp_user -d erp_dev < backups/erp_dev_backup_20251119.sql

# 3. Sincronizar Prisma
npx prisma db push

# 4. Reiniciar aplicación
npm run dev
```

---

## 📚 Documentos Relacionados

- [Plan Principal](./PLAN_MIGRACION_HORARIOS_V2.md)
- [Arquitectura](./ARQUITECTURA_HORARIOS_V2.md)
- [Motor de Cálculo](./MOTOR_CALCULO_HORARIOS.md)

---

**Versión:** 1.0
**Última actualización:** 2025-11-19
**Estado:** Opcional (recomendado empezar de cero)
**Autor:** Sistema de Planificación ERP TimeNow

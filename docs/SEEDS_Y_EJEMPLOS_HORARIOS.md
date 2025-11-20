# Seeds y Ejemplos - Sistema de Horarios V2.0

**Fecha:** 2025-11-19
**Versión:** 1.0
**Estado:** Documentación Técnica

---

## 📄 Navegación

← [Volver al Plan Principal](./PLAN_MIGRACION_HORARIOS_V2.md)

---

## 📚 Índice

1. [Ejemplos de Horarios Configurables](#ejemplos-de-horarios-configurables)
2. [Seeds de Datos de Ejemplo](#seeds-de-datos-de-ejemplo)

---

## 📋 Ejemplos de Horarios Configurables

### 1. Oficina 40h (L-V 9-18h)

**ScheduleTemplate:**

- Tipo: FIXED
- Nombre: "Horario Oficina 40h"

**SchedulePeriod REGULAR:**

- L-V: 09:00-14:00 WORK, 14:00-15:00 BREAK, 15:00-18:00 WORK
- S-D: Descanso

**Total:** 40h/semana

**Configuración visual:**

```
┌─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐
│  LUN    │  MAR    │  MIÉ    │  JUE    │  VIE    │  SÁB    │  DOM    │
├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ 09:00   │ 09:00   │ 09:00   │ 09:00   │ 09:00   │         │         │
│ ↓       │ ↓       │ ↓       │ ↓       │ ↓       │ Descanso│ Descanso│
│ 14:00   │ 14:00   │ 14:00   │ 14:00   │ 14:00   │         │         │
│ (WORK)  │ (WORK)  │ (WORK)  │ (WORK)  │ (WORK)  │         │         │
│         │         │         │         │         │         │         │
│ 14:00   │ 14:00   │ 14:00   │ 14:00   │ 14:00   │         │         │
│ ↓       │ ↓       │ ↓       │ ↓       │ ↓       │         │         │
│ 15:00   │ 15:00   │ 15:00   │ 15:00   │ 15:00   │         │         │
│ (BREAK) │ (BREAK) │ (BREAK) │ (BREAK) │ (BREAK) │         │         │
│         │         │         │         │         │         │         │
│ 15:00   │ 15:00   │ 15:00   │ 15:00   │ 15:00   │         │         │
│ ↓       │ ↓       │ ↓       │ ↓       │ ↓       │         │         │
│ 18:00   │ 18:00   │ 18:00   │ 18:00   │ 18:00   │         │         │
│ (WORK)  │ (WORK)  │ (WORK)  │ (WORK)  │ (WORK)  │         │         │
└─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘
Total: 40h/semana
```

---

### 2. Funcionario Público con Flex

**ScheduleTemplate:**

- Tipo: FIXED
- Nombre: "Funcionario con Flex"

**SchedulePeriod REGULAR:**

- L-V:
  - 07:00-09:00 WORK FLEXIBLE (puede entrar en esta franja)
  - 09:00-14:30 WORK MANDATORY (presencia obligatoria)
  - 14:30-16:00 WORK FLEXIBLE (puede salir en esta franja)
- S-D: Descanso

**Total:** 37.5h/semana

**Configuración visual:**

```
┌─────────────────────────────────────────────────┐
│  LUNES - VIERNES                                │
├─────────────────────────────────────────────────┤
│ 07:00 - 09:00  🟢 WORK FLEXIBLE                 │
│                (Entrada flexible)               │
│                                                 │
│ 09:00 - 14:30  🔴 WORK MANDATORY                │
│                (Presencia obligatoria)          │
│                                                 │
│ 14:30 - 16:00  🟢 WORK FLEXIBLE                 │
│                (Salida flexible)                │
└─────────────────────────────────────────────────┘

Casos de uso:
- Entrada 07:30, Salida 15:00 → ✅ Válido (7.5h)
- Entrada 08:45, Salida 16:00 → ✅ Válido (7.25h)
- Entrada 09:05, Salida 16:00 → ⚠️  Tardío (falta presencia obligatoria)
```

---

### 3. Jornada Intensiva Verano

**ScheduleTemplate:**

- Tipo: FIXED
- Nombre: "Oficina con Verano"

**SchedulePeriod REGULAR (Oct-Jun):**

- L-V: 09:00-18:00 (40h)

**SchedulePeriod INTENSIVE (15 Jun - 1 Sep):**

- L-V: 08:00-15:00 (35h)

**Configuración visual:**

```
Enero - 14 Junio:
┌─────────┬─────────┬─────────┬─────────┬─────────┐
│  LUN    │  MAR    │  MIÉ    │  JUE    │  VIE    │
├─────────┼─────────┼─────────┼─────────┼─────────┤
│ 09:00   │ 09:00   │ 09:00   │ 09:00   │ 09:00   │
│ ↓       │ ↓       │ ↓       │ ↓       │ ↓       │
│ 18:00   │ 18:00   │ 18:00   │ 18:00   │ 18:00   │
│ 8h      │ 8h      │ 8h      │ 8h      │ 8h      │
└─────────┴─────────┴─────────┴─────────┴─────────┘
Total: 40h/semana

15 Junio - 1 Septiembre (VERANO):
┌─────────┬─────────┬─────────┬─────────┬─────────┐
│  LUN    │  MAR    │  MIÉ    │  JUE    │  VIE    │
├─────────┼─────────┼─────────┼─────────┼─────────┤
│ 08:00   │ 08:00   │ 08:00   │ 08:00   │ 08:00   │
│ ↓       │ ↓       │ ↓       │ ↓       │ ↓       │
│ 15:00   │ 15:00   │ 15:00   │ 15:00   │ 15:00   │
│ 7h      │ 7h      │ 7h      │ 7h      │ 7h      │
└─────────┴─────────┴─────────┴─────────┴─────────┘
Total: 35h/semana

2 Septiembre - Diciembre:
┌─────────┬─────────┬─────────┬─────────┬─────────┐
│  LUN    │  MAR    │  MIÉ    │  JUE    │  VIE    │
├─────────┼─────────┼─────────┼─────────┼─────────┤
│ 09:00   │ 09:00   │ 09:00   │ 09:00   │ 09:00   │
│ ↓       │ ↓       │ ↓       │ ↓       │ ↓       │
│ 18:00   │ 18:00   │ 18:00   │ 18:00   │ 18:00   │
│ 8h      │ 8h      │ 8h      │ 8h      │ 8h      │
└─────────┴─────────┴─────────┴─────────┴─────────┘
Total: 40h/semana
```

---

### 4. Policía Nacional 6x6

**ShiftRotationPattern:**

- Nombre: "Policía 6x6"
- Step 1: 6 días → "Turno Mañana" (07:00-15:00)
- Step 2: 6 días → "Descanso"

**EmployeeScheduleAssignment:**

- Tipo: ROTATION
- Inicio rotación: 2025-01-15

**Configuración visual:**

```
Rotación (ciclo de 12 días):

Días 1-6: TURNO MAÑANA
┌─────┬─────┬─────┬─────┬─────┬─────┐
│ D1  │ D2  │ D3  │ D4  │ D5  │ D6  │
├─────┼─────┼─────┼─────┼─────┼─────┤
│07:00│07:00│07:00│07:00│07:00│07:00│
│ ↓   │ ↓   │ ↓   │ ↓   │ ↓   │ ↓   │
│15:00│15:00│15:00│15:00│15:00│15:00│
│ 8h  │ 8h  │ 8h  │ 8h  │ 8h  │ 8h  │
└─────┴─────┴─────┴─────┴─────┴─────┘

Días 7-12: DESCANSO
┌─────┬─────┬─────┬─────┬─────┬─────┐
│ D7  │ D8  │ D9  │ D10 │ D11 │ D12 │
├─────┼─────┼─────┼─────┼─────┼─────┤
│     │     │     │     │     │     │
│     │     │     │     │     │     │
│ 0h  │ 0h  │ 0h  │ 0h  │ 0h  │ 0h  │
└─────┴─────┴─────┴─────┴─────┴─────┘

Luego se repite el ciclo...

Ejemplo con rotationStartDate = 2025-01-15:
  - 2025-01-15 (D0) → Turno Mañana
  - 2025-01-16 (D1) → Turno Mañana
  - ...
  - 2025-01-20 (D5) → Turno Mañana
  - 2025-01-21 (D6) → Descanso
  - 2025-01-22 (D7) → Descanso
  - ...
  - 2025-01-26 (D11) → Descanso
  - 2025-01-27 (D0) → Turno Mañana ← Reinicia ciclo
```

---

### 5. Bomberos 24x72

**ShiftRotationPattern:**

- Nombre: "Bomberos 24x72"
- Step 1: 1 día → "Turno 24h" (00:00-24:00)
- Step 2: 3 días → "Descanso"

**Configuración visual:**

```
Rotación (ciclo de 4 días):

Día 1: TURNO 24 HORAS
┌─────────────────────────┐
│ 00:00 - 24:00           │
│ WORK MANDATORY          │
│ (1440 minutos = 24h)    │
└─────────────────────────┘

Días 2-4: DESCANSO
┌─────┬─────┬─────┐
│ D2  │ D3  │ D4  │
├─────┼─────┼─────┤
│     │     │     │
│ 0h  │ 0h  │ 0h  │
└─────┴─────┴─────┘

Luego se repite el ciclo...

Ejemplo con rotationStartDate = 2025-01-15:
  - 2025-01-15 (D0) → Turno 24h
  - 2025-01-16 (D1) → Descanso
  - 2025-01-17 (D2) → Descanso
  - 2025-01-18 (D3) → Descanso
  - 2025-01-19 (D0) → Turno 24h ← Reinicia ciclo
```

---

### 6. Semana Santa con Reducción

**ScheduleTemplate:**

- Tipo: FIXED
- Nombre: "Oficina con Semana Santa"

**SchedulePeriod REGULAR:**

- L-V: 09:00-18:00

**SchedulePeriod SPECIAL (14-20 Abril):**

- L-J: 09:00-14:00 (5h)
- V: 09:00-12:48 (3h 48min) ← Ejemplo de precisión en minutos

**Configuración visual:**

```
Todo el año (excepto Semana Santa):
L-V: 09:00-18:00 (8h)

Semana Santa (14-20 Abril):

┌─────────┬─────────┬─────────┬─────────┬─────────┐
│  LUN    │  MAR    │  MIÉ    │  JUE    │  VIE    │
├─────────┼─────────┼─────────┼─────────┼─────────┤
│ 09:00   │ 09:00   │ 09:00   │ 09:00   │ 09:00   │
│ ↓       │ ↓       │ ↓       │ ↓       │ ↓       │
│ 14:00   │ 14:00   │ 14:00   │ 14:00   │ 12:48   │
│ 5h      │ 5h      │ 5h      │ 5h      │ 3h 48m  │
└─────────┴─────────┴─────────┴─────────┴─────────┘

Viernes Santo: 12:48h (768 minutos desde medianoche)
→ Precisión de minutos del sistema
```

---

## 🌱 Seeds de Datos de Ejemplo

**Archivo:** `/prisma/seeds/schedules-v2.seed.ts`

### Seed Completo

```typescript
import { PrismaClient, ScheduleTemplateType, SchedulePeriodType } from "@prisma/client";

const prisma = new PrismaClient();

export async function seedSchedulesV2(orgId: string) {
  console.log("🌱 Seeding Schedule V2.0 templates...\n");

  // ========================================
  // 1. Plantilla: Horario Oficina 40h
  // ========================================
  const office40h = await prisma.scheduleTemplate.create({
    data: {
      name: "Horario Oficina 40h",
      description: "Horario estándar de oficina L-V 9-18h con pausa comida",
      templateType: "FIXED",
      orgId,
      periods: {
        create: {
          periodType: "REGULAR",
          workDayPatterns: {
            create: [
              // Lunes a Viernes (1-5)
              ...Array.from({ length: 5 }, (_, i) => ({
                dayOfWeek: i + 1,
                isWorkingDay: true,
                timeSlots: {
                  create: [
                    { startTimeMinutes: 540, endTimeMinutes: 840, slotType: "WORK", presenceType: "MANDATORY" }, // 09:00-14:00
                    { startTimeMinutes: 840, endTimeMinutes: 900, slotType: "BREAK", presenceType: "MANDATORY" }, // 14:00-15:00
                    { startTimeMinutes: 900, endTimeMinutes: 1080, slotType: "WORK", presenceType: "MANDATORY" }, // 15:00-18:00
                  ],
                },
              })),
              // Sábado y Domingo (6, 0)
              { dayOfWeek: 6, isWorkingDay: false },
              { dayOfWeek: 0, isWorkingDay: false },
            ],
          },
        },
      },
    },
  });
  console.log(`✅ ${office40h.name}`);

  // ========================================
  // 2. Plantilla: Funcionario con Flex
  // ========================================
  const funcionarioFlex = await prisma.scheduleTemplate.create({
    data: {
      name: "Funcionario con Flex",
      description: "Horario sector público con franja flexible y presencia obligatoria",
      templateType: "FIXED",
      orgId,
      periods: {
        create: {
          periodType: "REGULAR",
          workDayPatterns: {
            create: [
              ...Array.from({ length: 5 }, (_, i) => ({
                dayOfWeek: i + 1,
                isWorkingDay: true,
                timeSlots: {
                  create: [
                    {
                      startTimeMinutes: 420,
                      endTimeMinutes: 540,
                      slotType: "WORK",
                      presenceType: "FLEXIBLE",
                      description: "Entrada flexible",
                    }, // 07:00-09:00
                    {
                      startTimeMinutes: 540,
                      endTimeMinutes: 870,
                      slotType: "WORK",
                      presenceType: "MANDATORY",
                      description: "Presencia obligatoria",
                    }, // 09:00-14:30
                    {
                      startTimeMinutes: 870,
                      endTimeMinutes: 960,
                      slotType: "WORK",
                      presenceType: "FLEXIBLE",
                      description: "Salida flexible",
                    }, // 14:30-16:00
                  ],
                },
              })),
              { dayOfWeek: 6, isWorkingDay: false },
              { dayOfWeek: 0, isWorkingDay: false },
            ],
          },
        },
      },
    },
  });
  console.log(`✅ ${funcionarioFlex.name}`);

  // ========================================
  // 3. Plantilla: Oficina con Verano
  // ========================================
  const officeVerano = await prisma.scheduleTemplate.create({
    data: {
      name: "Oficina con Jornada Intensiva Verano",
      description: "Horario con jornada intensiva en verano",
      templateType: "FIXED",
      orgId,
      periods: {
        create: [
          // Periodo REGULAR
          {
            periodType: "REGULAR",
            name: "Horario Regular",
            workDayPatterns: {
              create: [
                ...Array.from({ length: 5 }, (_, i) => ({
                  dayOfWeek: i + 1,
                  isWorkingDay: true,
                  timeSlots: {
                    create: [
                      { startTimeMinutes: 540, endTimeMinutes: 840, slotType: "WORK", presenceType: "MANDATORY" },
                      { startTimeMinutes: 840, endTimeMinutes: 900, slotType: "BREAK", presenceType: "MANDATORY" },
                      { startTimeMinutes: 900, endTimeMinutes: 1080, slotType: "WORK", presenceType: "MANDATORY" },
                    ],
                  },
                })),
                { dayOfWeek: 6, isWorkingDay: false },
                { dayOfWeek: 0, isWorkingDay: false },
              ],
            },
          },
          // Periodo INTENSIVE (Verano)
          {
            periodType: "INTENSIVE",
            name: "Verano",
            validFrom: new Date(new Date().getFullYear(), 5, 15), // 15 junio
            validTo: new Date(new Date().getFullYear(), 8, 1), // 1 septiembre
            workDayPatterns: {
              create: [
                ...Array.from({ length: 5 }, (_, i) => ({
                  dayOfWeek: i + 1,
                  isWorkingDay: true,
                  timeSlots: {
                    create: [
                      { startTimeMinutes: 480, endTimeMinutes: 900, slotType: "WORK", presenceType: "MANDATORY" }, // 08:00-15:00
                    ],
                  },
                })),
                { dayOfWeek: 6, isWorkingDay: false },
                { dayOfWeek: 0, isWorkingDay: false },
              ],
            },
          },
        ],
      },
    },
  });
  console.log(`✅ ${officeVerano.name}`);

  // ========================================
  // 4. Turno 24h (para bomberos)
  // ========================================
  const turno24h = await prisma.scheduleTemplate.create({
    data: {
      name: "Turno 24 Horas",
      description: "Turno de 24 horas continuas",
      templateType: "SHIFT",
      orgId,
      periods: {
        create: {
          periodType: "REGULAR",
          workDayPatterns: {
            create: Array.from({ length: 7 }, (_, i) => ({
              dayOfWeek: i,
              isWorkingDay: true,
              timeSlots: {
                create: [
                  { startTimeMinutes: 0, endTimeMinutes: 1440, slotType: "WORK", presenceType: "MANDATORY" }, // 00:00-24:00
                ],
              },
            })),
          },
        },
      },
    },
  });
  console.log(`✅ ${turno24h.name}`);

  // ========================================
  // 5. Turno Descanso
  // ========================================
  const turnoDescanso = await prisma.scheduleTemplate.create({
    data: {
      name: "Descanso",
      description: "Día de descanso",
      templateType: "SHIFT",
      orgId,
      periods: {
        create: {
          periodType: "REGULAR",
          workDayPatterns: {
            create: Array.from({ length: 7 }, (_, i) => ({
              dayOfWeek: i,
              isWorkingDay: false,
            })),
          },
        },
      },
    },
  });
  console.log(`✅ ${turnoDescanso.name}`);

  // ========================================
  // 6. Rotación Bomberos 24x72
  // ========================================
  const rotacionBomberos = await prisma.shiftRotationPattern.create({
    data: {
      name: "Bomberos 24x72",
      description: "1 día de trabajo (24h) seguido de 3 días de descanso",
      orgId,
      steps: {
        create: [
          { stepOrder: 1, durationDays: 1, scheduleTemplateId: turno24h.id },
          { stepOrder: 2, durationDays: 3, scheduleTemplateId: turnoDescanso.id },
        ],
      },
    },
  });
  console.log(`✅ ${rotacionBomberos.name}`);

  // ========================================
  // 7. Turno Mañana (para policía 6x6)
  // ========================================
  const turnoMañana = await prisma.scheduleTemplate.create({
    data: {
      name: "Turno Mañana",
      description: "Turno de mañana 07:00-15:00",
      templateType: "SHIFT",
      orgId,
      periods: {
        create: {
          periodType: "REGULAR",
          workDayPatterns: {
            create: Array.from({ length: 7 }, (_, i) => ({
              dayOfWeek: i,
              isWorkingDay: true,
              timeSlots: {
                create: [
                  { startTimeMinutes: 420, endTimeMinutes: 900, slotType: "WORK", presenceType: "MANDATORY" }, // 07:00-15:00
                ],
              },
            })),
          },
        },
      },
    },
  });
  console.log(`✅ ${turnoMañana.name}`);

  // ========================================
  // 8. Rotación Policía 6x6
  // ========================================
  const rotacionPolicia = await prisma.shiftRotationPattern.create({
    data: {
      name: "Policía 6x6",
      description: "6 días de turno mañana seguidos de 6 días de descanso",
      orgId,
      steps: {
        create: [
          { stepOrder: 1, durationDays: 6, scheduleTemplateId: turnoMañana.id },
          { stepOrder: 2, durationDays: 6, scheduleTemplateId: turnoDescanso.id },
        ],
      },
    },
  });
  console.log(`✅ ${rotacionPolicia.name}`);

  console.log("\n✅ Seeds de horarios v2 completados\n");

  return {
    office40h,
    funcionarioFlex,
    officeVerano,
    turno24h,
    turnoDescanso,
    rotacionBomberos,
    turnoMañana,
    rotacionPolicia,
  };
}
```

---

### Ejecutar Seeds

**Añadir al archivo principal de seeds:**

```typescript
// /prisma/seed.ts
import { seedSchedulesV2 } from "./seeds/schedules-v2.seed";

async function main() {
  const orgId = "org_123"; // ID de la organización

  // Otros seeds...

  // Seeds de horarios V2.0
  await seedSchedulesV2(orgId);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

**Ejecutar:**

```bash
npx prisma db seed
```

**Salida esperada:**

```
🌱 Seeding Schedule V2.0 templates...

✅ Horario Oficina 40h
✅ Funcionario con Flex
✅ Oficina con Jornada Intensiva Verano
✅ Turno 24 Horas
✅ Descanso
✅ Bomberos 24x72
✅ Turno Mañana
✅ Policía 6x6

✅ Seeds de horarios v2 completados
```

---

## 📚 Documentos Relacionados

- [Plan Principal](./PLAN_MIGRACION_HORARIOS_V2.md)
- [Arquitectura](./ARQUITECTURA_HORARIOS_V2.md)
- [Motor de Cálculo](./MOTOR_CALCULO_HORARIOS.md)

---

**Versión:** 1.0
**Última actualización:** 2025-11-19
**Autor:** Sistema de Planificación ERP TimeNow

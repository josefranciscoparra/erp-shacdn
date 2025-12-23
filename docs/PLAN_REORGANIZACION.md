# Plan de Reorganización del Código

> **Estado**: En progreso
> **Fecha de inicio**: 2025-12-03
> **Objetivo**: Organizar el código existente para mejorar mantenibilidad y consistencia

---

## Resumen

Este plan reorganiza la estructura del proyecto para:

1. **Consolidar documentación** dispersa en 4 ubicaciones
2. **Mover servicios** de `/lib/` a carpetas de dominio en `/services/`
3. **Centralizar types** que están inline en stores
4. **Mover código legacy** a carpeta dedicada

**Principio**: Solo mover y organizar lo existente. NO crear funcionalidad nueva.

---

## Fases

### Fase 0: Documentar el Plan ✅

- [x] Crear este documento

### Fase 1: Consolidar Documentación ✅

Mover toda la documentación a `/docs/`:

- ✅ Crear subcarpetas: `general/`, `features/`, `legacy/`
- ✅ Mover `.md` de raíz → `/docs/general/`
- ✅ Mover `/doc/` (legacy) → `/docs/legacy/`
- ✅ Mover docs de rutas → `/docs/features/`
- ✅ Mantener solo `README.md` y `CLAUDE.md` en raíz

### Fase 2: Mover Servicios ✅

Reorganizar `/src/lib/` → `/src/services/{dominio}/`:

| Archivo                       | Destino                    |
| ----------------------------- | -------------------------- |
| `schedule-engine.ts`          | `/services/schedules/`     |
| `schedule-helpers.ts`         | `/services/schedules/`     |
| `time-entry-state-machine.ts` | `/services/time-tracking/` |
| `pto-helpers.ts`              | `/services/pto/`           |
| `pto-helpers-client.ts`       | `/services/pto/`           |
| `alert-engine.ts`             | `/services/alerts/`        |
| `permissions.ts`              | `/services/permissions/`   |
| `role-hierarchy.ts`           | `/services/permissions/`   |
| `employee-numbering.ts`       | `/services/employees/`     |

### Fase 3: Centralizar Types ⏸️ POSPUESTO

Extraer interfaces de stores a `/src/types/`:

- `pto-store.tsx` → `/types/pto.ts`
- `time-tracking-store.tsx` → `/types/time-tracking.ts`
- `employees-store.ts` → `/types/employees.ts`

> **Nota**: Pospuesto por complejidad. Los stores tienen 70+ tipos inline que requieren
> refactoring extenso. Se abordará en una fase futura cuando sea necesario.

### Fase 4: Código Legacy ✅

- ✅ Crear `/src/legacy/` con README explicativo
- ✅ Mover `wizard-step-3-schedule.tsx` (V1) → `/legacy/schedules-v1/`
- ✅ Mover `wizard-step-3-schedule.tsx.backup` → `/legacy/schedules-v1/`
- ✅ Corregir imports de `scope-helpers` en páginas de alertas

---

## Estructura Final

```
src/
├── services/           # Lógica de negocio por dominio
│   ├── schedules/
│   │   ├── schedule-engine.ts
│   │   ├── schedule-helpers.ts
│   │   └── index.ts
│   ├── time-tracking/
│   │   ├── state-machine.ts
│   │   └── index.ts
│   ├── pto/
│   │   ├── pto-helpers.ts
│   │   ├── pto-helpers-client.ts
│   │   └── index.ts
│   ├── alerts/
│   │   ├── alert-engine.ts
│   │   └── index.ts
│   ├── permissions/
│   │   ├── permissions.ts
│   │   ├── role-hierarchy.ts
│   │   └── index.ts
│   ├── employees/
│   │   ├── employee-numbering.ts
│   │   └── index.ts
│   └── expenses/       # Ya existe
│       └── ...
│
├── types/              # Interfaces centralizadas
│   ├── schedule.ts     # Ya existe
│   ├── pto.ts
│   ├── time-tracking.ts
│   ├── employees.ts
│   └── index.ts
│
├── legacy/             # Código deprecado
│   └── schedules-v1/
│
└── lib/                # Solo utilidades genéricas
    ├── utils.ts
    ├── db.ts
    ├── validations/
    └── ...

docs/
├── README.md           # Índice
├── general/            # Docs generales (TECHNICAL.md, etc.)
├── features/           # Docs por feature
├── legacy/             # Docs antiguas (/doc/)
└── ...                 # Docs existentes
```

---

## Progreso

| Fase                 | Estado        | Fecha      |
| -------------------- | ------------- | ---------- |
| 0. Documentar Plan   | ✅ Completado | 2025-12-03 |
| 1. Consolidar Docs   | ✅ Completado | 2025-12-03 |
| 2. Mover Servicios   | ✅ Completado | 2025-12-03 |
| 3. Centralizar Types | ⏸️ Pospuesto  | -          |
| 4. Código Legacy     | ✅ Completado | 2025-12-03 |

---

## Notas

- Probar con `npm run build` después de cada cambio
- Si algo falla, revertir antes de continuar
- Ver plan detallado en `.claude/plans/binary-sleeping-babbage.md`

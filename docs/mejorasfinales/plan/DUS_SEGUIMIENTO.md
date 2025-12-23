# DUS - Documento Único de Seguimiento

## Mejoras Finales TimeNow

> **Última actualización:** 2025-12-05
> **Rama actual:** `main` (Mejora 1 completada, preparando mejora-02)

---

## Estado de Mejoras

| #   | Mejora                           | Estado         | Rama                              | Doc Técnico                         | Fecha Inicio | Fecha Fin  |
| --- | -------------------------------- | -------------- | --------------------------------- | ----------------------------------- | ------------ | ---------- |
| 1   | Liquidación + Fijos Discontinuos | ✅ Completada  | `feature/mejora-01-liquidacion`   | [IMPL_01](./IMPL_01_LIQUIDACION.md) | 2024-12-05   | 2025-12-05 |
| 2   | Justificantes de Ausencias       | 🟡 En Progreso | `feature/mejora-02-justificantes` | -                                   | 2025-12-05   | -          |
| 3   | Subida Masiva de Nóminas         | ⏳ Pendiente   | -                                 | -                                   | -            | -          |
| 4   | Proyectos en Fichajes            | ⏳ Pendiente   | -                                 | -                                   | -            | -          |
| 5   | Bolsa de Horas                   | ⏳ Pendiente   | -                                 | -                                   | -            | -          |
| 6   | Pausas Automáticas               | ⏳ Pendiente   | -                                 | -                                   | -            | -          |
| 7   | Firma Masiva y Doble Firma       | ⏳ Pendiente   | -                                 | -                                   | -            | -          |

**Leyenda:**

- ⏳ Pendiente
- 🟡 En Progreso
- ✅ Completada
- ❌ Bloqueada

---

## Metodología de Trabajo

### Flujo por Mejora

1. **Crear rama** `feature/mejora-XX-nombre` desde `main`
2. **Preguntas** → Recopilar info funcional/técnica del usuario
3. **Crear IMPL_XX.md** → Documento técnico con micro-tareas marcables
4. **Implementar** → Ir marcando checkpoints `[x]`
5. **Validar** → Usuario confirma completitud
6. **Merge a main** → Actualizar este DUS
7. **Crear siguiente rama** → Repetir

### Flujo Git

```
main
  └── feature/mejora-01-liquidacion
        ├── implementar
        ├── validar
        └── merge a main ✓
  └── feature/mejora-02-justificantes
        └── ...
```

### Nomenclatura de Ramas

| Mejora | Rama                              |
| ------ | --------------------------------- |
| 1      | `feature/mejora-01-liquidacion`   |
| 2      | `feature/mejora-02-justificantes` |
| 3      | `feature/mejora-03-nominas`       |
| 4      | `feature/mejora-04-proyectos`     |
| 5      | `feature/mejora-05-bolsa-horas`   |
| 6      | `feature/mejora-06-pausas-auto`   |
| 7      | `feature/mejora-07-firma-masiva`  |

---

## Instrucciones para Nuevas Conversaciones

Si empiezas una nueva conversación con Claude Code, proporciona este contexto:

```
Estamos implementando mejoras finales de TimeNow.
- Lee: docs/mejorasfinales/plan/DUS_SEGUIMIENTO.md
- La mejora actual es la [X]
- Su documento técnico está en: docs/mejorasfinales/plan/IMPL_XX_NOMBRE.md
- Rama actual: feature/mejora-XX-nombre
```

---

## Principios de Implementación

1. **Respetar modelos existentes** - Extender, no reemplazar
2. **Reglas configurables** - Por organización/contrato
3. **Separación de módulos** - Contratos, fichajes, vacaciones son independientes
4. **Auditoría completa** - Registrar quién, cuándo, qué
5. **UX consistente** - Seguir patrones del dashboard existente

---

## Historial de Cambios

| Fecha      | Mejora | Cambio                                                                                                                                                              |
| ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2024-12-05 | 1      | Iniciada mejora de Liquidación + Fijos Discontinuos                                                                                                                 |
| 2025-12-05 | 1      | ✅ COMPLETADA: Liquidación automática al finalizar contrato, contratos FIJO_DISCONTINUO con pause/resume, UI de liquidaciones, VacationService con Strategy pattern |
| 2025-12-05 | 2      | Iniciada mejora de Justificantes de Ausencias                                                                                                                       |

---

## Documentos de Requisitos

- [PLAN_MAESTRO.md](../PLAN_MAESTRO.md) - Visión general
- [PLAN1_LIQUIDACION.md](../PLAN1_LIQUIDACION.md) - Requisitos Mejora 1
- [PLAN2_JUSTIFICANTES.md](../PLAN2_JUSTIFICANTES.md) - Requisitos Mejora 2
- [PLAN3_NOMINAS.md](../PLAN3_NOMINAS.md) - Requisitos Mejora 3
- [PLAN4_PROYECTOS.md](../PLAN4_PROYECTOS.md) - Requisitos Mejora 4
- [PLAN5_BOLSA_HORAS.md](../PLAN5_BOLSA_HORAS.md) - Requisitos Mejora 5
- [PLAN6_PAUSAS_AUTOMATICAS.md](../PLAN6_PAUSAS_AUTOMATICAS.md) - Requisitos Mejora 6
- [PLAN7_FIRMA_MASIVA.md](../PLAN7_FIRMA_MASIVA.md) - Requisitos Mejora 7

# Código Legacy

Esta carpeta contiene código deprecado que se mantiene como referencia histórica.

**NO USAR** este código en nuevas implementaciones.

## Contenido

### `/schedules-v1/`
Sistema de horarios V1 (deprecado). Reemplazado por:
- Sistema V2: `/src/app/(main)/dashboard/schedules/`
- Motor de cálculo: `/src/services/schedules/schedule-engine.ts`

**Archivos:**
- `wizard-step-3-schedule.tsx` - Componente original del wizard de empleados (1500+ líneas)
- `wizard-step-3-schedule.tsx.backup` - Backup del componente original

**Razón de deprecación:**
- Código monolítico difícil de mantener
- No reutilizable entre diferentes contextos
- Lógica de horarios acoplada al wizard de empleados

**Versión actual:** `wizard-step-3-schedule-v2.tsx` en la carpeta original del wizard.

---

## Política de Código Legacy

1. **No eliminar**: Mantener para referencia histórica
2. **No modificar**: Si necesitas algo, cópialo al lugar correcto
3. **No importar**: Nunca importar desde `/src/legacy/`
4. **Documentar**: Si mueves código aquí, documenta la razón

## Fecha de Movimiento

- Schedules V1: 2025-12-03

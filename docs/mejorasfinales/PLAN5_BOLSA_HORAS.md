# PLAN 5 – Bolsa de Horas

**Estado:** ✅ COMPLETADO
**Fecha:** 2025-12-08

## Objetivo

Gestionar saldo de horas derivado de exceso o defecto respecto a la jornada del trabajador, con márgenes de gracia configurables.

---

## Implementación Completada

### 1. Schema de Base de Datos

**Modelo:** `TimeBankSettings` en `prisma/schema.prisma`

Nuevos campos añadidos:

- `excessGraceMinutes` (Int, default 15) - Margen de exceso: si trabajo ≤X min de más, NO acumula
- `deficitGraceMinutes` (Int, default 10) - Margen de déficit: si trabajo ≤X min de menos, NO penaliza

### 2. Server Actions

**Archivo:** `src/server/actions/time-bank.ts`

- Lógica de normalización actualizada con márgenes separados
- Orden de aplicación: primero redondeo, luego márgenes según signo
- Función `normalizeDeviationValue()` actualizada

**Archivo:** `src/server/actions/time-bank-settings.ts`

- `getTimeBankFullSettings()` - Obtiene configuración completa
- `updateTimeBankBasicSettings()` - Actualiza configuración con validaciones y auditoría
- Validaciones:
  - `excessGraceMinutes` >= 0 && <= 60
  - `deficitGraceMinutes` >= 0 && <= 60
  - `roundingIncrementMinutes` ∈ [1, 5, 10, 15]
  - `maxPositiveMinutes` >= 0
  - `maxNegativeMinutes` >= 0
- Permisos: Solo roles con `manage_organization` (ADMIN/RRHH)
- Auditoría: Evento `TIME_BANK_SETTINGS_UPDATED` en AuditLog

### 3. UI de Configuración

**Archivo:** `src/app/(main)/dashboard/settings/_components/time-bank-tab.tsx`

Formulario con:

- Margen de exceso (minutos) - Input 0-60
- Margen de déficit (minutos) - Input 0-60
- Incremento de redondeo - Select [1, 5, 10, 15] min
- Límite máximo positivo (horas) - Input numérico
- Límite máximo negativo (horas) - Input numérico
- Card informativo con ejemplos de cálculo

**Acceso:** Settings > Tab "Bolsa Horas"

---

## Valores por Defecto

| Parámetro                  | Valor | Descripción                              |
| -------------------------- | ----- | ---------------------------------------- |
| `excessGraceMinutes`       | 15    | Si trabajo ≤15 min de más, NO acumula    |
| `deficitGraceMinutes`      | 10    | Si trabajo ≤10 min de menos, NO penaliza |
| `roundingIncrementMinutes` | 5     | Redondea a múltiplos de 5 min            |
| `maxPositiveMinutes`       | 4800  | Máximo 80h acumuladas                    |
| `maxNegativeMinutes`       | 480   | Máximo 8h de déficit                     |

---

## Lógica de Cálculo

### Orden de Aplicación

1. **Paso 1:** Redondear la diferencia al incremento configurado
2. **Paso 2:** Aplicar márgenes según el signo (exceso vs déficit)

### Ejemplos

Con `roundingIncrementMinutes=5`, `excessGraceMinutes=15`, `deficitGraceMinutes=10`:

| Desviación Raw | Paso 1: Redondeo | Paso 2: Margen | Resultado Final |
| -------------- | ---------------- | -------------- | --------------- |
| +7 min         | +5 min           | ≤ 15 (exceso)  | **0 min**       |
| +16 min        | +15 min          | ≤ 15 (exceso)  | **0 min**       |
| +23 min        | +25 min          | > 15 (exceso)  | **+25 min**     |
| -7 min         | -5 min           | ≤ 10 (déficit) | **0 min**       |
| -12 min        | -10 min          | ≤ 10 (déficit) | **0 min**       |
| -45 min        | -45 min          | > 10 (déficit) | **-45 min**     |

---

## Auditoría

Cada modificación de configuración queda registrada en `AuditLog`:

- **action:** `TIME_BANK_SETTINGS_UPDATED`
- **category:** `SETTINGS`
- **entityData:** Valores anteriores y nuevos
- **performedBy:** Usuario que realizó el cambio

---

## Archivos Modificados

| Archivo                                                           | Cambio                                            |
| ----------------------------------------------------------------- | ------------------------------------------------- |
| `prisma/schema.prisma`                                            | Añadido `excessGraceMinutes` a `TimeBankSettings` |
| `src/server/actions/time-bank.ts`                                 | Actualizada lógica de normalización               |
| `src/server/actions/time-bank-settings.ts`                        | Añadidas funciones get/update con validaciones    |
| `src/app/(main)/dashboard/settings/_components/time-bank-tab.tsx` | NUEVO - UI de configuración                       |
| `src/app/(main)/dashboard/settings/page.tsx`                      | Añadido tab "Bolsa Horas"                         |

---

## Requisitos Originales ✅

- [x] Cálculo automático según horas fichadas, jornada del contrato y ausencias
- [x] Mostrar saldo acumulado, horas positivas y negativas
- [x] RRHH puede configurar márgenes de gracia
- [x] Registro de decisiones en auditoría
- [x] **NUEVO:** Margen de exceso separado del margen de déficit
- [x] **NUEVO:** UI de configuración en Settings

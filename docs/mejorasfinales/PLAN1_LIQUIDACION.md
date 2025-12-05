# PLAN 1 – Liquidación de Vacaciones y Gestión de Fijos Discontinuos

## 🎯 Objetivo
Añadir capacidades profesionales y generalistas para cálculo de liquidaciones y adaptación a contratos de tipo “fijo discontinuo”.

---

## 1. Liquidación de Vacaciones (Base Profesional)

### Requisitos Generales
- Calcular saldo a fecha de corte:
  - Vacaciones devengadas.
  - Vacaciones disfrutadas.
  - Vacaciones pendientes.
- Funcionalidad accesible desde RRHH.
- Permitir registrar la liquidación como:
  - Abonada.
  - Compensada.
  - Pendiente.
- Añadir observaciones internas.
- Exportable como PDF/CSV.

### Reglas
- Fórmula estándar inicial, pero la lógica debe dejarse abierta para que en futuras políticas pueda cambiarse sin romper nada.
- Usar datos existentes:
  - Días/año del contrato.
  - Ausencias aprobadas.
  - Fichajes.
  - Fecha de alta/baja.

---

## 2. Gestión de Fijos Discontinuos (Vinculado al Contrato)

### Requisitos
- Añadir tipo de contrato “Fijo Discontinuo”.
- El contrato debe permitir cambiar a estado:
  - “Pausado”
  - “Reanudado”
- Mientras está “Pausado”:
  - No genera vacaciones.
  - No computa horas.
  - No recibe recordatorios de fichajes.
  - No participa en estadísticas de jornada.

### Reanudación
- El sistema debe volver automáticamente a:
  - Generar vacaciones.
  - Activar fichajes.
  - Considerarlo en informes.

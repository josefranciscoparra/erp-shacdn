# PLAN: Bolsa de Horas (TimeNow Enterprise)

**Fecha:** 2025-11-25  
**Estado:** 🧭 Propuesta integral pendiente de priorización  
**Última actualización:** 2025-11-25  
**Relaciones:** [PLAN_BALANCE_MINUTOS.md](../PLAN_BALANCE_MINUTOS.md), [PLAN_HORARIOS_COMPLETO.md](../PLAN_HORARIOS_COMPLETO.md)

---

## 🧭 Resumen ejecutivo

Implementar una **Bolsa de Horas** unificada que funcione en entornos público y privado, cumpla con el **control horario 2026**, soporte convenios especiales y se integre con TimeNow. El sistema debe calcular saldo diario automáticamente, gestionar autorizaciones y compensaciones, ofrecer solicitudes para empleados, proveer cuadros de mando para RRHH, cubrir edge cases enterprise y garantizar trazabilidad completa.

---

## 1️⃣ Conceptos base

### Bolsa de Horas
- Saldo dinámico en minutos que acumula o descuenta según horas extra, déficit, festivos trabajados, permisos recuperables, compactación de jornada, trabajo en vacaciones, nocturnidad y turnicidad.
- Soporta factores de compensación (1x, 1.5x, etc.) y límites configurables por organización.

### Origen del saldo
| Origen | Tipo | Ejemplo |
| --- | --- | --- |
| Horas extra autorizadas | + | Trabaja 2h más por cierre mensual |
| Horas de menos | - | Sale antes sin justificar |
| Festivo trabajado | + | Cubrir turno en domingo |
| Ajuste manual RRHH | +/- | Corrección puntual |
| Recuperación de horas | - | Usa saldo para salir antes |
| No fichaje / olvido | - | Penalización si no hay corrección |
| Jornada flexible | +/- | Adelantar o retrasar dentro de la ventana |

---

## 2️⃣ Requisitos funcionales

### A. Cálculo automático del saldo
- Cálculo diario por empleado combinando horario teórico vs fichajes reales.
- Aplicar reglas de convenio, redondeos (p. ej. 5 min), mínimos diarios (±10 min no computan) y autorización obligatoria para horas extra.
- Festivos/domingos con multiplicadores configurables (1.5x, dinero, etc.).
- Movimientos automáticos con origen trazable y registro de auditoría.

### B. Reglas avanzadas por organización
- Límites diarios de exceso/defecto, máximo saldo positivo/negativo (ej. 80h privados, 200h público).
- Compensaciones de festivos: tiempo vs dinero, ventanas de jornada flexible y tiempo muerto de tolerancia.
- Reglas especiales para nocturnidad, turnos rotativos y guardias (localizada/presencial).

### C. Correcciones automatizadas de fichajes
1. **Olvido de salida** → autocierre con hora teórica; recalculable si RRHH marca como corregido.  
2. **Doble entrada** → detectar y sugerir corrección.  
3. **Jornada demasiado larga** → alerta configurable.  
4. **Festivo sin autorización** → bloqueo o solicitud automática.

### D. Solicitudes del empleado
- Recuperar horas (fecha + cantidad) con workflow de aprobación/denegación.
- Compensar festivo trabajado (día libre o compensación parcial).
- Corrección de fichaje con explicación y estados `pendiente → aprobado → aplicado`.

### E. Cuadro de mando RRHH
- Dashboard con horas extra, ranking de retrasos, faltas recurrentes, tendencias de saldo, festivos trabajados y alertas (excesos e incoherencias).
- KPI por centro/departamento y alertas accionables.

### F. Gestión de festivos
- Clasificación: general, local, recuperable, no recuperable, especial (ej. 24/12 tarde).
- Reglas automáticas: trabajar genera saldo, ausentarse sin justificar crea déficit, no trabajar mantiene saldo 0.

### G. Auditoría completa
- Registrar quién aprobó horas extra, modificó fichajes, cambió convenios/calendarios y mantener históricos inmutables para inspecciones.

---

## 3️⃣ Flujos operativos clave
- **Flujo 1:** cálculo diario (fichajes → horario teórico → reglas → movimiento → auditoría).
- **Flujo 2:** horas extra autorizadas (autorización previa → trabajo → validación → saldo → alerta si hay desfase).
- **Flujo 3:** déficit horario (saldo negativo automático + alerta al superar límites).
- **Flujo 4:** festivo trabajado (detección → regla de compensación → confirmación RRHH → movimiento + notificación).

---

## 4️⃣ UI / UX (TimeNow premium)

### Empleados
- Dashboard personal con saldo actual, gráfico semanal (positivo/negativo), últimos movimientos, botón “Solicitar Recuperación” y alertas de fichajes incompletos.
- Página de movimientos con filtros por origen, detalle de movimiento, adjuntos, motivo y aprobador.

### RRHH
- Vista general por centros (saldo actual, horas extra del mes, déficit, festivos, incidencias).
- Módulo de revisión de incidencias (correcciones, excesos no autorizados, déficit recurrente, alertas).
- Calendario de compensaciones (días libres compensatorios, festivos trabajados, recuperaciones, turnos).

---

## 5️⃣ Edge cases enterprise
- Fichajes cruzados entre días (turnos nocturnos) y jornadas partidas sin límite de pausa.
- Turnos >24h (sanidad), guardias localizadas, fichajes estimados (móvil sin batería) o duplicados (mala cobertura).
- Cambios de centro/convenio durante la jornada o mes, festivo sobre día compensado y ciclos de 4 semanas (hostelería).
- Horas neutras de transporte/desplazamientos y fichaje desde vehículo u obra pública.

---

## 6️⃣ Notificaciones
- **Empleado:** saldo < 0h, exceso detectado, doble fichaje, fichaje incompleto, solicitud aprobada/denegada.
- **RRHH:** usuarios con déficit, >10h extra semanal, incidencias repetidas, usuarios sin fichar salida, saldo negativo extremo.

---

## 7️⃣ Modelo de datos sugerido

### `bolsa_hours_movements`
- `id`, `employee_id`, `date`, `minutes`, `type` (extra, deficit, festivo, ajuste, recuperación…), `origin_id` (fichaje, solicitud, festivo, regla…), `approved_by`, `notes`, `created_at`.

### `overwork_authorizations`
- `id`, `employee_id`, `date`, `minutes_approved`, `approved_by`, `justification`, `status`.

### `settings_timebank`
- Límites por organización/centro, reglas especiales (festivos, flexible windows, tolerancias) y escalados.

---

## 8️⃣ Dependencias y decisiones abiertas
- Alinear cálculo diario con `PLAN_BALANCE_MINUTOS` para reutilizar motor de minutos y snapshots por año.
- Definir interfaz con módulo de fichajes (detección de incidencias) y calendario laboral multisentros.
- Establecer estrategia de auditoría inmutable (posible uso de append-only table o event log).
- Priorizar conjunto inicial de reglas (público/privado) y estimar roadmap incremental (MVP → enterprise completo).

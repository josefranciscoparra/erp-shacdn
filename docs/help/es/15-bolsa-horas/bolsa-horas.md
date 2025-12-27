# Bolsa de Horas

## Qué es y para qué sirve

La **Bolsa de Horas** es un sistema que rastrea el equilibrio entre las horas trabajadas y las horas esperadas según tu horario. Su propósito es:

- **Registrar automáticamente** las diferencias diarias entre horas trabajadas y horas esperadas
- **Acumular horas extra** cuando trabajas más de lo previsto
- **Registrar déficits** cuando trabajas menos de lo esperado
- **Permitir recuperar** horas acumuladas para ausentarte, salir antes o trabajar menos
- **Compensar festivos** trabajados con días o horas adicionales

### Cómo funciona el cálculo automático

Cada día se calcula automáticamente tu diferencia:

**Diferencia = Horas Trabajadas - Horas Esperadas**

Luego se aplican estos pasos en orden:

1. **Redondeo**: Se redondea a múltiplos configurados (normalmente 5 minutos)
2. **Márgenes de gracia**: Pequeñas diferencias no se acumulan
3. **Clamping**: Si alcanzas el límite máximo, se recorta automáticamente

**Ejemplo:**
- Trabajaste 8h 20min, esperabas 8h → +20 min
- Se redondea a +20 min (múltiplo de 5)
- Si el margen de exceso es 15 min → +20 > 15 → Se acumula +20 min

## Quién puede usarlo

### Empleados
- **Ver su saldo**: Acceden a `/dashboard/me/time-bank`
- **Solicitar recuperación**: Usar horas acumuladas para ausentarse
- **Solicitar compensación**: Registrar festivos trabajados
- **Cancelar solicitudes**: Solo si están pendientes (en revisión)

### RRHH / Managers
- **Revisar solicitudes**: En `/dashboard/time-tracking/time-bank`
- **Aprobar/rechazar**: Con opción de comentarios
- **Ver estadísticas**: Saldos por empleado, solicitudes pendientes
- **Configurar límites**: En Settings → Bolsa de Horas

### Administradores
- **Acceso total**: A todas las funciones RRHH
- **Configurar la bolsa**: Márgenes, límites, redondeo

## Flujos principales

### 1) Ver mi saldo

**Dónde:** `/dashboard/me/time-bank`

**Qué ves:**

| Card | Información |
|------|-------------|
| **Saldo Disponible** | Tu balance total (+/- horas). En verde si es positivo, en rojo si es negativo |
| **Límites de Saldo** | Máximo permitido acumular (+80h por defecto) y máximo déficit permitido (-8h) |
| **En Revisión** | Cantidad de solicitudes pendientes de aprobar |

**Panel Últimos Movimientos:**
- Historial de los últimos 8 cambios en tu bolsa
- Origen del movimiento (cálculo diario, solicitud aprobada, festivo, etc.)
- Fecha y cantidad de horas
- Estados: "Aprobado", "Rechazado", "Cancelado"

**Panel Mis Solicitudes:**

Dos pestañas:
- **Pendientes**: Solicitudes en revisión (puedes cancelarlas)
- **Historial**: Todas tus solicitudes aprobadas, rechazadas o canceladas

### 2) Solicitar compensación o recuperación

**Cómo abrir el formulario:**

1. En `/dashboard/me/time-bank`
2. Click en el botón **"+ Nueva Solicitud"** (parte superior derecha)

**El formulario incluye:**

| Campo | Descripción |
|-------|-------------|
| **Tipo** | Selecciona "Recuperar horas" (-) o "Compensar festivo" (+) |
| **Fecha** | Cuándo aplica esta compensación/recuperación |
| **Horas** | Cantidad de horas (en múltiplos de 15 minutos: 0.25h, 0.5h, 1h, etc.) |
| **Motivo (opcional)** | Por qué solicitas esto |

**Presets disponibles:**
- 30 min
- 1h, 2h, 4h, 8h (botones rápidos)

**Validaciones:**
- Mínimo 15 minutos (0.25h)
- Máximo 24 horas en una solicitud
- Solo múltiplos de 15 minutos
- No puedes recuperar más de lo que tienes acumulado
- No puedes acumular más del límite máximo

**Flujo de aprobación:**

1. **Envías la solicitud** → Estado: "En revisión"
2. **RRHH la revisa** → Aprueba o rechaza
3. **Aprobada** → Se actualiza tu saldo inmediatamente
4. **Rechazada** → Recibes notificación con motivo (opcional)

### 3) Configurar bolsa (RRHH/Admin)

**Dónde:** `/dashboard/settings` → Pestaña "Bolsa de Horas"

#### Márgenes de Gracia

Los márgenes de gracia previenen que pequeñas diferencias se acumulen:

| Parámetro | Defecto | Rango | Qué significa |
|-----------|---------|-------|--------------|
| **Margen de Exceso** | 15 min | 0-60 min | Si trabajas ≤15 min más, NO se acumula |
| **Margen de Déficit** | 10 min | 0-60 min | Si trabajas ≤10 min menos, NO penaliza |

#### Redondeo de Diferencias

| Parámetro | Defecto | Opciones |
|-----------|---------|----------|
| **Incremento** | 5 min | 1, 5, 10, 15 min |

Las diferencias se redondean a este múltiplo ANTES de aplicar márgenes.

#### Límites de Saldo

| Parámetro | Defecto | Significado |
|-----------|---------|-------------|
| **Máximo Positivo** | 80h | El máximo que un empleado puede acumular |
| **Máximo Negativo** | 8h | El máximo déficit permitido antes de alertas |

---

## Pantallas y campos

### Página: `/dashboard/me/time-bank` (Empleado)

**Grid de 3 Cards:**
- Saldo Disponible: +2.5h
- Límites: +80h / -8h
- En Revisión: 1

**Dos columnas en grid:**
- Últimos Movimientos (historial de cambios)
- Mis Solicitudes (Pendientes / Historial)

**Estados de solicitudes:**
- "En revisión" → Pendiente de RRHH
- "Aprobada" → Aplicada a tu saldo
- "Rechazada" → No aplicada
- "Cancelada" → Cancelada por ti

### Página: `/dashboard/time-tracking/time-bank` (RRHH/Admin)

**Tabs:**
- Solicitudes: Pendientes, Aprobadas, Rechazadas
- Saldos por Empleado: Tabla con saldos de todos

**Card de solicitud:**
- Empleado: Nombre y número
- Tipo: Recuperar / Compensar
- Horas y fecha
- Botones: Aprobar / Rechazar

**Estadísticas resumidas:**
- Total Empleados con Saldo
- Total Acumulado
- Total Déficit
- Solicitudes Pendientes

---

## Preguntas frecuentes

**P: ¿Cómo se calcula automáticamente mi saldo?**
R: Cada día, TimeNow compara horas trabajadas (según fichajes) vs horas esperadas (según horario). La diferencia se redondea y aplican márgenes de gracia.

**P: ¿Puedo recuperar todas mis horas acumuladas de una vez?**
R: No. Hay límites: mínimo 15 minutos, máximo 24 horas por solicitud, y máximo déficit de -8 horas.

**P: ¿Qué pasa si rechazan mi solicitud?**
R: Tu saldo NO se modifica. Puedes ver el motivo del rechazo si dejaron comentario.

**P: ¿Qué pasa si alcanzo el límite máximo?**
R: Los movimientos automáticos se recortan y no puedes solicitar más compensaciones hasta bajar el saldo.

**P: ¿Qué diferencia hay entre "Recuperar" y "Compensar"?**
R: Recuperar resta horas de tu saldo (+). Compensar suma horas a tu saldo (ej: festivo trabajado).

**P: Si mi saldo es negativo, ¿tengo que recuperarlo?**
R: Depende de la política de tu organización. Tu RRHH te indicará.

**P: ¿Se pueden modificar los márgenes después de que empleados ya tengan saldo?**
R: Sí. Los nuevos márgenes se aplican a partir del día siguiente. El saldo existente NO se recalcula.

---

## Checklist de soporte

### Para Empleados
- [ ] Puede ver su saldo disponible
- [ ] Puede hacer una "Nueva Solicitud"
- [ ] Entiende la diferencia entre recuperación y compensación
- [ ] Puede cancelar una solicitud pendiente
- [ ] Puede ver los últimos movimientos

### Para RRHH/Managers
- [ ] Puede acceder a `/dashboard/time-tracking/time-bank`
- [ ] Puede filtrar solicitudes por estado
- [ ] Puede aprobar y rechazar con comentarios
- [ ] Puede ver estadísticas de saldos por empleado

### Para Administradores
- [ ] Acceso a Settings → Bolsa de Horas
- [ ] Puede configurar márgenes de gracia
- [ ] Puede modificar límites de saldo

---

**Última revisión**: 2025-12-27
**Owner interno**: TimeNow Team

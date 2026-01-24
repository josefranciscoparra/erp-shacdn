# Ejemplos reales de fichajes, eventos y guardias

Este documento resume casos reales y cómo se comporta el sistema **tal y como está ahora**, con recomendaciones de configuración y puntos pendientes.

## 1) Oficina estándar (9:00–18:00)
**Caso**: Entrada 9:05, salida 18:02.

- **Comportamiento actual**: No genera alerta si está dentro de tolerancias.
- **Configuración recomendada**:
  - Tolerancia entrada/salida: 10–15 min
  - Horas extra: cálculo diario
- **Cobertura**: ✅ Correcto

## 2) Oficina + evento nocturno (mismo día)
**Caso**: Jornada 9:00–18:00 + evento 21:00–23:30 (ficha entrada y salida).

- **Comportamiento actual**:
  - Se registran dos tramos de trabajo en el mismo día.
  - El motor calcula exceso sobre el horario esperado y aplica política de horas extra.
- **Config recomendada**:
  - Aprobación posterior si hay horas extra
  - Compensación según empresa (bolsa / nómina)
- **Cobertura**: ✅ Correcto

## 3) Evento nocturno que cruza medianoche
**Caso**: Evento 22:00–01:30.

- **Comportamiento actual**:
  - El fichaje cruza de día → se reparte en resumen diario.
  - Si falta la salida, se marca como pendiente y se notifica.
- **Recomendación**:
  - Crear **ventana protegida** (ej. 22:00–06:00) para evitar alertas falsas.
- **Cobertura**: ✅ Correcto, **mejor con ventana protegida**

## 4) Olvido de salida (modo por defecto)
**Caso**: Termina 18:00 y olvida fichar salida.

- **Comportamiento actual**:
  - Se marca como **pendiente de regularizar**.
  - Se notifica al empleado.
  - No se liquidan horas extra hasta regularizar.
- **Cobertura**: ✅ Enterprise (correcto)

## 5) Olvido de salida (modo “cierre automático” tipo Sesame)
**Caso**: Termina 18:00, olvida salida, empresa quiere autocierre.

- **Comportamiento actual**:
  - Se espera X minutos (campo “Margen tras fin de jornada”).
  - Si sigue abierto, **se cierra con la hora del horario** (18:00).
  - Queda **pendiente de revisión**.
  - Si supera el “Máximo sin cierre”, se autocierra por seguridad.
- **Config recomendada**:
  - Margen de espera: 360–600 min (6–10h)
  - Máximo sin cierre: 24–36h
- **Cobertura**: ✅ Correcto

## 6) Turno largo real (12h)
**Caso**: 08:00–20:00.

- **Comportamiento actual**:
  - Si el margen de espera es alto, no se corta el turno real.
  - Si se autocierra, queda pendiente y es revisable.
- **Config recomendada**:
  - Aumentar margen de espera en modo autocierre.
- **Cobertura**: ✅ Correcto con configuración adecuada

## 7) Guardia + intervención real
**Caso**: Guardia 22:00–06:00 + intervención 02:00–03:00.

- **Comportamiento actual**:
  - **Guardia**: se registra como disponibilidad (OnCallSchedule).
  - **Intervención**: se registra como trabajo real (OnCallIntervention) y crea fichajes automáticos.
  - Entra en WorkdaySummary y motor de horas extra/bolsa.
- **Recomendación**:
  - Ventana protegida para horarios nocturnos.
- **Cobertura**: ✅ Base funcional

## 8) Trabajo en sábado/festivo
**Caso**: Se trabaja un sábado.

- **Comportamiento actual**:
  - Se registra el fichaje.
  - El motor calcula exceso sobre horario esperado (0).
- **Config recomendada**:
  - Política “Trabajo en festivos”: requiere aprobación o no, según empresa.
- **Cobertura**: ✅ Correcto

## 9) Empresa con bolsa de horas
**Caso**: Un día sale 1h antes, otro día trabaja 1h más.

- **Comportamiento actual**:
  - Se acumulan diferencias en bolsa (según tolerancia y redondeo).
  - Se respetan límites configurados.
- **Cobertura**: ✅ Correcto

## 10) Casos con alertas “falsas”
**Caso**: Eventos recurrentes nocturnos o turnos especiales.

- **Comportamiento actual**:
  - Puede marcarse como “raro” si no hay configuración especial.
- **Solución**:
  - Crear **ventanas protegidas** por organización o empleado.
- **Cobertura**: ✅ Correcto con configuración

---

# Ventanas protegidas (detalle)

Las **ventanas protegidas** no crean fichajes ni horas extra. Solo “suavizan” el sistema cuando hay horarios especiales para evitar alertas falsas.

## Qué hacen exactamente
- Ajustan **tolerancias** y **máximo de horas abiertas** dentro de un rango horario.
- Evitan marcar como “raro” un fichaje en situaciones previstas (eventos nocturnos, cierres, inventarios).
- No afectan al cálculo de horas extra ni a la bolsa; solo al **sistema de detección**.

## Qué NO hacen
- No generan fichajes.
- No generan horas extra ni movimientos de bolsa.
- No sustituyen a una guardia ni a una intervención real.

## Ejemplos reales
**A) Evento nocturno puntual (22:00–01:30)**
- Ventana protegida: 21:00–02:00 (solo ese día).
- Efecto: evita alertas de “fichaje raro” si cruza medianoche.

**B) Semana de cierre mensual**
- Ventana protegida: 20:00–02:00 (L–V).
- Efecto: tolerancia más alta y menos ruido en alertas.

**C) Inventarios o campañas de retail**
- Ventana protegida: 06:00–00:00 (Sábado).
- Efecto: no “castiga” una jornada extendida.

## Buenas prácticas de configuración
- Usar **ventanas por organización** si aplica a muchos.
- Usar **ventanas por empleado** cuando es algo puntual o individual.
- Aumentar tolerancia solo lo necesario (no más de 30–60 min salvo casos especiales).
- Aumentar maxOpenHours si hay jornadas largas reales (12–16h).

## Encaje con guardias
- **Guardias**: disponibilidad planificada (no afectan fichajes salvo intervención).
- **Ventanas protegidas**: reglas suaves para evitar alertas falsas.
- Se pueden combinar: guardia nocturna + ventana protegida para evitar “ruidos”.

---

# Estado actual del sistema (según código)

## ✅ Ya implementado
- **Modo por defecto “Pendiente de regularizar”.**
- **Modo “Cierre automático”** (tipo Sesame) con cierre a hora del horario y revisión.
- **Notificaciones al empleado** por fichaje sin salida.
- **Notificaciones a responsables** (si alertas activas).
- **Worker nocturno** para fichajes abiertos + autocierres.
- **Ventanas protegidas** con UI y CRUD.
- **Guardias e intervenciones** con UI y CRUD:
  - Página: `/dashboard/time-tracking/on-call`
  - **Calendario de guardias** integrado en la misma vista.
  - **Compensación de disponibilidad** (tiempo/importe/mixto) con liquidación automática.
  - **Aprobaciones de intervenciones** con bandeja dedicada: `/dashboard/approvals/on-call`.
  - **Notificaciones** específicas para guardias/intervenciones.
  - Intervenciones crean fichajes reales y resumen diario (si no requieren aprobación).
- **Cálculo de horas extra** y reconciliación semanal (según policy).

## ⚠️ Pendientes o parcialmente cubierto
- **Reglas avanzadas por equipos/departamentos**
  - Ventanas protegidas solo por organización o empleado (no por departamento/equipo).
- **Reportes específicos**
  - No hay reportes dedicados de guardias/intervenciones.
- **Tests automatizados**
  - No hay cobertura de tests para el motor de fichajes/autocierre.

---

# Sugerencia de configuración “oficina + eventos”

**Modo por defecto**: Pendiente de regularizar
- Notificar empleado: ✅
- Revisión si hay horas extra: ✅

**Modo autocierre (si se activa)**
- Espera antes de cerrar: 360–600 min
- Máximo sin cierre: 24–36 horas
- Cerrar con hora del horario

**Ventanas protegidas**
- 22:00–06:00 (para eventos o guardias nocturnas)

---

Si quieres, puedo ampliar con ejemplos por sector (retail, sanidad, industrial) o convertirlo en guía de configuración por empresa.

---

# Casuísticas adicionales (generado por Claude)

## 11) Empleado oficina + evento sábado nocturno

**Caso**: Empleado con horario L-V 40h. El sábado tiene un evento de 18:00 a 02:00 (cruza medianoche).

**Configuración**: Modo "Pendiente de regularizar" (tipo Factorial).

### Qué pasa automáticamente

| Día | Horas trabajadas | Horas esperadas | Exceso |
|-----|------------------|-----------------|--------|
| Sábado | 6h (18:00-00:00) | 0h | +6h extra |
| Domingo | 2h (00:00-02:00) | 0h | +2h extra |
| **Total** | **8h** | **0h** | **+8h extra** |

### Configuración recomendada

**Ventana protegida** (opcional, evita alertas):
- Nombre: "Eventos sábado noche"
- Día: Sábado (o fecha puntual)
- Inicio: 17:00
- Fin: 03:00

**Flujo del empleado**:
1. Ficha entrada: Sábado 18:00
2. Ficha salida: Domingo 02:00
3. Sistema calcula: 8h extra
4. Según política → Aprobación / Bolsa / Nómina

**Cobertura**: ✅ Funciona automáticamente. Ventana protegida solo para evitar ruido en alertas.

---

## 12) Jornada extendida que cruza medianoche (18h continuas)

**Caso**: Empleado empieza viernes 08:00 y por complicaciones acaba sábado 02:00 (18 horas continuas).

**Configuración**: Modo "Pendiente de regularizar" (tipo Factorial).

### Qué pasa automáticamente

| Día | Horas trabajadas | Horas esperadas | Exceso |
|-----|------------------|-----------------|--------|
| Viernes | 16h (08:00-00:00) | ~8h | +8h extra |
| Sábado | 2h (00:00-02:00) | 0h | +2h extra |
| **Total** | **18h** | **8h** | **+10h extra** |

### Posibles alertas sin configuración

- ⚠️ "Fichaje abierto demasiado tiempo" (si max horas < 18h)
- ⚠️ "Fichaje en horario nocturno"
- ⚠️ "Duración excesiva de jornada"

### Configuración recomendada

**Ventana protegida** (necesaria para evitar alertas):
- Nombre: "Jornada extendida viernes"
- Día: Viernes (o fecha puntual)
- Inicio: 06:00
- Fin: 03:00 (sábado)
- **Max horas abiertas: 20-24h** ← Crítico para este caso

### Nota sobre parámetros de ventana protegida

| Parámetro | Para qué sirve | Relevancia en este caso |
|-----------|----------------|------------------------|
| **Max horas abiertas** | Tiempo máximo que puede estar un fichaje sin cerrar antes de alertar | **CRÍTICO** - debe ser mayor que la jornada (20-24h) |
| **Tolerancia entrada** | Margen antes/después de hora de entrada esperada | Útil si hay hora de inicio definida |
| **Tolerancia salida** | Margen después de hora de salida esperada | **Irrelevante** si no hay hora de fin definida (ej: sábado sin horario) |

**Cobertura**: ✅ Funciona, pero **requiere ventana protegida** con max horas abiertas alto para evitar alertas falsas.

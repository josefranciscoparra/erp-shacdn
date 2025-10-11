# Sistema de Horarios Mejorado - Especificación Funcional

**Versión:** 1.0
**Fecha:** 2025-10-11
**Estado:** Propuesta

---

## 1. Resumen Ejecutivo

### 1.1 Visión General

El sistema actual de horarios solo permite configurar horas semanales totales que se distribuyen uniformemente entre lunes y viernes. Esta especificación propone un sistema flexible que permita:

- **Horarios personalizados por empleado** adaptados a su contrato
- **Diferentes tipos de jornada**: 5 días, 6 días, semanas personalizadas
- **Planificación de turnos**: rotativos, semanales, mensuales
- **Gestión de horas extras**: detección automática, aprobación, seguimiento
- **Múltiples patrones horarios**: fijo, flexible, turnos, personalizado

### 1.2 Objetivos

1. **Flexibilidad total** en la configuración de horarios por empleado
2. **Automatización** del cálculo de horas esperadas vs. trabajadas
3. **Control riguroso** de horas extras con flujo de aprobación
4. **Soporte para turnos rotativos** con planificación visual
5. **Adaptación a diferentes sectores**: oficina, comercio, industria, hostelería

---

## 2. Análisis del Sistema Actual

### 2.1 Modelo Actual

**EmploymentContract:**
- `weeklyHours`: Horas semanales totales (ej: 40.00)
- Asume distribución uniforme: `weeklyHours / 5 = horas por día`

**TimeEntry:**
- Registros individuales de entrada/salida
- No hay concepto de "horario esperado"

**WorkdaySummary:**
- Calcula minutos trabajados totales
- No compara con horario esperado
- No detecta horas extras

### 2.2 Limitaciones Identificadas

❌ **No configurable por empleado:** Todos los trabajadores con 40h/semana tienen el mismo horario
❌ **Solo 5 días a la semana:** No soporta 6 días o distribuciones custom
❌ **Sin planificación:** No se puede asignar turnos a futuro
❌ **Sin turnos rotativos:** Imposible gestionar mañana/tarde/noche
❌ **Sin horas extras:** No se detectan ni controlan automáticamente
❌ **Sin validaciones:** No hay control de solapamientos o inconsistencias

### 2.3 Casos de Uso No Cubiertos

- **Trabajador comercio:** 6 días/semana, turnos rotativos mañana/tarde
- **Trabajador industria:** Turnos de 12h, 3 días ON / 3 días OFF
- **Trabajador horario flexible:** Entrada entre 8-10h, 8h totales
- **Trabajador a tiempo parcial:** Lunes/Miércoles/Viernes de 9-13h
- **Trabajador con horas extras:** Supervisar y aprobar extras diarias

---

## 3. Propuesta Funcional del Sistema Mejorado

### 3.1 Conceptos Clave

#### **Work Schedule (Horario Base)**
Configuración del horario asignado a un contrato laboral.

**Atributos funcionales:**
- Nombre descriptivo (ej: "Oficina Estándar", "Turno Rotativo Comercio")
- Tipo de horario: FIXED, FLEXIBLE, SHIFT_BASED, CUSTOM
- Horas semanales totales
- Días de trabajo: qué días de la semana se trabaja (L-V, L-S, personalizado)
- Validez temporal: desde/hasta qué fechas aplica

**Tipos de horario:**

1. **FIXED (Fijo):** Mismo horario todos los días
   - Ejemplo: L-V de 9:00 a 18:00 (1h comida)

2. **FLEXIBLE:** Rango de entrada/salida con horas mínimas
   - Ejemplo: Entrada 8-10h, salida después de 8h trabajadas

3. **SHIFT_BASED (Por turnos):** Turnos predefinidos asignables
   - Ejemplo: Mañana (6-14h), Tarde (14-22h), Noche (22-6h)

4. **CUSTOM (Personalizado):** Cada día puede tener horario diferente
   - Ejemplo: L-X-V de 9-14h, M-J de 15-20h

#### **Shift Pattern (Patrón de Turno)**
Plantilla reutilizable de un turno específico.

**Atributos funcionales:**
- Nombre: "Turno Mañana", "Turno Tarde", "Turno Noche"
- Hora inicio y fin
- Descansos incluidos (ej: 30min de 12-12:30h)
- Horas efectivas del turno
- Color de identificación visual
- Tipo: MORNING, AFTERNOON, NIGHT, SPLIT (partido)

**Ejemplos:**
- **Turno Mañana:** 06:00-14:00 (30min descanso) = 7.5h efectivas
- **Turno Tarde:** 14:00-22:00 (30min descanso) = 7.5h efectivas
- **Turno Noche:** 22:00-06:00 (1h descanso) = 7h efectivas
- **Turno Partido:** 09:00-13:00 + 17:00-21:00 = 8h efectivas

#### **Shift Assignment (Asignación de Turno)**
Asignación concreta de un turno a un empleado en una fecha específica.

**Atributos funcionales:**
- Empleado asignado
- Fecha concreta
- Patrón de turno aplicado
- Estado: SCHEDULED, CONFIRMED, COMPLETED, CANCELLED
- Notas (ej: "Cambio por petición")
- Creado por (planificador)

#### **Overtime Record (Registro de Horas Extras)**
Registro de tiempo trabajado por encima del horario esperado.

**Atributos funcionales:**
- Fecha del exceso
- Minutos de exceso
- Cálculo automático: `(tiempo trabajado) - (tiempo esperado) - (umbral tolerancia)`
- Estado: PENDING_APPROVAL, APPROVED, REJECTED
- Justificación del empleado
- Comentarios del aprobador
- ¿Es compensable? (sí/no)
- ¿Se paga? (sí/no)

---

## 4. Casos de Uso Detallados

### 4.1 Caso: Trabajador Oficina (L-V, 8h/día)

**Perfil:**
- Jornada: 40h/semana
- Días: Lunes a Viernes
- Horario: 9:00 - 18:00 (1h comida)

**Configuración:**
1. Crear WorkSchedule tipo FIXED
2. Horario: L-V, entrada 9:00, salida 18:00
3. Descanso: 13:00-14:00 (1h, no computable)
4. Horas efectivas por día: 8h
5. Umbral horas extras: A partir de 15 minutos de exceso

**Flujo diario:**
1. Empleado ficha entrada a las 9:05 (5min retraso, dentro de tolerancia)
2. Ficha salida de comida 13:00, entrada 14:00
3. Ficha salida a las 18:30 (30min de más)
4. Sistema calcula: 8h 25min trabajadas
5. Sistema detecta: 25min de horas extras (excede umbral de 15min)
6. Se crea OvertimeRecord en estado PENDING_APPROVAL
7. Manager recibe notificación para aprobar/rechazar

### 4.2 Caso: Trabajador Comercio (6 días/semana, turnos rotativos)

**Perfil:**
- Jornada: 40h/semana distribuidas en 6 días
- Días: Lunes a Sábado (domingo descanso)
- Turnos: Mañana (9-14h) y Tarde (16-21h) rotativos

**Configuración:**
1. Crear WorkSchedule tipo SHIFT_BASED
2. Crear ShiftPattern "Turno Mañana": 9:00-14:00 = 5h
3. Crear ShiftPattern "Turno Tarde": 16:00-21:00 = 5h
4. Crear ShiftPattern "Jornada Completa": 9:00-14:00 + 16:00-21:00 = 10h (sábados)

**Planificación semanal:**
- **Lunes:** Mañana (5h)
- **Martes:** Tarde (5h)
- **Miércoles:** Mañana (5h)
- **Jueves:** Tarde (5h)
- **Viernes:** Mañana (5h)
- **Sábado:** Completa (10h)
- **Domingo:** Descanso
- **Total:** 35h (ajustar según convenio)

**Flujo mensual:**
1. RRHH crea asignaciones para todo el mes
2. Empleado ve su calendario con turnos asignados
3. Sistema genera horario esperado por día automáticamente
4. Al fichar, se compara con el turno asignado ese día
5. Cualquier desviación >15min genera alerta

### 4.3 Caso: Trabajador Turnos 12h Rotativos (Industria)

**Perfil:**
- Jornada: 40h/semana promedio (ciclos de 2 semanas)
- Patrón: 3 días ON (12h) / 3 días OFF
- Turnos: Solo día (6:00-18:00) o solo noche (18:00-6:00)

**Configuración:**
1. Crear WorkSchedule tipo SHIFT_BASED con patrón 2 semanas
2. Crear ShiftPattern "Turno Día 12h": 6:00-18:00 (1h descanso) = 11h efectivas
3. Crear ShiftPattern "Turno Noche 12h": 18:00-6:00 (1h descanso) = 11h efectivas

**Planificación ciclo 2 semanas:**

**Semana 1:**
- L-M-X: Turno Día (33h)
- J-V-S-D: Descanso

**Semana 2:**
- L-M-X: Descanso
- J-V-S: Turno Noche (33h)
- D: Descanso

**Total ciclo:** 66h en 2 semanas = 33h/semana promedio

**Consideraciones:**
- El sistema debe calcular promedios en ciclos configurables
- Horas extras se calculan sobre el ciclo completo, no por día
- Fichajes nocturnos cruzan días (requiere lógica especial)

### 4.4 Caso: Trabajador Horario Flexible

**Perfil:**
- Jornada: 40h/semana
- Días: L-V
- Flexibilidad: Entrada entre 7:00-10:00, mínimo 8h/día

**Configuración:**
1. Crear WorkSchedule tipo FLEXIBLE
2. Ventana entrada: 7:00-10:00
3. Horas mínimas por día: 8h
4. Sin hora de salida fija (depende de entrada)
5. Descanso mínimo: 1h (no computable)

**Ejemplos válidos:**
- Entrada 7:00, salida 16:00 (8h + 1h comida) ✅
- Entrada 9:30, salida 18:30 (8h + 1h comida) ✅
- Entrada 10:00, salida 19:00 (8h + 1h comida) ✅

**Ejemplos inválidos:**
- Entrada 10:15 (fuera de ventana) ❌
- Entrada 9:00, salida 17:00 (solo 7h efectivas) ❌

**Flujo:**
1. Empleado ficha entrada dentro de ventana
2. Sistema calcula hora mínima de salida: entrada + 8h + 1h comida
3. Si sale antes, genera alerta de jornada incompleta
4. Si sale después, puede generar horas extras (según umbral)

### 4.5 Caso: Trabajador Tiempo Parcial Personalizado

**Perfil:**
- Jornada: 20h/semana
- Días: Lunes, Miércoles, Viernes
- Horario: Mañanas de 9:00 a 14:00 (sin descanso)

**Configuración:**
1. Crear WorkSchedule tipo CUSTOM
2. **Lunes:** 9:00-14:00 = 5h
3. **Martes:** No trabaja
4. **Miércoles:** 9:00-14:00 = 5h
5. **Jueves:** No trabaja
6. **Viernes:** 9:00-14:00 = 5h
7. **Sábado-Domingo:** No trabaja

**Total semanal:** 15h (ajustar a 20h si es necesario)

---

## 5. Gestión de Horas Extras

### 5.1 Detección Automática

**Criterios de detección:**

1. **Por día laboral:**
   - `Horas trabajadas > Horas esperadas + Umbral de tolerancia`
   - Ejemplo: Esperadas 8h, tolerancia 15min → Extras a partir de 8h 15min

2. **Por semana:**
   - `Horas semanales > Horas contrato + Umbral semanal`
   - Ejemplo: Contrato 40h, tolerancia 2h → Extras a partir de 42h

3. **Por ciclo (turnos rotativos):**
   - `Horas ciclo > Horas esperadas ciclo + Umbral`
   - Ejemplo: Ciclo 2 semanas = 80h → Extras a partir de 82h

**Umbrales configurables:**
- Por organización (global)
- Por departamento
- Por empleado (excepciones)

### 5.2 Tipos de Horas Extras

1. **Normales:** Días laborables, dentro de convenio
2. **Festivos:** Trabajadas en festivos (mayor compensación)
3. **Nocturnas:** Trabajadas en horario nocturno (22:00-6:00)
4. **Fin de semana:** Sábado/Domingo (si no son jornada habitual)

### 5.3 Flujo de Aprobación

**Estados del registro:**

1. **PENDING_APPROVAL:** Recién detectado, requiere justificación
2. **APPROVED:** Aprobado por manager
3. **REJECTED:** Rechazado (no se compensa/paga)
4. **AUTO_APPROVED:** Aprobado automáticamente (según políticas)

**Proceso:**

1. **Detección automática:**
   - Sistema detecta exceso al cerrar día laboral
   - Crea OvertimeRecord en PENDING_APPROVAL
   - Notifica al empleado: "Tienes 30min extras pendientes de justificar"

2. **Justificación del empleado:**
   - Empleado accede y añade justificación
   - Ejemplo: "Reunión urgente con cliente"
   - Indica si solicita compensación (tiempo libre) o pago

3. **Revisión del manager:**
   - Manager recibe notificación
   - Ve: fecha, horas, justificación, histórico del empleado
   - Aprueba o rechaza con comentarios
   - Si rechaza: debe indicar motivo

4. **Resultado:**
   - **Si aprueba:**
     - Se marca como APPROVED
     - Se contabiliza en balance de horas del empleado
     - Se exporta a nómina (si es de pago)
   - **Si rechaza:**
     - Se marca como REJECTED
     - Empleado recibe notificación con motivo
     - No se compensa ni paga

### 5.4 Políticas Configurables

**Auto-aprobación:**
- Activar/desactivar auto-aprobación
- Límite de horas auto-aprobables (ej: hasta 30min)
- Días de la semana aplicables
- Empleados o departamentos excluidos

**Alertas y límites:**
- Máximo de horas extras por día (ej: no más de 2h/día)
- Máximo de horas extras por semana (ej: no más de 10h/semana)
- Máximo de horas extras por mes (ej: no más de 40h/mes)
- Alertas a RRHH si se superan límites

**Compensación:**
- Proporción de compensación: 1:1 (1h extra = 1h libre) o 1:1.5
- Días festivos: compensación mayor (ej: 1:2)
- Plazo máximo para disfrutar compensación (ej: 6 meses)
- Política de pago vs. tiempo libre

---

## 6. Planificación de Turnos

### 6.1 Vista de Planificación

**Calendario mensual:**
- Vista de cuadrícula: empleados (filas) x días (columnas)
- Cada celda muestra turno asignado con color
- Drag & drop para asignar/cambiar turnos
- Detección de conflictos en tiempo real

**Filtros:**
- Por departamento
- Por centro de coste
- Por tipo de turno
- Por estado (planificado, confirmado)

### 6.2 Reglas de Validación

**Al asignar un turno:**

1. **Solapamiento:** No puede tener dos turnos simultáneos
2. **Descanso mínimo:** Entre turnos debe haber X horas (ej: 12h)
3. **Máximo horas/día:** No superar límite legal (ej: 12h)
4. **Máximo horas/semana:** No superar límite contrato + margen
5. **Días consecutivos:** Máximo X días seguidos sin descanso (ej: 6)
6. **Descanso semanal:** Mínimo 1 día completo por semana

**Alertas visuales:**
- 🔴 Error grave: Incumple legislación (bloquea guardado)
- 🟡 Advertencia: Excede recomendación (permite guardar con confirmación)
- 🟢 OK: Cumple todas las reglas

### 6.3 Turnos Rotativos Automáticos

**Definir patrón de rotación:**

Ejemplo: "Patrón Semanal Mañana-Tarde"
- **Semana 1:** Mañana (L-V)
- **Semana 2:** Tarde (L-V)
- **Repetir ciclo**

**Generación automática:**
1. Seleccionar empleados
2. Elegir patrón de rotación
3. Indicar período (ej: próximos 3 meses)
4. Sistema genera todas las asignaciones automáticamente
5. Revisar y confirmar

**Excepciones:**
- Marcar días festivos (no se asignan turnos)
- Marcar vacaciones aprobadas (se saltan)
- Permitir ajustes manuales post-generación

### 6.4 Confirmación de Turnos

**Flujo:**
1. **Planificador crea turnos:** Estado SCHEDULED
2. **Sistema notifica empleados:** "Tu horario del próximo mes está disponible"
3. **Empleado revisa y confirma:** Estado → CONFIRMED
4. **Cambios post-confirmación:** Requieren aprobación bilateral

**Notificaciones:**
- X días antes del turno (ej: recordatorio 2 días antes)
- Al cambiar un turno ya confirmado
- Al solicitar cambio de turno con compañero (swap)

---

## 7. Interfaz de Usuario Propuesta

### 7.1 Configuración de Horarios (RRHH)

**Página: /dashboard/work-schedules**

**Funcionalidades:**
- Listado de horarios configurados (tabla con filtros)
- Botón "Crear Horario"
- Al crear:
  - Formulario paso a paso (wizard)
  - Paso 1: Datos básicos (nombre, tipo, horas semanales)
  - Paso 2: Configuración de días y horas
  - Paso 3: Configuración de descansos
  - Paso 4: Umbrales de horas extras
  - Preview del horario configurado
- Acciones: Editar, Duplicar, Desactivar, Ver empleados asignados

### 7.2 Gestión de Patrones de Turno (RRHH)

**Página: /dashboard/shift-patterns**

**Funcionalidades:**
- Tarjetas visuales de patrones (con color y horas)
- Botón "Crear Patrón de Turno"
- Formulario simple: nombre, inicio, fin, descansos, color
- Preview: cómo se verá en calendario
- Uso: "Usado en 15 contratos"

### 7.3 Planificador de Turnos (Manager/RRHH)

**Página: /dashboard/shift-planner**

**Vista principal:**
- Calendario estilo Gantt
- Empleados en eje Y, días en eje X
- Drag & drop de patrones desde sidebar
- Indicadores visuales: ✅ Confirmado, 🕐 Pendiente, ⚠️ Conflicto
- Estadísticas en tiempo real: horas planificadas vs. requeridas

**Sidebar:**
- Lista de patrones disponibles (arrastrables)
- Filtros: departamento, centro, fecha
- Herramientas: Copiar semana, Generar patrón rotativo, Limpiar selección

**Acciones batch:**
- Seleccionar múltiples empleados
- Asignar mismo turno a todos
- Generar patrón automático
- Enviar notificaciones masivas

### 7.4 Mi Horario (Empleado)

**Página: /dashboard/my-schedule**

**Vista calendario:**
- Mes actual con turnos asignados
- Hoy destacado
- Cada día muestra:
  - Turno asignado (ej: "Mañana 9-14h")
  - Horas esperadas (ej: "5h")
  - Si ya trabajó: horas reales vs. esperadas
  - Estado: Pendiente / Completado / Horas extras detectadas

**Información lateral:**
- Resumen semanal: horas esperadas / trabajadas
- Resumen mensual: total acumulado
- Horas extras pendientes de aprobación
- Próximos turnos (lista)

**Acciones:**
- Solicitar cambio de turno
- Ver compañeros con mismo turno
- Descargar horario en PDF/iCal

### 7.5 Aprobación de Horas Extras (Manager)

**Página: /dashboard/overtime-approvals**

**Vista de listado:**
- Tabla de horas extras pendientes
- Columnas: Empleado, Fecha, Horas extras, Justificación, Tipo
- Filtros: Pendientes / Todas, Empleado, Fecha, Departamento
- Ordenación: Más antiguas primero

**Vista de detalle (modal):**
- Información del día:
  - Horario esperado
  - Fichajes reales
  - Línea temporal visual
  - Horas extras calculadas
- Justificación del empleado
- Histórico de horas extras del empleado (últimos 30 días)
- Campos de aprobación:
  - Aprobar / Rechazar
  - Comentarios del manager
  - Tipo de compensación (si aprueba): Pago / Tiempo libre

**Aprobación masiva:**
- Checkbox para seleccionar múltiples
- Botón "Aprobar seleccionadas" con confirmación

---

## 8. Reglas de Negocio y Validaciones

### 8.1 Validaciones de Configuración

**Al crear/editar WorkSchedule:**
- ✅ Horas semanales > 0 y ≤ límite legal (ej: 40h)
- ✅ Al menos 1 día de trabajo seleccionado
- ✅ Si tipo FIXED: horarios consistentes
- ✅ Si tipo FLEXIBLE: ventana de entrada válida (ej: max 4h)
- ✅ Descansos dentro del horario laboral
- ✅ Nombre único por organización

**Al crear/editar ShiftPattern:**
- ✅ Hora fin > hora inicio (o cruza medianoche explícito)
- ✅ Descansos no superan duración total
- ✅ Horas efectivas razonables (ej: entre 1h y 12h)

**Al asignar ShiftAssignment:**
- ✅ Empleado tiene contrato activo en esa fecha
- ✅ No hay solapamiento con otro turno
- ✅ Descanso mínimo desde último turno (ej: 12h)
- ✅ No supera máximo horas/semana del contrato
- ✅ Empleado no tiene vacaciones aprobadas ese día

### 8.2 Cálculos Automáticos

**Horas esperadas por día:**
```
Si horario FIXED:
  horas_esperadas = horas_definidas_para_ese_día

Si horario FLEXIBLE:
  horas_esperadas = horas_mínimas_configuradas

Si horario SHIFT_BASED:
  horas_esperadas = horas_efectivas_del_turno_asignado

Si horario CUSTOM:
  horas_esperadas = horas_definidas_para_ese_día_semana
```

**Horas trabajadas:**
```
1. Obtener todos los TimeEntry del día
2. Agrupar por tipo: CLOCK_IN, CLOCK_OUT, BREAK_START, BREAK_END
3. Calcular intervalos trabajados:
   - Desde CLOCK_IN hasta CLOCK_OUT
   - Restar pausas: desde BREAK_START hasta BREAK_END
4. Sumar todos los intervalos = horas_trabajadas
```

**Horas extras:**
```
diferencia = horas_trabajadas - horas_esperadas

Si diferencia > umbral_tolerancia:
  horas_extras = diferencia - umbral_tolerancia
  Crear OvertimeRecord
Sino:
  horas_extras = 0
  No crear registro
```

### 8.3 Notificaciones Automáticas

**Empleado:**
- 📅 Nuevo horario asignado (al crear/cambiar)
- ⏰ Recordatorio de turno (X horas antes)
- ✅ Horas extras aprobadas
- ❌ Horas extras rechazadas (con motivo)
- ⚠️ Jornada incompleta (no alcanzó horas mínimas)

**Manager:**
- 🔔 Nueva hora extra pendiente de aprobación
- 📊 Resumen semanal de horas extras del equipo
- ⚠️ Empleado supera límite de horas extras mensual

**RRHH:**
- 📈 Informe mensual de horas extras por departamento
- 🚨 Alertas de incumplimiento legal (ej: empleado sin descanso semanal)
- 📊 Turnos del próximo mes sin confirmar

---

## 9. Roadmap de Implementación

### Fase 1: Configuración Básica de Horarios (Sprint 1)

**Objetivo:** Permitir configurar horarios personalizados por empleado.

**Entregables:**
- Modelo de datos: WorkSchedule
- CRUD de horarios (RRHH)
- Asignación de horario a contrato laboral
- Cálculo de horas esperadas vs. trabajadas en WorkdaySummary
- UI básica de visualización de mi horario (empleado)

**Criterios de aceptación:**
- Un empleado puede tener un horario FIXED asignado
- El sistema calcula correctamente las horas esperadas por día
- La página de fichajes muestra: esperadas / trabajadas / diferencia

---

### Fase 2: Turnos y Planificación (Sprint 2-3)

**Objetivo:** Implementar sistema de turnos y planificador visual.

**Entregables:**
- Modelo de datos: ShiftPattern, ShiftAssignment
- CRUD de patrones de turno
- Planificador de turnos (calendario drag & drop)
- Validaciones de solapamiento y descansos
- Confirmación de turnos por empleado
- Notificaciones de turnos asignados

**Criterios de aceptación:**
- Se pueden crear patrones reutilizables (Mañana, Tarde, Noche)
- Manager puede asignar turnos visualmente en calendario
- Sistema valida y alerta de conflictos
- Empleados reciben y confirman sus turnos

---

### Fase 3: Horas Extras y Aprobaciones (Sprint 4-5)

**Objetivo:** Automatizar detección y aprobación de horas extras.

**Entregables:**
- Modelo de datos: OvertimeRecord
- Detección automática de horas extras (al cerrar día)
- Configuración de umbrales (global, departamento, empleado)
- Flujo de justificación (empleado) y aprobación (manager)
- UI de aprobación masiva
- Notificaciones de horas extras
- Dashboard de horas extras para managers

**Criterios de aceptación:**
- Al superar umbral, se crea registro automáticamente
- Empleado puede justificar y solicitar compensación
- Manager puede aprobar/rechazar con comentarios
- Se contabilizan horas aprobadas en balance del empleado
- Exportable a nómina

---

### Fase 4: Turnos Rotativos Avanzados (Sprint 6-7)

**Objetivo:** Soportar patrones complejos y generación automática.

**Entregables:**
- Patrones de rotación configurables (ciclos N semanas)
- Generador automático de turnos según patrón
- Soporte para ciclos de cómputo no semanales (ej: 2 semanas)
- Cálculo de horas extras sobre ciclo completo
- Plantillas de patrones preconfigurables (comercio, industria, etc.)
- Swap de turnos entre empleados (intercambio)

**Criterios de aceptación:**
- Se puede definir patrón "3 días ON / 3 días OFF" de 12h
- Sistema genera automáticamente 3 meses de turnos
- Horas extras se calculan sobre ciclo de 2 semanas
- Empleados pueden proponer intercambios de turnos

---

## 10. Consideraciones Técnicas

### 10.1 Migración de Datos Existentes

**WorkdaySummary actual:**
- Ya tiene `totalWorkedMinutes` calculado
- Añadir campo `expectedMinutes` (calculado retroactivamente)
- Añadir campo `overtimeMinutes` (diferencia si positiva)

**EmploymentContract actual:**
- Ya tiene `weeklyHours`
- Crear WorkSchedule FIXED por defecto: L-V, horas/día = weeklyHours/5
- Asignar a todos los contratos existentes

### 10.2 Rendimiento

**Consultas frecuentes:**
- Horas esperadas hoy para un empleado → Cachear horario activo
- Turnos de la próxima semana → Index por fecha
- Horas extras pendientes de un manager → Index por approverId + status

**Carga pesada:**
- Generación automática de 3 meses de turnos → Job asíncrono en background
- Cálculo de horas extras de todo un mes → Procesamiento batch nocturno

### 10.3 Seguridad y Permisos

**Roles y acciones:**

| Acción | EMPLOYEE | MANAGER | HR_ADMIN | ORG_ADMIN |
|--------|----------|---------|----------|-----------|
| Ver mi horario | ✅ | ✅ | ✅ | ✅ |
| Confirmar mi turno | ✅ | ✅ | ✅ | ✅ |
| Justificar mis extras | ✅ | ✅ | ✅ | ✅ |
| Ver horario de mi equipo | ❌ | ✅ | ✅ | ✅ |
| Asignar turnos a mi equipo | ❌ | ✅ | ✅ | ✅ |
| Aprobar extras de mi equipo | ❌ | ✅ | ✅ | ✅ |
| Configurar horarios | ❌ | ❌ | ✅ | ✅ |
| Configurar patrones de turno | ❌ | ❌ | ✅ | ✅ |
| Ver dashboard global | ❌ | ❌ | ✅ | ✅ |

### 10.4 Exportación para Nómina

**Formato de exportación:**
- CSV/Excel con columnas:
  - Empleado (número empleado)
  - Mes/Año
  - Horas trabajadas totales
  - Horas extras aprobadas
  - Desglose por tipo (normales, festivas, nocturnas)
  - Horas compensables vs. pagables
- Filtros: por departamento, por centro de coste, por período
- Generación programada: cada fin de mes automáticamente

---

## 11. Métricas de Éxito

**KPIs a medir:**

1. **Adopción:**
   - % de empleados con horario personalizado configurado
   - % de turnos confirmados por empleados

2. **Eficiencia:**
   - Tiempo promedio de planificación mensual de turnos
   - Reducción de errores en nómina por horas extras

3. **Cumplimiento:**
   - % de horas extras aprobadas vs. rechazadas
   - % de días sin incidencias de horario

4. **Satisfacción:**
   - Encuesta de satisfacción de empleados con visibilidad de horarios
   - Feedback de managers sobre facilidad de planificación

---

## 12. Glosario

- **WorkSchedule:** Configuración de horario base asignado a un contrato
- **ShiftPattern:** Plantilla reutilizable de un turno (ej: Mañana, Tarde)
- **ShiftAssignment:** Asignación concreta de un turno a un empleado en una fecha
- **OvertimeRecord:** Registro de horas trabajadas por encima de lo esperado
- **Umbral de tolerancia:** Minutos de margen antes de considerar horas extras
- **Turno rotativo:** Patrón de turnos que cambia según ciclo predefinido
- **Horario flexible:** Permite entrada en ventana horaria con mínimo de horas
- **Horas efectivas:** Horas trabajadas descontando pausas
- **Ciclo de cómputo:** Período sobre el que se calculan promedios (ej: 2 semanas)

---

**Fin del documento**

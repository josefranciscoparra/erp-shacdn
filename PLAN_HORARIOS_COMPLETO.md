# Plan Maestro de Implementación de Horarios (Sector Público y Privado)

## 1. Resumen del Estado Actual

Actualmente, el sistema cuenta con una arquitectura de base de datos "V2" (`ScheduleTemplate`, `Period`, `Pattern`, `TimeSlot`) ya definida en el esquema Prisma, pero pendiente de explotación completa en la UI y lógica de negocio.

### Lo que ya tenemos (Backend/DB):

- ✅ **Horarios Fijos y Estacionales:** Estructura para definir horarios de oficina (L-V) y variaciones (Jornada Verano) mediante `SchedulePeriod`.
- ✅ **Turnos Rotativos Matemáticos:** Modelos `ShiftRotationPattern` para definir secuencias lógicas (ej. 6 días trabajo / 4 libres, o M-T-N-L-L).
- ✅ **Excepciones:** Modelo `ExceptionDayOverride` para cambios puntuales.

### Lo que falta (Gap Analysis):

- ❌ **Planificación Dinámica (Retail/Hostelería):** El modelo actual asume que el empleado "hereda" un patrón. No hay una forma eficiente de hacer "Rostering" (cuadrante manual semana a semana) sin crear una excepción para cada día.
- ❌ **Bolsa de Horas / Cómputo Anual (Sector Público):** Aunque calculamos minutos trabajados, falta la visualización y gestión del "Saldo de Horas" a largo plazo (deuda o crédito de horas respecto al convenio).
- ❌ **Intercambio de Turnos:** Lógica para que dos empleados soliciten cambiar un turno validando reglas.

---

## 2. Plan de Implementación Propuesto

El objetivo es cubrir la casuística completa de **Sector Público** (turnos complejos, cómputo anual, rigidez normativa) y **Sector Privado** (flexibilidad total, planificación semanal, tiendas/restaurantes).

### Fase 1: Refinamiento del Modelo de Datos (Backend)

Para soportar la planificación dinámica (tiendas/hospitales donde el turno cambia cada semana manualmente), propongo añadir/oficializar el concepto de **`PlannedShift`**:

1.  **Nuevo Modelo o Adaptación:**
    - _Opción A (Nueva Tabla):_ `PlannedShift` (Empleado, Fecha, TipoTurno, HoraInicio, HoraFin). Es más ligero que una "Excepción" y representa el plan base para sectores dinámicos.
    - _Opción B (Uso de Excepciones):_ Usar `ExceptionDayOverride` masivamente. (Menos recomendado por semántica).
    - **Recomendación:** Crear `ManualShiftAssignment` para planificaciones manuales que sobrescriben cualquier patrón automático.

2.  **Tipos de Turno (ShiftTypes):**
    - Crear catálogo de "Tipos de Turno" (ej. "Mañana A", "Refuerzo Tarde") para arrastrar y soltar en el planificador, en lugar de definir horas cada vez.

### Fase 2: Lógica de Negocio y Motor de Cálculo

Implementar la jerarquía de resolución de horarios ("¿Qué horario tiene Juan el martes 14?"):

1.  **Jerarquía de Resolución:**
    1.  ¿Existe un `ManualShiftAssignment` (Planificación manual)? -> **USAR ESTE**.
    2.  ¿Existe una `ExceptionDayOverride` (Cambio puntual/Urgencia)? -> **USAR ESTE**.
    3.  ¿Tiene una `RotationAssignment` (Policía/Fabrica)? -> **CALCULAR PASO DE ROTACIÓN**.
    4.  ¿Tiene una `FixedAssignment` (Oficina)? -> **USAR TEMPLATE**.
    5.  Defecto: Sin turno.

2.  **Contadores y Límites (Sector Público):**
    - Implementar validadores de "Descanso mínimo entre turnos" (ej. 12h).
    - Cálculo de "Horas Efectivas" vs "Horas Convenio" en tiempo real al planificar.

### Fase 3: Interfaces de Usuario (UI)

#### A. El "Cuadrante Inteligente" (Planner)

Una vista tipo Excel/Calendario para Managers:

- **Eje Y:** Empleados.
- **Eje X:** Días de la semana/mes.
- **Acciones:**
  - _Drag & Drop:_ Arrastrar un tipo de turno ("M", "T", "N") a una celda.
  - _Copiar/Pegar:_ Copiar la planificación de la semana anterior.
  - _Validación Visual:_ Alerta en rojo si un empleado supera horas semanales o rompe descanso.

#### B. Gestión de Rotaciones (Wizard)

UI para configurar patrones complejos una sola vez:

- "Configurar patrón 6x6": Definir los 6 días y asignar a un grupo de empleados.

#### C. Bolsa de Horas (Mi Saldo)

- Widget para el empleado: "Has trabajado 34h esta semana, debes 6h para cumplir tu contrato".

---

## 3. Hoja de Ruta (Roadmap) Sugerida

1.  **Semana 1:** Actualizar Prisma con `ManualShiftAssignment` (o refinar `PlannedShift`) y crear _Seeds_ de prueba para escenarios complejos (Policía Local y Tienda de Ropa).
2.  **Semana 2:** Implementar la función de backend `getEffectiveSchedule(employee, dateRange)` que resuelva la jerarquía (Manual > Excepción > Rotación > Fijo).
3.  **Semana 3:** Construir el componente UI `ShiftPlanner` (Cuadrante) básico.

## 4. Preguntas para Refinar

- ¿Prefieres que la "Planificación Manual" se guarde como `ScheduleTemplate` semanales (más rígido) o como entradas diarias sueltas (más flexible)?
- ¿El "Intercambio de Turnos" entre compañeros requiere aprobación del manager siempre?

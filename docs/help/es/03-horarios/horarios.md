# Horarios

## Qué es y para qué sirve

El sistema de **Horarios V2.0** es la herramienta centralizada para gestionar los horarios de trabajo de los empleados en TimeNow. Permite definir plantillas de horarios flexibles y reutilizables, asignarlas a empleados, crear excepciones para días especiales y monitorear el cumplimiento.

**Casos de uso principales:**

- **Horarios fijos** (oficinas, tiendas): entrada/salida a horas fijas
- **Turnos rotativos** (policía, bomberos): patrones de rotación 6x6, 24x72
- **Períodos especiales** (verano, Navidad): horarios diferentes por temporada
- **Franjas flexibles** (teletrabajo): entrada/salida flexible dentro de un rango
- **Excepciones globales** (festivos): afectar a todos los empleados

## Quién puede usarlo

- **Administradores de RRHH**: Crear y editar plantillas, períodos, asignaciones
- **Managers de departamentos**: Ver horarios de su equipo
- **Empleados**: Ver su propio horario asignado

---

## Conceptos clave

### Plantilla de Horario

Documento reutilizable que define el patrón de trabajo. Contiene:

- **Nombre y descripción**
- **Tipo de horario** (FIXED, SHIFT, ROTATION, FLEXIBLE)
- **Períodos** (diferentes configuraciones según temporada)
- **Empleados asignados**

**Ejemplo:** "Oficina Central L-V 9-18h" reutilizable para 50 empleados

### Período de Horario

Sección temporal dentro de una plantilla. Tipos:

- **REGULAR**: Período base (todo el año)
- **INTENSIVE**: Período intensivo (verano, Black Friday)
- **SPECIAL**: Período especial (Semana Santa, Navidad)

### Patrón de Día

Define si es día laboral y qué franjas horarias tiene:

- **Día de semana**: Lunes a domingo
- **¿Es laboral?**: Sí/No
- **Franjas horarias**: Detalles específicos

### Franja Horaria (TimeSlot)

Segmento de tiempo con características específicas:

- **Hora inicio/fin**: En minutos desde medianoche (0-1440)
- **Tipo**: WORK (trabajo), BREAK (pausa), ON_CALL (guardia)
- **Presencia**: MANDATORY (obligatorio) o FLEXIBLE (rango flexible)

**Ejemplo de día (Lunes):**

- 09:00-14:00 → WORK (300 min)
- 14:00-15:00 → BREAK pausa comida (60 min)
- 15:00-18:00 → WORK (180 min)
- Total: 8 horas trabajo

### Excepción

Anulación puntual del horario normal para un día específico:

- **Fecha**: Día afectado
- **Tipo**: No laborable, festivo, día especial
- **Alcance**: Global, por departamento, por empleado

---

## Flujos principales

### 1) Crear plantilla de horario

1. Ve a **Gestión de Horarios** → **Plantillas**
2. Haz clic en **Nueva Plantilla**
3. Rellena:
   - **Nombre**: Ej: "Oficina Central L-V"
   - **Tipo**: FIXED, SHIFT, ROTATION o FLEXIBLE
   - **Descripción** (opcional)
4. Haz clic en **Guardar**
5. Se abre el editor de períodos

![IMG: plantilla-nueva | Pantalla: Nueva plantilla de horario | Elementos clave: nombre, tipo, descripción | Acción destacada: Crear plantilla]

### 2) Configurar períodos

1. Dentro de la plantilla, ve a pestaña **Horarios**
2. Haz clic en **Crear Período**
3. Selecciona el tipo:
   - REGULAR (base, siempre activo)
   - INTENSIVE (verano, Black Friday)
   - SPECIAL (Semana Santa, Navidad)
4. Ingresa nombre y fechas de vigencia (opcional)
5. Haz clic en **Guardar**

### 3) Definir patrones por día

1. Dentro del período, verás el editor visual semanal
2. Para cada día (Lunes-Domingo):
   - Haz clic en el día
   - Marca **"¿Es día laboral?"**
   - Haz clic en **Agregar Franja**
   - Define hora inicio, hora fin, tipo (WORK/BREAK)
3. Repite para cada franja del día
4. Haz clic en **Guardar**

![IMG: editor-semanal | Pantalla: Editor de horario semanal | Elementos clave: días de semana, franjas horarias, botón agregar | Acción destacada: Configurar día]

**Validaciones automáticas:**

- Hora inicio debe ser menor que hora fin
- No hay solapamiento entre franjas del mismo tipo
- Las pausas pueden estar dentro del trabajo

### 4) Asignar a empleados

**Opción A: Individual**

1. Dentro de la plantilla, ve a pestaña **Empleados**
2. Haz clic en **Asignar Empleado**
3. Selecciona empleado del dropdown
4. Define fecha inicio y fecha fin (opcional)
5. Haz clic en **Guardar**

**Opción B: Masivo**

1. Haz clic en **Asignación Masiva**
2. Filtra por departamento o centro de coste
3. Selecciona empleados con checkboxes
4. Define fecha inicio común
5. Haz clic en **Asignar a XX empleados**

### 5) Crear excepciones

1. Ve a **Gestión de Horarios** → **Excepciones Globales**
2. Haz clic en **Crear Excepción**
3. Selecciona:
   - **Fecha**: El día afectado
   - **Tipo**: Festivo, No laboral, Día especial
   - **Razón**: Ej: "Navidad"
   - **Alcance**: Global, por departamento, por empleado
4. Haz clic en **Guardar**

---

## Pantallas y campos

### Lista de Plantillas

- **Nombre**: Identificador de la plantilla
- **Tipo**: Badge (Fijo/Turnos/Rotación/Flexible)
- **Empleados**: Contador de asignados
- **Períodos**: Contador configurados
- **Acciones**: Ver detalles, Editar, Eliminar

### Detalle de Plantilla

**Pestañas:**

- **Horarios**: Editor visual semanal con franjas
- **Empleados**: Tabla de empleados asignados
- **Excepciones**: Calendario y listado de excepciones

### Formulario de Período

- **Nombre**: Identificador del período
- **Tipo**: REGULAR, INTENSIVE, SPECIAL
- **Fecha inicio**: Cuándo comienza
- **Fecha fin**: Cuándo termina

### Formulario de Franja Horaria

- **Hora inicio**: En formato HH:MM
- **Hora fin**: En formato HH:MM
- **Tipo**: WORK, BREAK, ON_CALL
- **Presencia**: MANDATORY, FLEXIBLE
- **Descripción**: Ej: "Pausa comida"

---

## Políticas y reglas

**Prioridad de aplicación:**

1. Ausencias (vacaciones, permisos) → No trabaja
2. Excepciones de día → Anula horario normal
3. Período activo → SPECIAL > INTENSIVE > REGULAR
4. Plantilla base → Horario normal

**Validaciones:**

- Horas válidas: 0-1440 minutos (00:00-24:00)
- Un empleado solo puede tener una asignación activa
- No se pueden eliminar períodos con empleados asignados

---

## Preguntas frecuentes

**P: ¿Qué pasa si un empleado no tiene plantilla asignada?**

R: No puede fichar. El sistema le pide que contacte a RRHH.

**P: ¿Puedo cambiar un horario retroactivamente?**

R: Sí, con excepciones. Los fichajes ya registrados no se recalculan.

**P: ¿Las pausas son obligatorias?**

R: No. El tipo BREAK es informativo.

**P: ¿Puedo asignar una plantilla a múltiples empleados?**

R: Sí, usa "Asignación Masiva" en la pestaña Empleados.

**P: ¿Qué pasa con las rotaciones?**

R: Usa tipo ROTATION y define el patrón de rotación.

---

## Checklist de soporte

**Para crear plantilla:**

- [ ] ¿Nombre claro y descriptivo?
- [ ] ¿Tipo correcto seleccionado?
- [ ] ¿Al menos un período REGULAR creado?
- [ ] ¿Patrones de días completos (L-D)?
- [ ] ¿Franjas sin solapamientos?

**Para asignar empleado:**

- [ ] ¿Plantilla está activa?
- [ ] ¿Empleado está activo?
- [ ] ¿Fecha inicio es válida?
- [ ] ¿No tiene otra asignación activa?

**Troubleshooting:**

- [ ] Empleado no puede fichar → ¿Tiene plantilla asignada?
- [ ] Horario incorrecto → ¿Excepciones o período activo?
- [ ] Solapamiento → Revisar editor visual

---

**Última revisión**: 2025-12-27
**Owner interno**: TimeNow Team

# Gestión de Turnos

## Qué es y para qué sirve

El módulo de **Gestión de Turnos** es el sistema central para planificar, asignar y controlar los turnos de trabajo de tu equipo. Te permite:

- **Crear cuadrantes semanales/mensuales** para equipos de trabajo
- **Asignar turnos a empleados** especificando fecha, horario, lugar y zona de trabajo
- **Detectar conflictos automáticamente**: solapamientos, descanso mínimo insuficiente, empleados en ausencia, exceso de horas semanales
- **Aplicar plantillas de rotación** a múltiples empleados (ej: mañana-tarde-noche)
- **Gestionar zonas de cobertura** dentro de cada centro de trabajo (Cocina, Barra, Recepción, etc.)
- **Copiar/duplicar semanas anteriores** para mantener coherencia en la planificación
- **Publicar turnos** para que los empleados tengan acceso a su cuadrante

---

## Quién puede usarlo

**Permisos requeridos:**
- **ADMIN_ORG** (Administrador de Organización)
- **HR_ADMIN** (Administrador de Recursos Humanos)
- **SHIFT_MANAGER** (Gestor de Turnos)

El módulo está deshabilitado por defecto. Solo los administradores con permisos `manage_organization` pueden activar/desactivar el módulo y configurar el descanso mínimo entre turnos.

---

## Requisitos previos

Antes de empezar con turnos, asegúrate de que:

1. **El módulo está activado**: Ve a Configuración → Turnos y activa la opción
2. **Tienes empleados creados**: Con campo `usesShiftSystem = true`
3. **Tienes centros de trabajo configurados** (Cost Centers)
4. **Tienes zonas creadas**: Áreas dentro de cada centro con cobertura requerida

---

## Flujos principales

### 1) Ver cuadrante

El cuadrante es tu vista principal para visualizar y gestionar todos los turnos.

#### Acceder al cuadrante

1. Ve a **Gestión de Turnos** en el menú principal
2. Asegúrate de estar en la pestaña **"Cuadrante"**
3. El cuadrante se mostrará con los turnos de la semana actual

#### Opciones de visualización

**Vistas disponibles:**

| Vista | Uso | Mejor para |
|-------|-----|-----------|
| **Semana por empleado** | Ver todos los turnos de un empleado en la semana | Análisis individual |
| **Mes por empleado** | Vista compacta mensual por empleado | Reportes rápidos |
| **Semana por área** | Ver cobertura de cada zona/área | Validar cobertura |
| **Mes por área** | Heatmap de cobertura mensual | Análisis de cobertura general |

#### Navegación temporal

- **Semana anterior**: Botón ◀
- **Semana siguiente**: Botón ▶
- **Ir a hoy**: Botón "Hoy"

#### Filtros disponibles

- **Centro (Cost Center)**: Filtrar por ubicación
- **Zona**: Filtrar por área dentro del centro
- **Búsqueda por empleado**: Buscar por nombre
- **Estado**: Ver solo turnos publicados, borradores, o con conflictos

---

### 2) Asignar turno

Crear un nuevo turno para un empleado en una fecha específica.

#### Método 1: Click en cuadrante

1. **Haz clic en una celda vacía** del empleado en la fecha deseada
2. Se abre el diálogo de crear turno

#### Método 2: Botón "Nuevo turno"

1. Haz clic en el botón **+** en la barra superior
2. Se abre el diálogo vacío para crear turno

#### Formulario: Crear/Editar Turno

**Campos requeridos:**

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| **Empleado** | Selecciona de lista desplegable con búsqueda | "Juan García" |
| **Fecha** | Formato YYYY-MM-DD | 2025-12-28 |
| **Hora inicio** | Formato HH:mm | 08:00 |
| **Hora fin** | Formato HH:mm | 16:00 |
| **Centro** | Lugar de trabajo | Tienda Central |
| **Zona** | Área dentro del centro | Caja / Almacén |

**Campos opcionales:**

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| **Descanso (minutos)** | Tiempo de pausa durante el turno | 60 |
| **Rol** | Función específica | "Supervisor" |
| **Notas** | Observaciones | "Cobertura especial" |

#### Validaciones automáticas

**Errores (bloquean guardado):**
- Solapamiento con otro turno del mismo empleado ese día
- Empleado en ausencia (vacaciones/baja)
- Horario más corto que 30 minutos o más largo que 16 horas

**Warnings (permiten guardado):**
- Descanso insuficiente (<12h) con turno anterior
- Exceso de horas semanales (>150% de jornada contratada)

---

### 3) Editar turno

1. **Haz clic sobre el turno** en el cuadrante
2. Se abre el diálogo de edición con todos los campos rellenados
3. Modifica los campos que necesites
4. Haz clic en **"Actualizar"**

**Para eliminar:**
1. Abre el turno para editar
2. Haz clic en el botón **"Eliminar"** (papelera)
3. Confirma la acción

---

## Pantallas y campos

### Pantalla principal: Cuadrante

**Estructura:**
- Encabezado superior: Controles de vista, navegación, filtros
- Columnas: Cada día de la semana (L-D)
- Filas: Cada empleado del filtro activo
- Celdas: Turnos asignados o espacio vacío para crear nuevo

**Colores y símbolos:**

| Elemento | Significado |
|----------|-------------|
| Turno azul | Turno en estado "Borrador" |
| Turno verde | Turno publicado |
| Turno rojo | Turno con errores de conflicto |
| Fondo amarillo | Turno con warnings |
| "Ausencia" | Empleado fuera (vacaciones/baja) |

### Diálogo: Crear/Editar Turno

Campos: Empleado, Fecha, Inicio, Fin, Descanso, Centro, Zona, Rol, Notas

**Validaciones en tiempo real:**
- Campos requeridos marcados con *
- Errores bloqueantes en rojo
- Warnings (no bloquean) en amarillo

### Pestaña: Plantillas

Para crear plantillas de rotación de turnos:

1. Ve a la pestaña **"Plantillas"**
2. Haz clic en **"Nueva plantilla"**
3. Define nombre, patrón y duración
4. Selecciona empleados y rango de fechas
5. Haz clic en **"Aplicar plantilla"**

### Pestaña: Configuración

Gestión de zonas (áreas de cobertura):

- Tabla de zonas con columnas: Nombre, Centro, Cobertura mañana/tarde/noche
- Acciones: Editar / Eliminar

---

## Acciones masivas

### Copiar semana anterior

1. Haz clic en **"Copiar semana"**
2. Opción: Sobrescribir turnos existentes (sí/no)
3. Haz clic en **"Copiar"**

### Publicar turnos

1. Haz clic en **"Publicar"**
2. Confirma la acción
3. Los empleados recibirán notificación

---

## Panel de conflictos

El sistema detecta automáticamente conflictos en los turnos.

### Tipos de conflictos

| Tipo | Severidad | Descripción |
|------|-----------|-------------|
| **Solapamiento** | Error | Dos turnos del mismo empleado en el mismo horario |
| **Descanso mínimo** | Warning | Menos de 12h entre turnos consecutivos |
| **Ausencia** | Warning | Empleado asignado pero está en ausencia |
| **Horas semanales** | Warning | Exceso de horas en la semana |

---

## Preguntas frecuentes

**P: ¿Puedo asignar el mismo turno a múltiples empleados?**
R: Sí, pero uno por uno. O usa **Plantillas** para aplicar patrones a múltiples empleados a la vez.

**P: ¿Qué pasa si un empleado en ausencia tiene turnos asignados?**
R: El sistema muestra un **warning**. Puedes editar los turnos o ignorar el warning si es planificado.

**P: ¿Qué significa "Descanso mínimo no cumplido"?**
R: El empleado tiene menos de 12 horas entre el fin de un turno y el inicio del siguiente.

**P: ¿Los empleados pueden ver su cuadrante?**
R: Solo los turnos que están **publicados**. Los borradores solo los ven los administradores.

**P: ¿Puedo hacer que el descanso mínimo sea diferente?**
R: Sí. Los administradores pueden configurarlo en Configuración → Turnos.

---

## Checklist de soporte

### Módulo no aparece o está deshabilitado
- [ ] ¿Tienes permisos `manage_organization`?
- [ ] ¿El módulo está activado en Configuración → Turnos?

### No puedo crear turnos
- [ ] ¿Tienes empleados creados con `usesShiftSystem = true`?
- [ ] ¿Tienes al menos un centro de trabajo?
- [ ] ¿Tienes al menos una zona configurada?
- [ ] ¿El empleado no está en ausencia en esa fecha?

### El cuadrante se ve vacío
- [ ] ¿Hay turnos creados?
- [ ] ¿Los filtros están ocultando los turnos?
- [ ] ¿El rango de fechas es correcto?

### Los conflictos no se detectan
- [ ] ¿El panel de conflictos está abierto?
- [ ] ¿Los turnos tienen el mismo empleado y fecha?
- [ ] ¿El descanso mínimo está configurado correctamente?

---

**Última revisión**: 2025-12-27
**Owner interno**: TimeNow Team

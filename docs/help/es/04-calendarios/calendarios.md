# Calendarios Laborales

## Qué es y para qué sirve

Los calendarios laborales son herramientas para gestionar días festivos, cierres de oficina y eventos corporativos a nivel organizacional. Permiten:

- **Definir días no laborables** a nivel nacional, regional o por centro de coste
- **Marcar cierres de verano u otras paradas obligatorias**
- **Planificar eventos corporativos** importantes
- **Garantizar coherencia en fichajes** - El sistema usa estos calendarios para determinar si un día es laborable
- **Configurar horarios automáticamente** - El Sistema de Horarios excluye festivos automáticamente

## Quién puede usarlo

- **Administradores**: Crear, editar y eliminar calendarios
- **Managers**: Ver calendarios de su centro
- **Empleados**: Ver calendarios aplicables a su centro

---

## Flujos principales

### 1) Crear calendario

1. Ve a **Organización** → **Calendarios**
2. Haz clic en **Nuevo calendario**
3. Rellena el formulario:
   - **Nombre**: Ej: "Festivos Nacionales 2024"
   - **Descripción** (opcional)
   - **Año**: 2024, 2025, etc.
   - **Tipo**:
     - Festivos Nacionales: Aplica a toda la organización
     - Festivos Locales: Solo para un centro de coste
     - Eventos Corporativos: Eventos importantes
   - **Centro de coste** (solo si es Local)
   - **Color**: Para identificación visual
4. Haz clic en **Crear calendario**

![IMG: calendario-nuevo | Pantalla: Crear calendario | Elementos clave: nombre, tipo, año, color | Acción destacada: Guardar calendario]

### 2) Añadir días festivos

**Opción A: Añadir manualmente**

1. Abre el calendario desde la lista
2. Haz clic en **Nuevo evento**
3. Rellena:
   - **Nombre**: Ej: "Día de Reyes"
   - **Fecha**: Selecciona del calendario
   - **Fecha fin** (opcional): Si es un rango de días
   - **Tipo**: HOLIDAY, CLOSURE, EVENT
   - **¿Es recurrente?**: Si se repite cada año
4. Haz clic en **Guardar evento**

**Opción B: Importar festivos automáticamente**

1. Haz clic en **Importar festivos**
2. Selecciona:
   - **País**: España, Francia, Portugal, etc.
   - **Año**: 2024, 2025, etc.
3. Elige calendario destino o crea uno nuevo
4. Para España, puedes filtrar por región
5. Selecciona los festivos a importar
6. Haz clic en **Importar**

![IMG: importar-festivos | Pantalla: Importar festivos | Elementos clave: selector país, año, lista festivos | Acción destacada: Importar seleccionados]

### 3) Asignar a empleados

Los calendarios se asignan **automáticamente** según el centro de coste del empleado:

- **Calendarios sin centro**: Se aplican a TODOS los empleados
- **Calendarios con centro**: Solo aplican a empleados de ese centro

**Ejemplo:**

- "Festivos Nacionales 2024" (sin centro) → Todos los empleados
- "Festivos Madrid 2024" (centro: Madrid) → Solo empleados de Madrid
- "Festivos Cataluña 2024" (centro: Barcelona) → Solo empleados de Barcelona

---

## Pantallas y campos

### Lista de Calendarios

- **Pestañas**: Todos, Activos, Nacional, Local, Corporativo
- **Columnas**: Nombre, Año, Tipo, Centro, Nº Eventos, Estado
- **Acciones**: Ver detalle, Editar, Eliminar

### Detalle de Calendario

- **Información**: Tipo, año, centro, descripción
- **Lista de eventos**: Fecha, nombre, tipo, acciones
- **Botones**: Nuevo evento, Importar, Editar, Eliminar

### Formulario de Evento

- **Nombre**: Identificador del festivo
- **Descripción**: Detalles adicionales
- **Fecha**: Día del evento
- **Fecha fin**: Para rangos de varios días
- **Tipo**: HOLIDAY, CLOSURE, EVENT, MEETING
- **Recurrente**: Si se repite cada año

---

## Políticas y reglas

**Tipos de calendario:**

- **Nacional**: Aplica a toda la organización
- **Local**: Solo para un centro de coste específico
- **Corporativo**: Eventos de empresa

**Integración con fichajes:**

- Los días festivos se marcan como NO laborables
- Los empleados no pueden fichar en festivos (salvo configuración especial)
- Las horas esperadas excluyen festivos

**Prioridad de aplicación:**

- Calendarios nacionales + locales del centro del empleado

---

## Preguntas frecuentes

**P: ¿Qué pasa si desactivo un calendario?**

R: Los festivos de ese calendario ya no se aplicarán. Los fichajes posteriores se tratarán como días laborables.

**P: ¿Puedo duplicar un calendario?**

R: Actualmente no. Crea uno nuevo e importa los festivos.

**P: ¿Los empleados sin centro ven calendarios locales?**

R: No. Solo ven los calendarios nacionales (sin centro asignado).

**P: ¿Puedo editar eventos después de crearlos?**

R: Sí. Haz clic en el evento para abrir el diálogo de edición.

**P: ¿Los festivos importados incluyen regionales?**

R: Para España sí, con filtro por región. Otros países principalmente nacionales.

---

## Checklist de soporte

**Al crear calendario:**

- [ ] ¿Nombre descriptivo con año?
- [ ] ¿Tipo correcto seleccionado?
- [ ] ¿Centro asignado si es LOCAL?
- [ ] ¿Estado activo?

**Al añadir eventos:**

- [ ] ¿Fecha correcta?
- [ ] ¿Tipo de evento correcto?
- [ ] ¿Recurrente solo si se repite cada año?

**Troubleshooting:**

- Empleado no ve festivos → Verificar centro de coste en contrato
- No puedo crear → Verificar permisos de administrador
- Festivos duplicados → Revisar antes de importar

---

**Última revisión**: 2025-12-27
**Owner interno**: TimeNow Team

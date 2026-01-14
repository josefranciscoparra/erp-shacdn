# Gestión de Empleados

## Qué es y para qué sirve

**Gestión de Empleados** es el módulo central de TimeNow para administrar toda la plantilla de tu organización. Permite:

- Crear empleados de forma individual o importar masivamente
- Configurar información personal, contractual y de horarios
- Gestionar el acceso al sistema (usuarios, roles)
- Asignar contratos, equipos y jerarquía organizativa
- Consultar historial de fichajes y ausencias
- Desactivar empleados cuando se dan de baja

## Quién puede usarlo

- **Administradores RRHH**: Acceso completo para crear, editar, desactivar e importar
- **Managers**: Ver empleados de su equipo
- **Empleados**: Solo visualiza su propio perfil

---

## Flujos principales

### 1) Crear empleado individual

1. Ve a **Equipo** → **Gestión de Personal**
2. Haz clic en **Nuevo empleado**
3. Completa el **Wizard de 3 pasos**:

**Paso 1: Información Básica**

- Nombre, apellidos, NIF
- Email, teléfono, fecha de nacimiento
- Dirección, IBAN, contacto de emergencia

**Paso 2: Información Contractual**

- Tipo de contrato (INDEFINIDO, TEMPORAL, PRÁCTICAS)
- Fecha de inicio/fin
- Salario, puesto, departamento
- Centro de coste, manager, equipo

**Paso 3: Horarios de Trabajo**

- Seleccionar plantilla de horario
- Fecha de validez

4. Haz clic en **Finalizar**
5. El sistema crea empleado + contrato + horario automáticamente

![IMG: wizard-empleado | Pantalla: Wizard de creación | Elementos clave: pasos 1-2-3, formulario | Acción destacada: Completar wizard]

### 2) Importar empleados masivo

1. Ve a **Equipo** → **Gestión de Personal**
2. Haz clic en **Importar empleados**
3. Descarga la **plantilla XLSX/CSV**
4. Rellena los datos (máximo 500 filas):
   - Campos obligatorios: firstName, lastName, nifNie, email, schedule_template_id
   - Los IDs de horarios se obtienen de la URL de cada plantilla

5. Configura opciones:
   - **Modo vacaciones**: Saldo o Anual
   - **Enviar invitaciones**: Automático o manual
   - **Políticas**: Permitir warnings o ser estricto

6. Sube el archivo y valida
7. Revisa el preview:
   - 🟢 READY: Listas para importar
   - 🔴 ERROR: Datos inválidos
   - 🟡 WARNING: Avisos (se importa igual)

8. Haz clic en **Confirmar importación**

### 3) Editar empleado

1. En la tabla de empleados, haz clic en el nombre
2. Haz clic en **Editar**
3. Modifica en las pestañas disponibles:
   - **Personal**: Nombre, NIF, dirección
   - **Laboral**: Estado, número de empleado, equipo
   - **Contacto**: Email, teléfonos
   - **Emergencia**: Contacto de emergencia
   - **Acceso**: Usuario del sistema, rol
4. Haz clic en **Guardar cambios**

### 4) Desactivar empleado

1. En la tabla, haz clic en el menú **...** del empleado
2. Selecciona **Dar de baja**
3. Confirma la acción
4. El empleado pasa a "Inactivos" (datos conservados)

---

## Pantallas y campos

### Lista de Empleados

**Pestañas**: Activos, Inactivos, Todos, Recientes

**Columnas**:

- Nombre completo
- Email
- Número de empleado (ej: TMNW00001)
- Puesto, Departamento
- Tipo contrato, Fecha inicio
- Estado, Equipo

**Filtros**: Búsqueda global, departamento, puesto, tipo contrato

### Formulario de Creación

**Paso 1**: Nombre, apellidos, NIF, email, teléfono, fecha nacimiento, dirección, IBAN

**Paso 2**: Tipo contrato, fechas, salario, puesto, departamento, centro, manager

**Paso 3**: Plantilla de horario, fecha de validez

---

## Preguntas frecuentes

**P: ¿Qué es el número de empleado?**

R: Identificador único auto-generado (ej: TMNW00001). Se usa en nóminas y documentos oficiales.

**P: ¿Puedo importar sin horario?**

R: No. El campo schedule_template_id es obligatorio.

**P: ¿Desactivar elimina los datos?**

R: No. Los datos se conservan, solo cambia el estado a inactivo.

**P: ¿Cómo envío invitaciones después de importar?**

R: Edita el empleado → Pestaña Acceso → Marca "Crear usuario del sistema".

**P: ¿Puedo tener varios contratos por empleado?**

R: Sí. El contrato activo es el más reciente. Ver historial en perfil del empleado.

---

## Checklist de soporte

**Pre-importación:**

- [ ] Plantilla descargada desde la interfaz
- [ ] Archivo XLSX o CSV (máx 500 filas)
- [ ] Campos obligatorios completos
- [ ] IDs de horarios válidos
- [ ] Managers existen como empleados

**Validación:**

- [ ] Filas READY en verde
- [ ] Errores revisados o omitidos
- [ ] Conteos coinciden

**Troubleshooting:**

- Sin contrato → Verificar paso 2 del wizard
- No puede fichar → Verificar horario asignado
- No aparece en lista → Verificar filtros/pestañas

---

**Última revisión**: 2025-12-27
**Owner interno**: TimeNow Team

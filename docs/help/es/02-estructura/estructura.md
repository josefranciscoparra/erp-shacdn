# Estructura Organizacional

## Qué es y para qué sirve

La estructura organizacional es el esqueleto de tu empresa en TimeNow. Define cómo se organizan tus empleados mediante departamentos, puestos de trabajo, centros de coste y equipos. Una estructura bien configurada permite:

- **Asignar responsabilidades claras**: Cada empleado sabe a quién reporta y qué equipo integra
- **Gestionar costes**: Los centros de coste ayudan a distribuir gastos por ubicación o área
- **Establecer jerarquías**: Los niveles de puesto facilitan la gestión salarial y carreras
- **Organizar comunicación**: Los equipos transversales coordinan trabajos específicos
- **Automatizar permisos**: El sistema aplica políticas según departamento o centro

## Quién puede usarlo

- **Administradores**: Acceso completo para crear, editar y eliminar
- **Managers**: Pueden ver la estructura de sus áreas asignadas
- **Empleados**: Solo pueden ver su propia asignación

## Antes de empezar

Configura en este orden:

1. **Centros de coste**: Define dónde trabaja tu empresa
2. **Departamentos**: Agrupa funciones dentro de centros
3. **Niveles de puesto**: Define la jerarquía (Junior, Senior, Lead, etc.)
4. **Puestos de trabajo**: Asigna títulos a niveles
5. **Equipos**: Crea equipos transversales si los necesitas

---

## Flujos principales

### 1. Gestionar Centros de Coste

Los centros de coste representan ubicaciones físicas o áreas donde trabajan empleados. Pueden tener configuración GPS para validar fichajes.

#### Crear un centro de coste

1. Ve a **Organización** → **Estructura** → **Centros de coste**
2. Haz clic en **Nuevo centro de coste**
3. Rellena el formulario:
   - **Nombre** (obligatorio): Ej: "Oficina Central Madrid"
   - **Código** (opcional): Identificador único, Ej: "OFF-001"
   - **Dirección** (opcional): Ubicación física
   - **Zona horaria** (opcional): Por defecto Europe/Madrid
   - **Latitud y Longitud** (opcional): Para validar fichajes por GPS
   - **Radio permitido** (opcional): En metros, por defecto 100
4. Haz clic en **Guardar**

![IMG: centro-coste-nuevo | Pantalla: Formulario de centro de coste | Elementos clave: campos nombre, código, dirección, zona horaria | Acción destacada: Guardar centro]

#### Editar un centro de coste

1. Ve a **Centros de coste**
2. Haz clic en el menú **...** del centro
3. Selecciona **Editar**
4. Modifica los campos necesarios
5. Haz clic en **Guardar**

#### Eliminar un centro de coste

Solo puedes eliminar si no tiene departamentos ni empleados asignados.

1. Ve a **Centros de coste**
2. Haz clic en el menú **...** del centro
3. Selecciona **Eliminar**
4. Confirma la eliminación

---

### 2. Gestionar Departamentos

Los departamentos son divisiones dentro de centros de coste (Ventas, RRHH, TI, etc.).

#### Crear un departamento

1. Ve a **Organización** → **Estructura** → **Departamentos**
2. Haz clic en **Nuevo departamento**
3. Rellena el formulario:
   - **Nombre** (obligatorio): Ej: "Ventas", "Recursos Humanos"
   - **Descripción** (opcional): Función del departamento
   - **Centro de coste** (opcional): Centro donde opera
   - **Responsable** (opcional): Empleado que lo gestiona
4. Haz clic en **Guardar**

![IMG: departamento-nuevo | Pantalla: Formulario de departamento | Elementos clave: nombre, descripción, centro, responsable | Acción destacada: Crear departamento]

#### Editar un departamento

1. Ve a **Departamentos**
2. Haz clic en el menú **...** del departamento
3. Selecciona **Editar**
4. Modifica los campos
5. Haz clic en **Guardar**

---

### 3. Gestionar Niveles de Puesto

Los niveles crean jerarquía (Junior, Senior, Lead, etc.). Son opcionales pero útiles para gestionar carreras y salarios.

#### Crear un nivel de puesto

1. Ve a **Organización** → **Estructura** → **Puestos**
2. Haz clic en el botón **Niveles**
3. Haz clic en **Nuevo nivel**
4. Rellena el formulario:
   - **Nombre** (obligatorio): Ej: "Junior", "Senior", "Lead"
   - **Código** (opcional): Ej: "L1", "L2", "L3"
   - **Orden** (obligatorio): Número de jerarquía (0 = más bajo)
   - **Salario mínimo/máximo** (opcional): Rango salarial
5. Haz clic en **Guardar**

**Regla importante**: Dos niveles no pueden tener el mismo orden.

---

### 4. Gestionar Puestos de Trabajo

Los puestos son títulos laborales (Desarrollador, Contador, Vendedor, etc.).

#### Crear un puesto de trabajo

1. Ve a **Organización** → **Estructura** → **Puestos**
2. Haz clic en **Nuevo puesto**
3. Rellena el formulario:
   - **Título** (obligatorio): Ej: "Desarrollador Backend"
   - **Descripción** (opcional): Responsabilidades
   - **Nivel de puesto** (opcional): Vincula a un nivel
4. Haz clic en **Guardar**

![IMG: puesto-nuevo | Pantalla: Formulario de puesto | Elementos clave: título, descripción, nivel | Acción destacada: Crear puesto]

---

### 5. Gestionar Equipos

Los equipos son grupos transversales de empleados. Siempre pertenecen a un centro de coste.

#### Crear un equipo

1. Ve a **Organización** → **Estructura** → **Equipos**
2. Haz clic en **Nuevo equipo**
3. Rellena el formulario:
   - **Nombre** (obligatorio): Ej: "Equipo de Producto"
   - **Código** (opcional): Ej: "SQ-001"
   - **Descripción** (opcional): Función del equipo
   - **Centro de coste** (obligatorio): Centro al que pertenece
   - **Departamento** (opcional): Debe estar en el mismo centro
4. Haz clic en **Guardar**

**Regla importante**: Si asignas un departamento, debe pertenecer al mismo centro de coste.

#### Asignar empleados a un equipo

1. Ve a **Equipos**
2. Haz clic en **Ver Detalle** del equipo
3. Ve a la pestaña **Empleados**
4. Haz clic en **Agregar empleado**
5. Selecciona empleados de la lista
6. Haz clic en **Agregar**

---

## Pantallas y campos

### Centro de Coste

- **Nombre**: Identificador principal del centro
- **Código**: Código único para reportes
- **Dirección**: Ubicación física
- **Zona Horaria**: Para cálculos de fichajes
- **Latitud/Longitud**: Coordenadas GPS
- **Radio**: Metros permitidos para fichaje GPS

### Departamento

- **Nombre**: Nombre del departamento
- **Descripción**: Función o características
- **Centro de coste**: Centro asociado
- **Responsable**: Jefe del departamento

### Nivel de Puesto

- **Nombre**: Nombre del nivel
- **Código**: Identificador corto
- **Orden**: Número jerárquico (único)
- **Salario mín/máx**: Rango salarial

### Puesto de Trabajo

- **Título**: Nombre del puesto
- **Descripción**: Responsabilidades
- **Nivel**: Nivel jerárquico asociado

### Equipo

- **Nombre**: Nombre del equipo
- **Código**: Identificador
- **Centro de coste**: Centro obligatorio
- **Departamento**: Departamento opcional

---

## Políticas y reglas

**Orden de configuración**

- Centros → Departamentos → Niveles → Puestos → Equipos → Empleados

**Restricciones de eliminación**

- No puedes eliminar si hay dependencias (empleados asignados, departamentos en un centro, etc.)

**Validaciones de equipos**

- Siempre deben tener un centro de coste
- Si tienen departamento, debe estar en el mismo centro

**Niveles de puesto**

- El orden es único por organización
- 0 es el nivel más bajo

---

## Preguntas frecuentes

**P: ¿Puedo tener un centro sin departamentos?**

R: Sí. Los centros pueden existir sin departamentos si aún no has organizado divisiones.

**P: ¿Cuál es la diferencia entre departamento y equipo?**

R: El departamento es una división jerárquica permanente (Ventas, RRHH). El equipo es un grupo transversal más flexible que puede cruzar departamentos.

**P: ¿Los niveles de puesto son obligatorios?**

R: No. Los puestos pueden existir sin nivel. Los niveles son útiles para gestionar jerarquía salarial pero son opcionales.

**P: ¿Cómo asigno empleados a departamentos?**

R: Los empleados se asignan a departamentos mediante su contrato. Ve a Empleados → Contratos y asigna el departamento.

**P: ¿Qué pasa si cambio el centro de un departamento?**

R: Los equipos dentro deben estar en el mismo centro. Asegúrate de sincronizarlos.

---

## Checklist de soporte

- [ ] ¿Al menos un centro de coste creado?
- [ ] ¿Departamentos asignados a centros?
- [ ] ¿Niveles con orden jerárquico único?
- [ ] ¿Puestos creados para cada rol?
- [ ] ¿Equipos con centro de coste asignado?
- [ ] ¿Empleados asignados a puestos y departamentos?
- [ ] ¿Responsables con permisos correctos?
- [ ] ¿Zona horaria correcta en centros?

---

**Última revisión**: 2025-12-27
**Owner interno**: TimeNow Team

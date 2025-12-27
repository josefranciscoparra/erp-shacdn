# Usuarios y Roles

## Qué es y para qué sirve

**Usuarios y Roles** es la sección de administración donde los administradores de TimeNow gestionan las cuentas de acceso al sistema y asignan permisos mediante roles.

Cada usuario en el sistema tiene un **rol** que define qué puede hacer:
- **SUPER_ADMIN**: Administrador supremo con acceso total al sistema (multi-organización)
- **ORG_ADMIN**: Administrador de una organización específica
- **HR_ADMIN**: Responsable de RRHH con acceso a datos sensibles
- **HR_ASSISTANT**: Asistente de RRHH (operativo, sin datos sensibles)
- **MANAGER**: Manager o supervisor de equipos
- **EMPLOYEE**: Empleado básico con acceso limitado

Esta sección permite:
- Crear nuevos usuarios administrativos
- Asignar y cambiar roles
- Resetear contraseñas
- Activar/desactivar usuarios
- Gestionar acceso a múltiples organizaciones
- Ver detalles completos de cada usuario

## Quién puede usarlo

- **SUPER_ADMIN**: Acceso completo a toda la sección. Puede gestionar todos los usuarios y roles.
- **ORG_ADMIN**: Puede crear y gestionar usuarios dentro de su organización (roles: HR_ADMIN, HR_ASSISTANT, MANAGER, EMPLOYEE).
- **HR_ADMIN**: Puede crear usuarios HR y asistentes. Acceso limitado a ciertas operaciones.

**Nota**: Empleados regulares no pueden acceder a esta sección.

## Flujos principales

### 1) Crear usuario

**Paso a paso para crear un nuevo usuario administrativo:**

1. Ve a **Dashboard** → **Administración** → **Usuarios y Roles**
2. Haz clic en el botón **"Nuevo usuario"** (parte superior derecha)
3. Se abrirá un diálogo con el formulario de creación

**Formulario de creación:**

| Campo | Obligatorio | Descripción |
|-------|-----------|-------------|
| **Rol administrativo** | Sí | Selecciona entre ORG_ADMIN, HR_ADMIN o HR_ASSISTANT |
| **Email** | Sí | Email único para iniciar sesión |
| **¿Es empleado?** | No | Si marcas esta opción, se crea además un perfil de RRHH |
| **Nombre completo** | Sí (si no es empleado) | Nombre simple para usuarios administrativos |
| **Nombre** | Sí (si es empleado) | Primer nombre del empleado |
| **Primer apellido** | Sí (si es empleado) | Primer apellido del empleado |
| **Segundo apellido** | No | Segundo apellido (opcional) |
| **NIF/NIE** | Sí (si es empleado) | Identificación fiscal o residencia |
| **Teléfono** | No | Teléfono de contacto |
| **Móvil** | No | Teléfono móvil |

**Al crear:**
- El sistema genera automáticamente una **contraseña temporal** aleatoria
- La contraseña expira en **7 días**
- Se muestra en un panel seguro para que la compartas con el usuario
- El usuario **debe cambiarla** en su primer acceso

### 2) Asignar roles

Los roles pueden asignarse de dos formas:

#### A) Al crear el usuario
- En el formulario de creación, selecciona el rol en el dropdown "Rol administrativo"
- Solo podrás crear ciertos roles según tu propio rol

#### B) Cambiar rol de un usuario existente
1. En la tabla, abre el menú de acciones (⋯) del usuario
2. Selecciona **"Cambiar rol"**
3. Se abrirá un diálogo mostrando el rol actual y el nuevo rol
4. Haz clic en **"Cambiar Rol"**

**Permisos para cambiar roles:**
- **SUPER_ADMIN**: Puede asignar cualquier rol
- **ORG_ADMIN**: Puede asignar ORG_ADMIN, HR_ADMIN, HR_ASSISTANT, MANAGER, EMPLOYEE
- **HR_ADMIN**: Puede asignar HR_ADMIN, HR_ASSISTANT, MANAGER, EMPLOYEE

### 3) Desactivar usuario

**Para desactivar un usuario:**

1. Abre la tabla de usuarios
2. Haz clic en el menú de acciones (⋯) del usuario a desactivar
3. Selecciona **"Desactivar usuario"**
4. Confirma la acción

**Qué sucede al desactivar:**
- Se cierran todas las sesiones activas del usuario
- El usuario NO puede iniciar sesión en el sistema
- Sus datos se conservan (no se elimina)
- Puede reactivarse en cualquier momento

**Para reactivar:**
1. Ve a la pestaña **"Inactivos"** en la tabla
2. Abre el menú de acciones del usuario
3. Selecciona **"Activar usuario"**

## Pantallas y campos

### Pantalla principal: Tabla de usuarios

La tabla de usuarios muestra:

| Columna | Descripción |
|---------|-------------|
| **Nombre** | Nombre del usuario. Muestra un icono de llave si debe cambiar contraseña |
| **Email** | Email del usuario (usado para iniciar sesión) |
| **Rol** | Rol asignado con color distintivo |
| **Estado** | Activo (verde) o Inactivo (rojo) |
| **Orgs** | Número de organizaciones a las que tiene acceso |
| **Acciones** | Menú con opciones para editar, cambiar rol, resetear contraseña |

**Pestañas disponibles:**
- **Activos**: Usuarios con acceso activo
- **Inactivos**: Usuarios desactivados
- **Con contraseña temporal**: Usuarios que deben cambiar su contraseña
- **Todos**: Lista completa de usuarios

### Diálogo: Detalles del usuario

Al seleccionar **"Ver detalles"** se abre un panel con:

**Información Básica:**
- Nombre completo
- Email
- Rol asignado

**Estado de la Cuenta:**
- Estado (Activo/Inactivo)
- Si debe cambiar contraseña
- Número de contraseñas temporales activas

**Contraseña Temporal Activa (si existe):**
- La contraseña en formato seguro (oculta por defecto)
- Fecha de expiración
- Razón del reseteo
- Quién la creó y cuándo

### Diálogo: Cambiar rol

Muestra:
- **Rol actual**: Con badge distintivo y icono
- **Nuevo rol**: Dropdown para seleccionar nuevo rol
- **Advertencia**: "El cambio de rol afectará inmediatamente los permisos y accesos"

### Diálogo: Resetear contraseña

**Campos:**
- **Usuario**: Muestra nombre y email (solo lectura)
- **Razón (opcional)**: Campo de texto explicando por qué se resetea

**Resultado:**
- Muestra la contraseña temporal generada
- Botón para copiar al portapapeles
- Fecha de expiración (7 días)

---

## Preguntas frecuentes

**P: ¿Cuál es la diferencia entre desactivar y eliminar un usuario?**
R: Desactivar impide el acceso pero conserva todos los datos. Eliminar es permanente e irreversible y solo es posible para usuarios ya desactivados.

**P: ¿Qué duración tiene la contraseña temporal?**
R: La contraseña temporal es válida por 7 días. El usuario debe cambiarla en su primer acceso.

**P: ¿Puedo cambiar mi propio rol?**
R: No, los cambios de rol deben hacerse por otro administrador con permisos suficientes.

**P: ¿Un usuario puede tener roles diferentes en distintas organizaciones?**
R: Sí, puedes asignarle roles diferentes para cada organización en la que trabaje.

**P: ¿Puedo crear un usuario sin que sea empleado?**
R: Sí, al crear un usuario, desactiva la opción "¿Es empleado?" para crear un perfil administrativo simple sin datos de RRHH.

**P: ¿Se notifica al usuario cuando se resetea su contraseña?**
R: No automáticamente. El administrador debe contactar al usuario y compartir la contraseña temporal de forma segura.

**P: ¿Qué roles puedo crear según mi rol actual?**
R:
- SUPER_ADMIN → ORG_ADMIN, HR_ADMIN, HR_ASSISTANT
- ORG_ADMIN → HR_ADMIN, HR_ASSISTANT
- HR_ADMIN → HR_ADMIN, HR_ASSISTANT

---

## Checklist de soporte

### Creación de usuarios
- [ ] Se puede crear un usuario con rol administrativo
- [ ] Se genera una contraseña temporal automáticamente
- [ ] El diálogo muestra la contraseña generada
- [ ] Se puede crear un usuario que también sea empleado
- [ ] El usuario no puede crear roles superiores a su nivel

### Gestión de roles
- [ ] Se puede cambiar el rol de un usuario existente
- [ ] El cambio es inmediato
- [ ] Solo se muestran roles permitidos según el administrador

### Activación/Desactivación
- [ ] Se puede desactivar un usuario activo
- [ ] Se pueden reactivar usuarios inactivos
- [ ] Los usuarios desactivados aparecen en la pestaña "Inactivos"

### Reseteo de contraseña
- [ ] Se genera una nueva contraseña temporal
- [ ] Se puede copiar al portapapeles
- [ ] Muestra la fecha de expiración

---

**Última revisión**: 2025-12-27
**Owner interno**: TimeNow Team

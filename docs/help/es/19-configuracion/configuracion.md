# Configuración General

## Qué es y para qué sirve

La sección de **Configuración General** es el panel central de administración de TimeNow donde los responsables de RRHH y administradores pueden gestionar todos los aspectos de la organización y los módulos disponibles. Desde aquí puedes:

- Visualizar información básica de la organización
- Activar o desactivar módulos funcionales (Chat, Geolocalización, Turnos, Canal Ético)
- Configurar parámetros de geolocalización para fichajes
- Establecer reglas de aprobación de ausencias, fichajes manuales, bolsa de horas y gastos
- Gestionar tipos de ausencia, vacaciones, turnos y bolsa de horas
- Configurar validaciones de fichaje
- Definir permisos por rol
- Acceso a administración del sistema (solo Super Admin)

## Quién puede usarlo

- **Admin RRHH (HR_ADMIN)**: Acceso a la mayoría de funcionalidades operativas
- **Admin Organización (ORG_ADMIN)**: Acceso ampliado a configuraciones sensibles
- **Super Admin (SUPER_ADMIN)**: Acceso completo incluyendo administración del sistema
- **Otros roles**: No tienen acceso (recibirán error de permisos)

## Cómo acceder

1. Desde el dashboard, selecciona **Configuración** en la navegación
2. O accede directamente a `/dashboard/settings`

## Estructura del panel

La configuración está organizada en **4 bloques principales**:

### Bloque 1: Gestión (Configuración operativa)
- **Organización**: Información básica (nombre, NIF/CIF, estado)
- **Tipos de Ausencia**: Crear y gestionar tipos de permiso/ausencia
- **Vacaciones**: Configurar reglas de vacaciones
- **Turnos** (módulo toggleable): Gestión de cuadrantes
- **Bolsa de Horas**: Configurar compensación y recuperación
- **Geolocalización** (módulo toggleable): Control de captura GPS
- **Fichajes**: Validaciones y reglas de captura de tiempo

### Bloque 2: Flujos & Módulos (Procesos de aprobación)
- **Aprobaciones**: Definir flujos de autorización
- **Gastos**: Configurar modo de aprobación
- **Canal Ético** (módulo toggleable): Sistema de denuncias
- **Chat** (módulo toggleable): Mensajería interna

### Bloque 3: Administración (Acceso restringido)
- **Permisos por Rol**: Override de permisos específicos
- **Storage** (Solo Super Admin): Gestión de almacenamiento
- **Sistema** (Solo Super Admin): Información del sistema
- **Admin Zone** (Solo Super Admin): Gestión de empleados y auditoría

---

## Flujos principales

### 1) Ajustes de organización

**Ubicación**: Configuración → Organización

**Campos disponibles (solo lectura):**
- Nombre de la organización
- NIF/CIF
- Estado de la organización (activa/inactiva)

**Nota**: Estos campos se establecen durante la creación de la organización y no son editables desde esta pantalla. Para cambiarlos, contacta con Super Admin.

### 2) Activar/desactivar módulos

**Ubicación**: Configuración → Módulos (Solo disponible en vista Super Admin)

**Módulos disponibles:**

| Módulo | Descripción | Estado |
| --- | --- | --- |
| **Chat interno** | Mensajería 1:1 entre empleados y managers | Disponible/Oculto |
| **Turnos** | Planificación de cuadrantes, zonas y asignaciones | Disponible/Oculto |
| **Geolocalización** | Captura GPS en fichajes y validaciones por ubicación | Disponible/Oculto |
| **Canal Ético** | Canal de denuncias con gestores y portal público | Disponible/Oculto |

**Flujo de activación:**

1. Selecciona **Módulos** en la vista Super Admin
2. Para cada módulo, verás:
   - Ícono y descripción
   - Badge de estado (Disponible/Oculto)
   - Switch de activación
3. Al cambiar el estado:
   - Si lo activas (disponible): Aparecerá en los ajustes de RRHH
   - Si lo ocultas: Se esconderá de RRHH y se desactivará automáticamente

### 3) Configurar geolocalización

**Ubicación**: Configuración → Geolocalización

**Control de Geolocalización:**

**Switch principal:**
- **Activado**: El sistema capturará coordenadas GPS en cada fichaje
- **Desactivado**: Los empleados pueden fichar sin capturar ubicación

**Protección de privacidad** (cuando está activo):
- Los empleados deben dar consentimiento RGPD/LOPDGDD antes del primer fichaje con GPS
- Los datos se almacenan de forma segura

**Estadísticas de Geolocalización:**

| Métrica | Descripción |
| --- | --- |
| **Total de fichajes** | Cantidad total de registros de entrada/salida |
| **Fichajes con GPS** | Cuántos fichajes incluyen coordenadas GPS |
| **Requieren revisión** | Fichajes fuera del área permitida |
| **Consentimientos** | Número de empleados con consentimiento RGPD |

**Configuración adicional por centro de trabajo:**

1. Ve a **Centros de Coste** en el dashboard
2. Edita cada centro de trabajo
3. Configura:
   - Latitud y Longitud
   - Radio permitido (metros)
4. Guarda los cambios

---

## Pantallas y campos

### Pantalla: Organización

**Campos (solo lectura):**
- Nombre de la organización
- NIF/CIF
- Estado de la organización

### Pantalla: Módulos

Para cada módulo muestra:
- Ícono y descripción
- Badge de estado
- Switch de activación
- Estado operativo (Activo/Inactivo)

### Pantalla: Geolocalización

**Control principal:**
- Switch ON/OFF
- Indicador de protección de privacidad

**Estadísticas:**
- Total de fichajes
- Fichajes con GPS (con porcentaje)
- Requieren revisión
- Consentimientos

---

## Preguntas frecuentes

**P: ¿Puedo cambiar el nombre y NIF de la organización?**
R: No, estos campos son solo lectura. Fueron establecidos durante la creación. Contacta con Super Admin para cambiarlos.

**P: ¿Qué pasa si desactivo un módulo?**
R: El módulo se oculta para RRHH, se desactiva automáticamente, y los usuarios no verán esa sección. Los datos existentes se mantienen.

**P: ¿Puedo reactivar geolocalización después de desactivarla?**
R: Sí. Simplemente vuelve a encender el switch. Los datos GPS capturados anteriormente se mantienen.

**P: ¿Qué empleados ven la solicitud de consentimiento RGPD?**
R: Solo los que tienen geolocalización activada y realizan su primer fichaje con GPS.

**P: ¿Dónde veo los fichajes con GPS?**
R: En **Mi Reloj** (`/dashboard/me/clock`). Si hay fichajes con GPS, verás badges GPS y opción de vista de mapa.

**P: ¿Qué significa "Requieren revisión" en geolocalización?**
R: Son fichajes donde el GPS muestra que el empleado estaba fuera del radio permitido del centro de trabajo.

**P: ¿Quién puede acceder a Configuración?**
R: Solo usuarios con permisos `manage_organization`: HR_ADMIN, ORG_ADMIN, SUPER_ADMIN.

**P: ¿Dónde configuro aprobaciones?**
R: En **Configuración → Aprobaciones**. Allí defines quién aprueba ausencias, fichajes manuales, bolsa de horas y gastos.

**P: ¿Qué es el "Radio permitido" en geolocalización?**
R: Es la distancia máxima (en metros) a la que un empleado puede estar del centro de trabajo y que el sistema considere que está "dentro de área".

**P: ¿Cómo afecta la geolocalización a los fichajes?**
R:
- Si está desactivada: Fichajes normales sin GPS
- Si está activada: Se captura GPS automáticamente
- Si falla el GPS: El fichaje se registra igual (graceful degradation)

---

## Checklist de soporte

### Verificación inicial
- [ ] Usuario tiene rol HR_ADMIN, ORG_ADMIN o SUPER_ADMIN
- [ ] Usuario está autenticado correctamente
- [ ] La organización existe en el sistema

### Problema: No puedo acceder a Configuración
- [ ] Verificar que el usuario tiene permiso `manage_organization`
- [ ] Revisar que el usuario está asignado a la organización correcta
- [ ] Limpiar cookies/sesión y reintentar

### Problema: Los módulos no se guardan
- [ ] Verificar conexión a internet
- [ ] Esperar a que el switch termine de actualizar
- [ ] Recargar la página y verificar que se guardó

### Problema: Geolocalización muestra 0 fichajes
- [ ] Verificar que al menos un empleado ha realizado un fichaje
- [ ] Verificar que el módulo está activo
- [ ] Revisar que los empleados han dado consentimiento RGPD

### Problema: El mapa de geolocalización no carga
- [ ] Verificar que hay fichajes con GPS capturados
- [ ] Limpiar cache y recargar
- [ ] Verificar que los centros tienen coordenadas configuradas

### Problema: Las estadísticas están desactualizadas
- [ ] Hacer click en botón "Actualizar"
- [ ] Recargar la página
- [ ] Esperar unos minutos a que se actualicen los datos

---

**Última revisión**: 2025-12-27
**Owner interno**: TimeNow Team

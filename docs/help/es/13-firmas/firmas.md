# Firmas Electrónicas

## Qué es y para qué sirve

El módulo de **Firmas Electrónicas** en TimeNow permite a tu organización solicitar, gestionar y recopilar firmas digitales en documentos de forma rápida y segura, con validez legal equivalente a la de una firma manuscrita.

### Beneficios principales

- **Digitales y legales**: Las firmas tienen valor legal según el estándar SES (Servicios de Envío Seguro)
- **Flujos secuenciales**: Soporta múltiples firmantes con orden específico (ej: empleado → supervisor → RRHH)
- **Trazabilidad completa**: Registro de quién, cuándo y desde dónde firmó cada documento
- **Gestión de lotes**: Envía un documento a múltiples empleados de forma centralizada
- **Recordatorios automáticos**: Notificaciones a firmantes pendientes
- **Validadores externos**: Agrega supervisores que revisen DESPUÉS de que cada empleado firme

### Casos de uso comunes

- Contratos de trabajo y anexos
- Políticas y normas de cumplimiento obligatorio
- Documentos de consentimiento (RGPD, protección de datos)
- Formularios de solicitud (vacaciones, cambios, etc.)
- Confirmación de recepción de documentos

---

## Quién puede usarlo

### Empleados
- **Ver sus documentos pendientes**: Cualquier empleado puede acceder a `/dashboard/me/signatures` para ver qué documentos necesita firmar
- **Firmar documentos**: Pueden revisar el PDF y firmar electrónicamente con su consentimiento explícito
- **Descargar confirmación**: Una vez firmado, pueden descargar el PDF firmado

### Administradores (HR_ADMIN, ORG_ADMIN, SUPER_ADMIN)
- **Crear solicitudes**: Pueden crear nuevas solicitudes de firma desde `/dashboard/signatures`
- **Gestionar lotes**: Controlar múltiples solicitudes en `/dashboard/signatures/batches`
- **Asignar firmantes**: Especificar quién debe firmar, el orden y plazos
- **Enviar recordatorios**: Notificar a firmantes pendientes
- **Auditar**: Ver historial completo de firmas y rechazos

---

## Flujos principales

### 1) Ver documentos pendientes

**Ubicación**: `/dashboard/me/signatures`

#### Lo que ves

Un panel con 4 pestañas principales:

| Pestaña | Descripción |
|---------|------------|
| **Pendientes** | Documentos que necesitas firmar. Prioridad: primero aparecen los que "Te toca firmar ahora" |
| **Firmadas** | Documentos que ya has firmado (histórico) |
| **Rechazadas** | Documentos que rechazaste (con motivo) |
| **Expiradas** | Documentos cuyo plazo venció sin firmarse |

#### Tarjetas de resumen (parte superior)

- **Estado de firmas**: Te dice cuántos documentos pendientes tienes (con alerta si hay urgentes)
- **Próximo documento**: El que vence primero, con días restantes
- **Total firmados**: Cantidad acumulada de documentos completados

#### Tabla de documentos

Para cada documento ves:

| Campo | Explicación |
|-------|-------------|
| **Documento** | Título + descripción. Badge indica si "Te toca firmar" o "Esperando a [nombre]" |
| **Categoría** | Tipo de documento (Contrato, Política, Consentimiento, etc.) |
| **Fecha** | Cuándo se solicitó (Pendientes) o cuándo se firmó/rechazó |
| **Firmante actual** | Quién debe firmar ahora según el orden |
| **Vencimiento** | Badge rojo (urgente <3 días), amarillo (próximo) o normal |
| **Firmantes** | Avatares de quiénes participan + contador (ej: 2/5 completados) |
| **Estado** | Pendiente, Firmado, Rechazado, Expirado |
| **Acciones** | Botón "Firmar" (si es tu turno) o "Ver" (si esperas a otros) |

#### Filtro "Solo firmables"

En la pestaña **Pendientes**, hay un botón que te muestra solo documentos que puedes firmar YA (sin esperar a otros). Ideal si tienes muchos pendientes.

---

### 2) Firmar un documento

**Ubicación**: `/dashboard/me/signatures/[token]` (acceso via el botón "Firmar" en la tabla)

#### Paso a paso

1. **Lees el PDF**
   - Vista completa del documento a firmar en el lado izquierdo
   - Puedes hacer scroll para revisar todo el contenido

2. **Ves información legal (panel derecho)**
   - **Firmantes**: Quiénes deben firmar y en qué orden
   - **Política**: El estándar legal (SES)
   - **Vencimiento**: Fecha límite para completar la firma
   - **Categoría**: Tipo de documento

3. **Das tu consentimiento**
   - Checkbox obligatorio: "Declaro que he leído y comprendo..."
   - Se abre un modal explicando qué significa firmar electrónicamente
   - Debes aceptar explícitamente antes de poder firmar

4. **Firmas o rechazas**

   **Opción A: Firmar**
   - Click en "Firmar Documento"
   - Se abre modal de confirmación final
   - Confirmas y se registra tu firma
   - Ves pantalla de éxito y se redirige automáticamente a "Mis Firmas"

   **Opción B: Rechazar**
   - Click en "Rechazar"
   - Debes escribir el motivo (mínimo 10 caracteres)
   - Se registra tu rechazo con el motivo
   - Los administradores ven por qué rechazaste

5. **Descarga el confirmación**
   - Si ya está completado (todos firmaron), puedes descargar el PDF con sello de firma
   - Botón "Descargar PDF firmado"

#### Estados durante el flujo

| Estado | Significa | Acciones disponibles |
|--------|-----------|-------------------|
| **Pendiente - Tu turno** | Debes firmar ahora | Leer → Consentimiento → Firmar/Rechazar |
| **Pendiente - Esperando a [nombre]** | Otro debe firmar primero | Ver documento + Actualizar estado |
| **Firmado** | Ya completaste tu parte | Descargar PDF + Volver |
| **Rechazado** | Ya rechazaste | Ver motivo + Volver |

#### Nota importante: Orden secuencial

Si un documento tiene múltiples firmantes (ej: empleado → supervisor → RRHH):
- El empleado firma primero
- Solo DESPUÉS, el supervisor recibe notificación para firmar
- Y así sucesivamente

Si ves "Esperando a Juan" significa que Juan debe firmar ANTES que tú.

---

### 3) Solicitar firmas (admin)

**Ubicación**: `/dashboard/signatures` (solo para HR_ADMIN, ORG_ADMIN, SUPER_ADMIN)

#### Visión general

Página principal que muestra:
- **Resumen**: Total de solicitudes activas, completadas, rechazadas
- **Filtros**: Buscar por documento, estado, categoría, empleado
- **Tabla**: Lista de solicitudes con estado actual
- **Acciones**: Botones para crear nueva solicitud o ver lotes

#### Crear nueva solicitud

Click en botón **"Nueva Solicitud"** → Abre diálogo de 4 pasos:

**Paso 1: Documento**
- Título (requerido): "Contrato 2025", "Política de vacaciones", etc.
- Descripción (opcional): Detalles adicionales
- Categoría (requerido): Contrato, Política, Consentimiento, Formulario, Otro
- PDF (requerido): Subir archivo (máx 20MB)

**Paso 2: Destinatarios**

Elige uno de 3 modos:

| Modo | Para | Ejemplo |
|------|------|---------|
| **Empleados específicos** | Enviar a personas concretas | Contratos nuevos → solo 3 empleados |
| **Departamentos completos** | Todos en esos departamentos | Política de RRHH → todos RRHH + Finanzas |
| **Toda la organización** | Absolutamente todos | Actualización de normativa general |

Después puedes agregar **"Validadores"** (opcional):
- Persona que revisa DESPUÉS de que cada empleado firme
- Ejemplo: Supervisor que aprueba la firma del empleado
- Pueden ser múltiples (en orden)

**Paso 3: Configuración**
- Fecha límite: Hasta cuándo pueden firmar (requerido, mínimo hoy)
- Días para recordatorio: Cuándo enviar notificaciones automáticas

**Paso 4: Resumen y confirmación**
- Tabla con todos los datos
- Indicador: "Se crearán X solicitudes" (si es lote) o "Se generará 1 solicitud" (individual)
- Click en "Crear Solicitud" → Se sube PDF y notificaciones se envían

---

## Pantallas y campos

### Mis Firmas (Usuario - `/dashboard/me/signatures`)

#### Cards de resumen

- Estado de firmas: Documentos pendientes (con alertas urgentes)
- Próximo documento: El que vence primero, con días restantes
- Documentos firmados: Total de documentos completados

#### Tabs
- Pendientes (con alerta roja si hay urgentes)
- Firmadas
- Rechazadas
- Expiradas

#### Tabla (contenido dentro de cada tab)

| Documento | Categoría | Fecha | Firmante actual | Vencimiento | Firmantes | Estado | Acción |
|-----------|-----------|-------|-----------------|-------------|-----------|--------|--------|

### Gestión de Firmas (Admin - `/dashboard/signatures`)

#### Tarjetas de resumen
- Solicitudes activas en progreso
- Completadas
- Rechazadas

#### Filtros compactos
- Buscar documento
- Estado
- Categoría
- Empleado
- Limpiar filtros

#### Tabla

| Documento | Categoría | Creado por | Destinatarios | Progreso | Vencimiento | Acciones |
|-----------|-----------|------------|---------------|----------|-------------|----------|

---

## Preguntas frecuentes

### General

**P: ¿Tienen validez legal las firmas electrónicas?**
R: Sí. El sistema usa el estándar SES (Servicios de Envío Seguro) con trazabilidad completa (quién, cuándo, IP). TimeNow registra identidad del firmante, fecha y hora exacta, dirección IP, consentimiento explícito y motivo si rechaza.

**P: ¿Puedo firmar desde el móvil?**
R: Sí. El sistema es completamente responsive. Accede desde cualquier navegador y podrás leer el PDF, dar consentimiento, firmar electrónicamente y descargar confirmación.

**P: ¿Qué pasa si no firmo a tiempo?**
R: El documento pasa a estado EXPIRADO. Los administradores pueden crear una nueva solicitud o enviar recordatorios. Tú ves el documento en pestaña "Expiradas" pero ya no puedes firmarlo.

**P: ¿Por qué algunos documentos dicen "Esperando a [nombre]"?**
R: Porque ese documento usa firma secuencial. Significa que esa persona debe firmar ANTES que tú. Una vez que firme, recibirás notificación.

**P: ¿Puedo cambiar mi firma después de firmar?**
R: No. La firma electrónica es final. Si la diste por error, debes contactar a RRHH para cancelar la solicitud y pedir una nueva.

**P: ¿Cuál es la diferencia entre Solicitud y Lote?**
R: Solicitud es un documento + un empleado. Lote es el mismo documento enviado a múltiples empleados (ej: "Contratos 2025" a 50 empleados = 1 Lote con 50 Solicitudes).

**P: ¿Qué es un "Validador"?**
R: Un validador es alguien que firma DESPUÉS de cada destinatario para revisar/aprobar. Por ejemplo: Empleado firma → Supervisor valida.

---

## Checklist de soporte

### Para usuarios que no ven documentos pendientes

- [ ] ¿El usuario está autenticado?
- [ ] ¿Tiene notificación en el dashboard?
- [ ] ¿Es el plazo de expiración?
- [ ] ¿El admin creó la solicitud correctamente?
- [ ] ¿El navegador bloquea notificaciones?

### Para admins que ven errores al crear solicitud

- [ ] PDF cargado correctamente (< 20MB, formato PDF válido)
- [ ] Empleados seleccionados tienen usuario activo
- [ ] Fecha de vencimiento es futura
- [ ] Categoría seleccionada
- [ ] Título no vacío

### Permisos requeridos

| Acción | Permiso requerido |
|--------|------------------|
| Ver mis documentos | Usuario autenticado |
| Firmar documento | Tener sesión activa + Token válido |
| Ver gestión de firmas | `manage_documents` |
| Crear solicitud | `manage_documents` + Role HR/Admin |

---

**Última revisión**: 2025-12-27
**Owner interno**: TimeNow Team

# Canal de Denuncias

## Qué es y para qué sirve

El **Canal de Denuncias** de TimeNow es un sistema confidencial para que empleados, proveedores y clientes reporten irregularidades, acoso, corrupción, fraude y otros hechos contrarios a la ética empresarial.

**Cumplimiento normativo:**

- Ley 2/2023, de 20 de febrero, reguladora de la protección de las personas que informen sobre infracciones normativas
- Reglamento (UE) 2019/1937
- RGPD y LOPDGDD en el tratamiento de datos personales
- Garantiza protección contra represalias

**Características principales:**

- Recepción de denuncias anónimas y no anónimas
- Seguimiento confidencial del estado de investigación
- Gestión integral por personal autorizado
- Almacenamiento seguro de documentos probatorios
- Historial de actividades auditables

---

## Quién puede usarlo

### Empleados internos

- Acceso autenticado desde `/dashboard/me/whistleblowing`
- Pueden enviar denuncias identificadas o anónimas
- Visualizar todas sus denuncias y estados
- Seguimiento mediante código de expediente

### Personas externas (portal público)

- Proveedores, clientes, consultores y cualquier tercero
- Acceso mediante URL pública generada automáticamente
- No requieren autenticación
- Opción de envío anónimo
- Seguimiento mediante código de seguimiento + código de acceso

### Gestores y administradores

- Personal autorizado de Recursos Humanos o Cumplimiento
- Acceso a `/dashboard/whistleblowing`
- Permiso `manage_organization` requerido

---

## Flujos principales

### 1) Enviar denuncia

#### A) Empleado interno → `/dashboard/me/whistleblowing/new`

**Pasos:**

1. Click en botón "Nueva denuncia"
2. Seleccionar categoría de denuncia
3. Rellenar formulario:
   - **Título**: Resumen breve
   - **Descripción**: Detalles completos de los hechos
   - **Fecha del incidente**: Cuándo ocurrió (opcional)
   - **Ubicación**: Dónde ocurrió (opcional)
4. Adjuntar documentos probatorios (PDF, JPG, PNG, WEBP, máx. 20MB)
5. Click en "Enviar denuncia"
6. **Resultado**: Recibe código de seguimiento (ej: `WB-20251227-A7K2N`)

#### B) Portal público anónimo → `/whistleblowing/{orgSlug}/new`

**Pasos:**

1. Acceder a URL pública
2. Seleccionar tipo de reportero:
   - **Anónimo**: Sin identificación
   - **Externo**: Proveedor/cliente (datos opcionales)
3. Seleccionar categoría
4. Completar formulario
5. Adjuntar documentos
6. Click en "Enviar denuncia"
7. **Resultado**:
   - Código de seguimiento (ej: `WB-20251227-K4L9M`)
   - Código de acceso (8 caracteres, ej: `A3K7N2LX`)
   - **Guardar ambos para seguimiento posterior**

#### Categorías disponibles

1. Acoso y Discriminación
2. Corrupción, Fraude y Uso Indebido de Recursos
3. Prácticas Laborales Irregulares
4. Protección de Datos y Seguridad de la Información
5. Salud y Seguridad en el Trabajo
6. Incumplimiento de Normativa o Políticas Internas
7. Otras Irregularidades

---

### 2) Ver mis denuncias

#### Para empleados → `/dashboard/me/whistleblowing`

**Visualización:**

- Listado de denuncias personales (ordenadas por fecha)
  - Título de la denuncia
  - Código de seguimiento
  - Estado actual (Pendiente, En investigación, Resuelta, Cerrada)
  - Prioridad (Baja, Media, Alta, Crítica)
  - Categoría
  - Fecha de envío

**Detalles al hacer click:**

- Descripción completa
- Fecha e ubicación del incidente
- Documentos adjuntos
- Resolución (si está resuelta)

#### Consultar por código (anónimas o terceros)

**Pasos:**

1. Expandir sección "Seguimiento con código"
2. Ingresar código de seguimiento y código de acceso
3. Click en "Consultar estado"
4. **Resultado**: Estado actual con mensaje descriptivo

---

### 3) Gestionar denuncias (admin)

#### Acceso → `/dashboard/whistleblowing`

**Panel de estadísticas:**

- Total de denuncias
- Pendientes (no asignadas)
- En investigación
- Resueltas
- Cerradas

**Tabla de denuncias:**

| Columna         | Descripción                                       |
| --------------- | ------------------------------------------------- |
| Código          | ID único de seguimiento                           |
| Título          | Asunto de la denuncia                             |
| Origen          | Empleado, Externo, Anónimo                        |
| Estado          | Pendiente / En investigación / Resuelta / Cerrada |
| Prioridad       | Baja / Media / Alta / Crítica                     |
| Gestor asignado | Nombre del responsable                            |
| Registrada      | Fecha y hora de recepción                         |

#### Detalle de denuncia → `/dashboard/whistleblowing/{id}`

**Gestión disponible:**

1. **Asignar gestor**: Seleccionar de lista de gestores autorizados
2. **Cambiar estado**: Pendiente → En investigación → Resuelta/Cerrada
3. **Cambiar prioridad**: Baja / Media / Alta / Crítica
4. **Resolver denuncia**: Seleccionar tipo de resolución y comentarios
5. **Cerrar expediente**: Solo después de resolver

**Tipos de resolución:**

- **Fundada**: Hechos confirmados, acciones tomadas
- **No fundada**: Hechos no confirmados
- **Parcialmente fundada**: Algunos hechos confirmados
- **Sin acción**: No procede investigación

---

## Pantallas y campos

### Portal público - Pantalla inicial

Muestra:

- Icono y nombre de la organización
- Canal Interno de Información (Cumplimiento Ley 2/2023)
- Garantías: Confidencialidad, Anonimato opcional, Protección legal, Seguimiento
- Botones: Presentar denuncia / Consultar estado
- Aviso legal RGPD/LOPDGDD

### Formulario de denuncia

**Campos obligatorios:**

- Categoría de denuncia
- Título (máx. 200 caracteres)
- Descripción detallada

**Campos opcionales:**

- Fecha del incidente
- Ubicación
- Partes involucradas (encriptado)
- Documentos (máx. 20MB, PDF/JPG/PNG/WebP)

### Configuración de gestor

**Ubicación:** `/dashboard/settings` → Pestaña "Canal de Denuncias"

- **Control principal**: Toggle ON/OFF para habilitar/deshabilitar
- **Responsables del canal**: Lista de gestores autorizados
- **Portal público**: URL generada automáticamente, slug editable
- **Estadísticas**: Métricas resumidas con botón "Ver todas"

---

## Preguntas frecuentes

### Denuncia y confidencialidad

**P: ¿Cómo se garantiza mi anonimato?**
R: Las denuncias anónimas se desvinculan completamente de datos de identidad. Los datos sensibles se almacenan encriptados.

**P: ¿Puedo cambiar mi denuncia después de enviarla?**
R: No. Si necesita aclaraciones, póngase en contacto con el gestor a través del código de seguimiento.

**P: ¿Cuánto tiempo tarda en investigarse una denuncia?**
R: Depende de la complejidad. Puede consultar en cualquier momento usando su código de seguimiento.

### Acceso y autenticación

**P: ¿Necesito login para usar el portal público?**
R: No. El portal es completamente público. Solo necesita códigos para consultar el estado.

**P: ¿Qué pasa si pierdo mi código de acceso?**
R: Desafortunadamente no hay forma de recuperarlo. Guárdelo en un lugar seguro.

### Protección legal

**P: ¿Estoy protegido contra represalias?**
R: Sí. La Ley 2/2023 garantiza protección contra despido, acoso, democión o cualquier otra represalia.

**P: ¿Quién puede ver mi denuncia?**
R: Solo los gestores autorizados y el personal necesario para investigar.

**P: ¿Cuánto tiempo se conservan mis datos?**
R: Mínimo 3 años para auditoría legal. Los datos se procesan conforme LOPDGDD.

---

## Checklist de soporte

### Configuración inicial (admin)

- [ ] Habilitar Canal de Denuncias en Settings
- [ ] Slug público generado automáticamente
- [ ] Agregar al menos un gestor responsable
- [ ] Verificar que gestores ven el dashboard
- [ ] Probar URL pública de denuncias
- [ ] Comunicar URL a empleados y externos

### Uso por parte de empleados

- [ ] Empleado puede acceder a `/dashboard/me/whistleblowing`
- [ ] Botón "Nueva denuncia" funciona
- [ ] Formulario valida campos obligatorios
- [ ] Carga de documentos permite tipos aceptados
- [ ] Código de seguimiento se genera y muestra
- [ ] Puede ver lista de sus denuncias

### Uso por gestores

- [ ] Gestor ve dashboard en `/dashboard/whistleblowing`
- [ ] Estadísticas se actualizan
- [ ] Tabla de denuncias carga correctamente
- [ ] Puede asignar, cambiar estado, resolver y cerrar
- [ ] Puede ver documentos adjuntos y añadir notas internas
- [ ] Historial de actividades completo

### Portal público (anónimo)

- [ ] URL pública accesible sin login
- [ ] Formulario carga categorías
- [ ] Envío genera códigos de seguimiento y acceso
- [ ] Verificación de códigos funciona correctamente

---

**Última revisión**: 2025-12-27
**Owner interno**: TimeNow Team

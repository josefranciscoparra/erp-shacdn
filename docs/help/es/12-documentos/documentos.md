# Gestión de Documentos

## Qué es y para qué sirve

El módulo de **Gestión de Documentos** permite almacenar, organizar y gestionar documentos digitales de forma centralizada:

- Contratos laborales
- Nóminas y recibos de pago
- Documentos de identidad (DNI, NIE)
- Documentos de Seguridad Social
- Certificados laborales
- Documentos médicos
- Otros archivos relevantes

## Quién puede usarlo

| Rol      | Ver propios | Descargar | Subir | Ver todos | Papelera |
| -------- | ----------- | --------- | ----- | --------- | -------- |
| Empleado | Sí          | Sí        | No    | No        | No       |
| HR Admin | Sí          | Sí        | Sí    | Sí        | Sí       |

---

## Flujos principales

### 1) Ver mis documentos

**Ubicación:** `/dashboard/me/documents`

1. Ir a Mi Espacio → Documentos
2. Verás documentos organizados en categorías
3. Usa búsqueda y filtros para encontrar
4. Información: Nombre, Tamaño, Tipo, Quién subió, Fecha

**Tipos de documento:**

- Contrato (azul)
- Nómina (verde)
- DNI/NIE (púrpura)
- Seguridad Social (naranja)
- Certificado (cian)
- Médico (rojo)
- Otros (gris)

### 2) Descargar documento

1. Encuentra el documento en la lista
2. Haz clic en el menú (⋯)
3. Selecciona "Ver" o "Descargar"
4. URL segura firmada (expira en 1 hora)

### 3) Subir documentos (admin)

**Restricción**: Solo administradores HR pueden subir.

1. Buscar el empleado destinatario
2. Hacer clic en "Subir documento"
3. Campos: Archivo (máx. 10MB), Tipo, Descripción
4. El documento aparece en "Mis documentos" del empleado

### 4) Papelera (trash/legal hold)

**Ubicación:** `/dashboard/admin/documents/trash`

La "papelera" respeta normativas de cumplimiento (RGPD, LOPDGDD):

| Estado           | Descripción                       | Acción                   |
| ---------------- | --------------------------------- | ------------------------ |
| Puede purgar     | Ha expirado el plazo de retención | Eliminar definitivamente |
| Retención activa | Plazo legal pendiente             | Esperar                  |
| Legalhold        | Bajo investigación                | Solo restaurar           |

---

## Pantallas y campos

### Mis documentos

- Búsqueda y filtros por tipo
- Tabla: Documento, Tipo, Subido por, Fecha, Acciones

### Papelera Legal

- Estadísticas: Total, Purgables, Retenidos, Legalhold
- Tabla: Archivo, Empleado, Eliminado por, Estado, Acciones

---

## Preguntas frecuentes

**P: ¿Cuál es el tamaño máximo de un archivo?**
R: 10 MB por archivo.

**P: ¿Qué formatos se aceptan?**
R: PDF, Word (.doc, .docx), JPG, PNG, WEBP.

**P: ¿Puedo recuperar un documento que eliminé?**
R: Sí, puede restaurarse desde la Papelera Legal.

**P: ¿Quién puede ver mis documentos?**
R: Tú siempre, RRHH con permisos, otros empleados NO.

---

## Checklist de soporte

**Para empleados:**

- [ ] Puede ver sus documentos
- [ ] Puede descargar correctamente
- [ ] Filtros funcionan

**Para administradores:**

- [ ] Puede subir documentos
- [ ] Puede restaurar de papelera
- [ ] Puede purgar documentos expirados

---

**Última revisión**: 2025-12-27
**Owner interno**: TimeNow Team

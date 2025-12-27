# Nóminas

## Qué es y para qué sirve

El módulo de **Nóminas** es un sistema completo de gestión de documentos de nómina dentro de TimeNow. Permite:

- **Empleados**: Consultar y descargar sus nóminas personales de forma segura
- **Administradores**: Subir, revisar, asignar y publicar nóminas (individuales o masivas)
- **Control de versiones**: Revocar nóminas publicadas si es necesario

## Quién puede usarlo

| Rol | Acceso | Acciones |
|-----|--------|---------|
| Empleado | `/dashboard/me/payslips` | Ver y descargar sus propias nóminas |
| Administrador/RRHH | `/dashboard/payslips` | Subir, revisar, asignar, publicar y revocar |

---

## Flujos principales

### 1) Ver mis nóminas (empleado)

**Ruta**: `/dashboard/me/payslips`

1. Accede a "Mis Nóminas"
2. Filtra por año
3. Tabla con: Período, Fecha de subida, Formato, Botón Descargar

**Estados:**
- PUBLISHED: Visible para el empleado
- REVOKED: No visible (fue revocada)

### 2) Descargar nómina

1. Desde "Mis Nóminas": Click en botón "Descargar"
2. El navegador descarga el PDF
3. URL de descarga segura (expira en 1 hora)

### 3) Subir nóminas (admin)

**Subida individual:**
1. Click en "Subir nómina individual"
2. Paso 1: Seleccionar empleado
3. Paso 2: Datos (Año, Mes, Etiqueta)
4. Paso 3: Subir archivo PDF
5. Paso 4: Confirmar y publicar

**Subida masiva:**
1. Ve a `/dashboard/payslips/upload`
2. Sube ZIP con PDFs o PDF multipágina
3. OCR automático detecta empleados
4. Revisa y asigna manualmente si es necesario
5. Publica el lote

### 4) Publicar nóminas

1. Verificar items en estado READY
2. Click en "Publicar lote"
3. Empleados reciben notificación
4. Items pasan a PUBLISHED

### 5) Revocar nóminas

1. Click en "Revocar" en item PUBLISHED
2. Confirma y añade motivo (opcional)
3. Nómina desaparece del portal del empleado
4. Archivo se conserva para auditoría

---

## Pantallas y campos

### Mis Nóminas (Empleado)

- Filtro por año
- Tabla: Período, Fecha, Formato, Descargar

### Gestión de Nóminas (Admin)

- Tabla de lotes con estado y progreso
- Detalle de lote con items individuales

---

## Preguntas frecuentes

**P: ¿Dónde veo mis nóminas?**
R: En `/dashboard/me/payslips` → "Mis Nóminas".

**P: ¿Cómo sé cuándo tengo una nómina nueva?**
R: Recibes una notificación cuando se publica.

**P: ¿Qué pasa si el OCR no encuentra el empleado?**
R: El item queda en PENDING_REVIEW y debes asignar manualmente.

**P: ¿Puedo publicar nóminas después?**
R: Sí, los items en estado READY pueden publicarse cuando quieras.

---

## Checklist de soporte

**Para empleados:**
- [ ] Empleado tiene nóminas PUBLISHED
- [ ] Puede descargar correctamente
- [ ] Recibe notificación al publicar

**Para administradores:**
- [ ] Puede subir individual y masivo
- [ ] OCR funciona correctamente
- [ ] Puede asignar empleados manualmente
- [ ] Puede publicar y revocar

---

**Última revisión**: 2025-12-27
**Owner interno**: TimeNow Team

# Gestión de Gastos

## Qué es y para qué sirve

La Gestión de Gastos en TimeNow es un sistema completo que permite a los empleados registrar, adjuntar documentación y solicitar reembolso de gastos relacionados con su actividad laboral. Los administradores pueden revisar, aprobar o rechazar estos gastos y gestionar los reembolsos.

**Casos de uso principales:**

- Registrar combustible, peajes y aparcamiento en desplazamientos
- Reportar comidas y alojamientos en viajes de negocio
- Solicitar reembolso de kilometraje con vehículo propio
- Adjuntar recibos y facturas como justificante

## Quién puede usarlo

- **Empleados**: Crear, guardar y enviar gastos a aprobación
- **Managers/Supervisores**: Revisar y aprobar gastos de su equipo
- **Administradores de RRHH**: Gestión completa, configurar políticas, procesar reembolsos

---

## Flujos principales

### 1) Crear un gasto (empleado)

**Pasos básicos:**

1. **Navegar a Gastos**: Menú lateral → Gastos → Mis gastos
2. **Crear nuevo gasto**: Click en botón "Nuevo gasto"
3. **Rellenar datos del gasto**:
   - **Fecha**: Fecha en la que se realizó el gasto
   - **Categoría**: Combustible, Kilometraje, Comidas, Peajes, Parking, Alojamiento, Otros
   - **Importe base (sin IVA)**: Cantidad sin impuestos
   - **IVA %**: Seleccionar entre 0%, 10% o 21%
4. **Datos del comercio** (opcional): Nombre y CIF
5. **Notas** (opcional): Detalles adicionales
6. **Adjuntar recibos**: Formatos PDF, JPG, PNG (máx. 10MB)
7. **Guardar borrador o enviar**

**Estados de un gasto:**

- **DRAFT**: Borrador sin enviar
- **SUBMITTED**: Enviado a aprobación
- **APPROVED**: Aprobado, pendiente de reembolso
- **REJECTED**: Rechazado por aprobador
- **REIMBURSED**: Reembolsado al empleado

![IMG: nuevo-gasto | Pantalla: Formulario de gasto | Elementos clave: categoría, importe, adjuntos | Acción destacada: Enviar gasto]

### 2) Ver mis gastos

**Acceso:** Menú lateral → Gastos → Mis gastos

**Tabla de gastos con columnas:**

- Fecha, Categoría, Comercio, Importe, IVA, Total, Estado

**Acciones disponibles:**

- Click en fila: Ver detalles completos
- Menú de 3 puntos: Editar (solo DRAFT), Enviar, Eliminar

### 3) Control de gastos (admin)

**Revisar y aprobar gastos:**

1. Ve a Gastos en el panel de administración
2. Revisa gastos pendientes de aprobación
3. Click en gasto para ver detalles
4. Botón "Aprobar" o "Rechazar" (con comentario obligatorio)

**Gestión de Reembolsos:**

1. Ve a Gastos → Reembolsos
2. Selecciona gastos para reembolsar
3. Procesa el reembolso con método y referencia

---

## Pantallas y campos

### Formulario de Gasto

| Campo        | Requerido | Descripción                  |
| ------------ | --------- | ---------------------------- |
| Fecha        | Sí        | Fecha del gasto (máximo hoy) |
| Categoría    | Sí        | Tipo de gasto                |
| Importe base | Sí        | Cantidad sin IVA             |
| IVA %        | Sí        | 0%, 10% o 21%                |
| Comercio     | No        | Nombre del establecimiento   |
| CIF/NIF      | No        | Identificación fiscal        |
| Notas        | No        | Detalles adicionales         |
| Adjuntos     | Variable  | Según política               |

---

## Preguntas frecuentes

**P: ¿Cuándo debo crear un gasto?**
R: Cada vez que hagas un desembolso relacionado con tu actividad laboral.

**P: ¿Puedo modificar un gasto después de enviarlo?**
R: No. Si hay errores, debe ser rechazado y recreado.

**P: ¿Qué ocurre si no adjunto un recibo?**
R: Según la política de tu organización, probablemente no podrás enviar el gasto.

**P: ¿Cuánto tiempo tarda la aprobación?**
R: Depende de tu estructura organizacional, normalmente 1-2 días.

---

## Checklist de soporte

**Funcionalidades Básicas (Empleado):**

- [ ] Puede crear nuevo gasto
- [ ] Campos se validan correctamente
- [ ] Puede adjuntar archivos
- [ ] Los borradores se guardan
- [ ] Al enviar requiere adjuntos
- [ ] Estados se muestran correctamente

**Administración:**

- [ ] Admins pueden revisar gastos
- [ ] Pueden aprobar/rechazar con comentarios
- [ ] Pueden procesar reembolsos
- [ ] Analytics y reportes funcionan

---

**Última revisión**: 2025-12-27
**Owner interno**: TimeNow Team

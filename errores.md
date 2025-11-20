Errores resueltos - 30/10/2025

✅ RESUELTO: Desde el móvil, cuando pulso en una opción de menú, el menú móvil ahora se oculta automáticamente.

- Solución: Agregado onClick handler en nav-main.tsx que cierra el sidebar en móvil al hacer clic en cualquier link.

✅ RESUELTO: Al abrir sesión, si la persona anterior estaba fichando, el estado ahora se reinicia automáticamente.

- Solución: Agregado resetStore() en login-form.tsx y nav-user.tsx que limpia el estado del time-tracking-store antes de hacer login/logout.

✅ RESUELTO: La página de firma (/sign/[token]) ahora mantiene la barra lateral y el layout del dashboard.

- Solución: Reemplazado min-h-screen por @container/main en todos los estados de la página para que respete el layout padre.

---

## Errores pendientes - 04/11/2025

### ❌ ERROR: La barra de búsqueda de empleados aparecía "bugueada" al seleccionar "Departamentos completos"

**Descripción:**

- Al intentar crear una firma para departamentos en `/dashboard/signatures`, la barra de búsqueda aparecía cortada en la parte inferior del modal
- Los departamentos no se mostraban en los checkboxes

**Solución aplicada:**

1. Añadido estado `openComboboxAdvanced` para controlar el popover del modo avanzado
2. Añadido `useEffect` que cierra automáticamente los popovers cuando cambia `recipientType`
3. Corregido el parsing de la respuesta del API `/api/departments` (devuelve array directo, no objeto con propiedad `departments`)

### ❌ PENDIENTE: Error al crear solicitud de firma - "Error interno del servidor"

**Descripción:**

- Al intentar crear una solicitud de firma (para departamentos), se produce un error "Error interno del servidor"
- Error en `create-signature-dialog.tsx:264` al llamar al endpoint `/api/signatures/requests/create`

**Detalles técnicos:**

```
Error interno del servidor
src/app/(main)/dashboard/signatures/_components/create-signature-dialog.tsx (264:15) @ onSubmit
```

**Estado:** Pendiente de investigación

---

Un problema que veo es el tema de las cuentas de usuario. Como al ser un servicio multitenan,
se nos puede dar el caso que se registre el email de un usuario en dos organizaciones.
Entonces lo que me gustaría es para el registro de usuarios que sea obligatorio poner para
cada organización como un @timenow.cloud y solo podemos dar de alta personas con el @timenow.cloud
de su organización. No sé cómo se te ocurra hacerlo.

La numeracion del empleado debe de ser automática. Y que nunca se repita. no sé como plantear esot, dame opciones, quizas si la empresa es timenow tmnw001? no se.

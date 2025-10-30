Errores resueltos - 30/10/2025

✅ RESUELTO: Desde el móvil, cuando pulso en una opción de menú, el menú móvil ahora se oculta automáticamente.

- Solución: Agregado onClick handler en nav-main.tsx que cierra el sidebar en móvil al hacer clic en cualquier link.

✅ RESUELTO: Al abrir sesión, si la persona anterior estaba fichando, el estado ahora se reinicia automáticamente.

- Solución: Agregado resetStore() en login-form.tsx y nav-user.tsx que limpia el estado del time-tracking-store antes de hacer login/logout.

✅ RESUELTO: La página de firma (/sign/[token]) ahora mantiene la barra lateral y el layout del dashboard.

- Solución: Reemplazado min-h-screen por @container/main en todos los estados de la página para que respete el layout padre.

Un problema que veo es el tema de las cuentas de usuario. Como al ser un servicio multitenan,
se nos puede dar el caso que se registre el email de un usuario en dos organizaciones.
Entonces lo que me gustaría es para el registro de usuarios que sea obligatorio poner para
cada organización como un @timenow.cloud y solo podemos dar de alta personas con el @timenow.cloud
de su organización. No sé cómo se te ocurra hacerlo.


http://localhost:3000/dashboard/me/profile Cuando entro ahi y cambio el nombre, se cambia en http://localhost:3000/dashboard/me/profile pero luego en el icono de abajo del sidebar se ve el antiguo, y cuando me busca un administrador sigue saliendo el antiguo. 

# Guía de Configuración de Sentry para ERP

## 🎯 ¿Qué incluye esta integración?

✅ **Monitorización de errores** en cliente y servidor
✅ **Performance monitoring** para detectar operaciones lentas
✅ **Session Replay** para ver qué hacía el usuario cuando ocurrió el error
✅ **Detección de bucles infinitos** (operaciones > 1000 spans)
✅ **Tracking de operaciones críticas** (fichajes, aprobaciones, etc.)
✅ **Breadcrumbs personalizados** para debugging avanzado
✅ **Source maps automáticos** en producción (ocultos del público)

---

## 📦 Configuración Inicial

### 1. Obtener el DSN de Sentry

1. Ve a tu proyecto en Sentry: https://sentry.io/organizations/timenow/projects/javascript-nextjs/
2. Ve a **Settings** → **Client Keys (DSN)**
3. Copia el DSN

### 2. Configurar Variables de Entorno

Crea/actualiza tu archivo `.env` local:

```bash
# DSN de Sentry (OBLIGATORIO)
NEXT_PUBLIC_SENTRY_DSN="https://tu-dsn-aqui@sentry.io/proyecto-id"

# Auth token para source maps (OPCIONAL - solo para producción)
# Obtener desde: https://sentry.io/settings/account/api/auth-tokens/
# Permisos necesarios: project:releases, project:write
SENTRY_AUTH_TOKEN="tu-token-aqui"

# Configuración de organización (ya configurados en next.config.mjs)
SENTRY_ORG="timenow"
SENTRY_PROJECT="javascript-nextjs"
```

⚠️ **IMPORTANTE**:
- El `NEXT_PUBLIC_SENTRY_DSN` debe tener prefijo `NEXT_PUBLIC_` para funcionar en el cliente
- El `SENTRY_AUTH_TOKEN` NO debe commitearse nunca a git (ya está en `.gitignore`)

### 3. Verificar la Instalación

1. **Reiniciar el servidor de desarrollo**:
   ```bash
   npm run dev
   ```

2. **Probar la integración**:
   - Visita: http://localhost:3000/api/sentry-test
   - Esto lanzará un error de prueba que debe aparecer en tu dashboard de Sentry

3. **Verificar en Sentry**:
   - Ve a https://sentry.io/organizations/timenow/issues/
   - Deberías ver el error de prueba con el emoji 🧪

---

## 🧪 Testing de Diferentes Features

### Test de Errores
```bash
curl http://localhost:3000/api/sentry-test?type=error
```

### Test de Warnings
```bash
curl http://localhost:3000/api/sentry-test?type=warning
```

### Test de Performance Monitoring
```bash
curl http://localhost:3000/api/sentry-test?type=performance
```

### Test de Breadcrumbs
```bash
curl http://localhost:3000/api/sentry-test?type=breadcrumbs
```

---

## 📊 Features Activadas

### 1. **Error Monitoring**
- ✅ Captura automática de errores en cliente y servidor
- ✅ Context de usuario (userId, email, role, orgId)
- ✅ Sanitización de datos sensibles (passwords, tokens)
- ✅ Error boundaries con UI personalizada

### 2. **Performance Monitoring**
- ✅ Transaction tracing al 100% en desarrollo
- ✅ Transaction tracing al 30% en producción (ajustable)
- ✅ Profiling de operaciones
- ✅ Detección de operaciones lentas (> 5s genera alerta)

### 3. **Session Replay**
- ✅ Grabación de 10% de sesiones normales
- ✅ Grabación de 100% de sesiones con errores
- ✅ Enmascaramiento automático de texto sensible
- ✅ Bloqueo de imágenes/videos

### 4. **Integración con Prisma**
- ✅ Tracking de queries de base de datos
- ✅ Detección de N+1 queries
- ✅ Performance de operaciones DB

---

## 🔧 Uso en el Código

### Usar el Wrapper para Server Actions

```typescript
import { withSentryServerAction } from "@/lib/sentry/server-action-wrapper";

export const clockIn = withSentryServerAction(
  "clockIn",
  "TimeTracking",
  async (latitude?: number, longitude?: number) => {
    // Tu lógica aquí
    return { success: true };
  }
);
```

**Beneficios del wrapper:**
- ✅ Captura automática de errores
- ✅ Context de usuario añadido
- ✅ Performance tracking
- ✅ Detección de operaciones lentas
- ✅ Breadcrumbs automáticos

### Tracking de Operaciones Críticas

```typescript
import { trackCriticalOperation } from "@/lib/sentry/server-action-wrapper";

// En cualquier parte de tu código servidor
trackCriticalOperation("Aprobación de gasto", "Finance", {
  expenseId: "123",
  amount: 500,
  userId: "user-456",
});
```

### Tracking de Acciones de Usuario (Cliente)

```typescript
import { trackUserAction } from "@/lib/sentry/client-context";

function handleSubmit() {
  trackUserAction("Submitted expense form", {
    category: "Transport",
    amount: 50,
  });

  // Tu lógica aquí
}
```

---

## 🎨 Dashboard de Sentry

### Acceder al Dashboard
https://sentry.io/organizations/timenow/projects/javascript-nextjs/

### Secciones Importantes

1. **Issues** - Lista de errores capturados
2. **Performance** - Transacciones y operaciones lentas
3. **Replays** - Grabaciones de sesiones con errores
4. **Releases** - Tracking de deployments (se configura en CI/CD)

### Configurar Alertas

1. Ve a **Alerts** → **Create Alert**
2. Configuraciones recomendadas:
   - **Error rate > 5%** en última hora → Email/Slack
   - **Performance degradation > 50%** → Email/Slack
   - **Operación lenta > 10s** → Email

---

## 🚀 Producción

### Source Maps Automáticos

Los source maps se suben automáticamente a Sentry en build de producción:

```bash
npm run build
```

**Requisitos:**
- Variable `SENTRY_AUTH_TOKEN` configurada
- Permisos: `project:releases`, `project:write`

Los source maps se ocultan del público pero permiten ver el código original en Sentry.

### Ajustar Sample Rates en Producción

En `sentry.client.config.ts` y `sentry.server.config.ts`:

```typescript
// Para producción, reducir a 10-30% para ahorrar cuota
tracesSampleRate: process.env.NODE_ENV === "production" ? 0.3 : 1.0,
```

---

## 📈 Módulos del ERP Instrumentados

Los siguientes módulos tienen tracking automático cuando uses el wrapper:

| Módulo | Server Actions | Operaciones Críticas |
|--------|---------------|---------------------|
| **Time Tracking** | Clock in/out, pausas | Fichajes fuera de área |
| **PTO** | Crear solicitud, aprobar | Aprobaciones |
| **Expenses** | Crear gasto, aprobar | Aprobaciones |
| **HR** | CRUD empleados | Cambios de rol/permisos |
| **Finance** | Operaciones financieras | Acceso a datos sensibles |

---

## 🐛 Troubleshooting

### No veo errores en Sentry

1. ✅ Verificar que `NEXT_PUBLIC_SENTRY_DSN` está configurado
2. ✅ Reiniciar el servidor de desarrollo
3. ✅ Probar con `/api/sentry-test`
4. ✅ Verificar consola del navegador por errores de Sentry

### Source maps no funcionan

1. ✅ Verificar que `SENTRY_AUTH_TOKEN` está configurado
2. ✅ Verificar permisos del token (project:releases, project:write)
3. ✅ Ejecutar `npm run build` y verificar logs

### Session Replay no graba

1. ✅ Session Replay solo funciona en HTTPS en producción
2. ✅ En desarrollo, funciona en localhost
3. ✅ Verificar que `replaysSessionSampleRate` > 0

---

## 📚 Documentación Oficial

- [Sentry Next.js Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Session Replay](https://docs.sentry.io/product/session-replay/)
- [Alertas](https://docs.sentry.io/product/alerts/)

---

## ✅ Checklist de Verificación

- [ ] DSN configurado en `.env`
- [ ] Auth token configurado (opcional para dev)
- [ ] Servidor reiniciado después de configurar
- [ ] Test de error funciona: `/api/sentry-test`
- [ ] Errores aparecen en dashboard de Sentry
- [ ] Performance traces visibles en Sentry
- [ ] Session Replay funciona (probar lanzando un error)
- [ ] Alertas configuradas en Sentry UI

---

## 🎉 ¡Listo!

Tu aplicación ahora tiene monitorización completa con Sentry. Cualquier error será capturado automáticamente y podrás ver:

- ✅ Qué hizo el usuario antes del error (breadcrumbs)
- ✅ Qué estaba viendo (session replay)
- ✅ Performance de las operaciones
- ✅ Bucles infinitos y operaciones lentas

Para más información, consulta la [documentación oficial de Sentry](https://docs.sentry.io/).

# Guía de Configuración del Módulo de Chat

Esta guía te ayudará a configurar el módulo de chat en tu aplicación ERP.

## ⚠️ IMPORTANTE: Migración de Base de Datos

**ANTES DE USAR EL CHAT**, debes aplicar la migración de Prisma para crear las tablas necesarias.

### Opción 1: Migración con Prisma Migrate (Recomendado)

```bash
# Crear la migración (cuando la conexión de red a Prisma binaries funcione)
npx prisma migrate dev --name add_chat_module

# En producción, usar:
npx prisma migrate deploy
```

### Opción 2: Sincronización Directa (Si hay problemas de red)

```bash
# Sincroniza el schema sin crear migración (NO pierde datos)
npx prisma db push

# Regenerar cliente de Prisma
npx prisma generate
```

**Nota**: El schema de Prisma ya ha sido actualizado con los modelos `Conversation` y `Message`. Solo falta aplicarlo a la base de datos.

## Paso a Paso

### 1. Aplicar Migración de Base de Datos

Ejecuta uno de los comandos de la sección anterior según tu situación.

### 2. Activar Feature Flag

El módulo de chat está controlado por un feature flag a nivel de organización. Puedes activarlo de dos formas:

#### Opción A: SQL directo

```sql
-- Activar chat para una organización específica
UPDATE organizations
SET features = jsonb_set(
  COALESCE(features, '{}'::jsonb),
  '{chat}',
  'true'
)
WHERE id = 'tu_org_id_aqui';

-- Activar chat para TODAS las organizaciones (usar con precaución)
UPDATE organizations
SET features = jsonb_set(
  COALESCE(features, '{}'::jsonb),
  '{chat}',
  'true'
);
```

#### Opción B: Script de Node.js

Crea un archivo `scripts/enable-chat.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function enableChat(orgId?: string) {
  if (orgId) {
    // Activar para una organización específica
    await prisma.organization.update({
      where: { id: orgId },
      data: {
        features: {
          chat: true,
        },
      },
    });
    console.log(`✅ Chat activado para organización: ${orgId}`);
  } else {
    // Activar para todas
    const orgs = await prisma.organization.findMany();
    for (const org of orgs) {
      await prisma.organization.update({
        where: { id: org.id },
        data: {
          features: {
            ...(org.features as object),
            chat: true,
          },
        },
      });
    }
    console.log(`✅ Chat activado para ${orgs.length} organizaciones`);
  }
}

// Uso:
// node --loader ts-node/esm scripts/enable-chat.ts
enableChat(process.argv[2]).finally(() => prisma.$disconnect());
```

### 3. Reiniciar Servidor

```bash
npm run dev
```

### 4. Verificar Instalación

1. **Login** en la aplicación
2. Ir al **Dashboard** → Verás "Mensajes" en el sidebar bajo "Mi día a día"
3. Click en **Mensajes**
4. Deberías ver:
   - "Conectado (Tiempo real)" en verde si SSE funciona
   - "Conectado (Polling)" si SSE no está disponible
   - Mensaje "No tienes conversaciones" si es la primera vez

### 5. Probar Funcionalidad

1. **Iniciar un chat**:
   - Click en el icono `+` (MessageSquarePlus) en la esquina superior derecha
   - Buscar un usuario por nombre o email
   - Seleccionar usuario
   - La conversación se creará automáticamente

2. **Enviar mensajes**:
   - Escribe en el input inferior
   - Presiona Enter o click en el botón de enviar
   - El mensaje debe aparecer en tiempo real

3. **Verificar tiempo real** (necesitas dos usuarios):
   - Login con Usuario A en un navegador
   - Login con Usuario B en otro navegador (o modo incógnito)
   - Inicia conversación entre ambos
   - Envía mensajes de A → B
   - Los mensajes deben aparecer instantáneamente en B sin refresh

## Configuración Avanzada

### Rate Limiting

Por defecto: **10 mensajes por 10 segundos**.

Para modificar, edita `/src/lib/chat/rate-limiter.ts`:

```typescript
export const chatRateLimiter = new RateLimiter(
  20,    // Máximo de mensajes
  15000  // Ventana en milisegundos (15 segundos)
);
```

### Tamaño Máximo de Mensaje

Por defecto: **2KB** (2048 bytes).

Para modificar, edita `/src/lib/chat/utils.ts`:

```typescript
export function validateMessageSize(body: string): boolean {
  const sizeInBytes = new TextEncoder().encode(body).length;
  return sizeInBytes <= 4096; // 4KB
}
```

### Intervalo de Heartbeat SSE

Por defecto: **30 segundos**.

Para modificar, edita `/src/lib/chat/sse-manager.ts`:

```typescript
this.heartbeatInterval = setInterval(() => {
  // ...
}, 60000); // 60 segundos
```

### Fallback a Polling

Por defecto: **Después de 5 intentos fallidos de SSE**.

Para modificar, edita `/src/hooks/use-chat-stream.ts`:

```typescript
const maxReconnectAttempts = 3; // Reducir a 3 intentos
```

## Desactivar el Chat

Para desactivar el chat en una organización:

```sql
UPDATE organizations
SET features = jsonb_set(
  features,
  '{chat}',
  'false'
)
WHERE id = 'tu_org_id_aqui';
```

O eliminar el campo completamente:

```sql
UPDATE organizations
SET features = features - 'chat'
WHERE id = 'tu_org_id_aqui';
```

**Efecto**:
- UI del chat NO aparece en el sidebar
- Endpoints retornan `403 Forbidden`
- SSE stream no se conecta
- Datos existentes se mantienen (conversaciones y mensajes)

## Troubleshooting

### Error: "Organización no encontrada"

**Causa**: No existe el `orgId` en la base de datos.

**Solución**: Verificar que el usuario tiene un `orgId` válido en la sesión.

### Error: "El módulo de chat no está habilitado"

**Causa**: Feature flag `chat` no está en `true` para la organización.

**Solución**: Seguir paso 2 de esta guía.

### SSE no conecta (queda en "Desconectado")

**Causa**: Puede ser un problema de red, proxy, o navegador.

**Solución**:
1. Revisar consola del navegador por errores
2. Verificar que el servidor está corriendo en puerto 3000
3. Si hay proxy (nginx/apache), configurar para permitir SSE (ver docs/CHAT_MODULE.md)
4. El sistema debería caer automáticamente a polling después de 5 intentos

### Mensajes no llegan en tiempo real

**Causa**: SSE desconectado o en modo polling.

**Solución**:
1. Verificar indicador de conexión en la UI
2. Si está en polling, los mensajes llegarán cada 10 segundos
3. Revisar logs del servidor: `[SSE] Nueva conexión: ...`

### Rate limit constante

**Causa**: Envío masivo de mensajes.

**Solución**:
1. Esperar 10 segundos antes de reintentar
2. Ajustar límites en rate-limiter.ts si es necesario
3. Considerar Redis para rate limiting en producción

### Error al enviar mensaje: "Error al crear conversación"

**Causa**: Puede ser que los modelos no existen en la base de datos.

**Solución**: Aplicar migración (paso 1 de esta guía).

## Verificación de Tablas

Para verificar que las tablas fueron creadas correctamente:

```sql
-- Verificar que existen las tablas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('conversations', 'messages');

-- Debería retornar:
-- conversations
-- messages
```

## Monitoreo

### Logs importantes

```bash
# Ver conexiones SSE activas
[SSE] Nueva conexión: org123:user456 (Total: 5)
[SSE] Cliente desconectado: user456
[SSE] Stream cancelado para usuario user456

# Ver mensajes enviados
[API] Error en POST /api/chat/messages: ...
```

### Queries útiles

```sql
-- Contar conversaciones por organización
SELECT org_id, COUNT(*)
FROM conversations
GROUP BY org_id;

-- Mensajes enviados hoy
SELECT COUNT(*)
FROM messages
WHERE created_at >= CURRENT_DATE;

-- Usuarios más activos
SELECT sender_id, COUNT(*) as message_count
FROM messages
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY sender_id
ORDER BY message_count DESC
LIMIT 10;
```

## Soporte

Para más información, consultar:

- **Documentación completa**: `docs/CHAT_MODULE.md`
- **Estructura de archivos**: `docs/CHAT_MODULE.md` (sección "Estructura de Archivos")
- **Troubleshooting avanzado**: `docs/CHAT_MODULE.md` (sección "Troubleshooting")

---

¡Disfruta del chat! 💬

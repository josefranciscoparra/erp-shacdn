# Módulo de Chat 1:1

Este documento describe el módulo de chat implementado en la aplicación ERP.

## Descripción General

Módulo de mensajería instantánea 1:1 (persona a persona) con las siguientes características:

- ✅ Mensajería en tiempo real con **Server-Sent Events (SSE)**
- ✅ Fallback automático a **polling** si SSE falla
- ✅ **Multi-tenant** por `orgId` (aislamiento entre organizaciones)
- ✅ **Feature flag** configurable para activar/desactivar por organización
- ✅ **Rate limiting** (10 mensajes por 10 segundos)
- ✅ Persistencia en PostgreSQL con Prisma
- ✅ UI profesional con lista de conversaciones y vista de mensajes
- ✅ Búsqueda de usuarios para iniciar conversaciones
- ✅ Paginación de mensajes
- ✅ Indicadores de lectura (opcional)

## Arquitectura

### Base de Datos

#### Modelos Prisma

```prisma
model Conversation {
  id              String   @id @default(cuid())
  userAId         String
  userBId         String
  lastMessageAt   DateTime @default(now())
  isBlocked       Boolean  @default(false)
  orgId           String
  // ... relaciones
}

model Message {
  id              String   @id @default(cuid())
  body            String   @db.Text
  status          MessageStatus @default(SENT)
  conversationId  String
  senderId        String
  orgId           String
  createdAt       DateTime @default(now())
  editedAt        DateTime?
  deletedAt       DateTime?
  // ... relaciones
}

enum MessageStatus {
  SENT
  READ
}
```

**Normalización de IDs**: Los IDs de usuarios en `Conversation` se normalizan alfabéticamente (`userAId < userBId`) para evitar duplicados.

### Endpoints API

| Método | Endpoint                                | Descripción                       |
| ------ | --------------------------------------- | --------------------------------- |
| `POST` | `/api/chat/conversations`               | Crear o obtener conversación 1:1  |
| `GET`  | `/api/chat/conversations`               | Listar conversaciones del usuario |
| `GET`  | `/api/chat/conversations/[id]/messages` | Obtener mensajes con paginación   |
| `POST` | `/api/chat/messages`                    | Enviar mensaje                    |
| `POST` | `/api/chat/messages/read`               | Marcar mensajes como leídos       |
| `GET`  | `/api/chat/stream`                      | Stream SSE para tiempo real       |
| `GET`  | `/api/chat/users/search`                | Buscar usuarios para chat         |

### Server Actions

Ubicados en `/src/server/actions/chat.ts`:

- `getOrCreateConversation(peerUserId)` - Obtiene o crea conversación
- `getMyConversations(limit)` - Lista conversaciones del usuario
- `getConversationMessages(conversationId, cursor, limit)` - Obtiene mensajes
- `sendMessage(conversationId, body)` - Envía mensaje
- `markMessagesAsRead(conversationId, messageId)` - Marca como leído
- `searchUsersForChat(query, limit)` - Busca usuarios

### Sistema SSE (Server-Sent Events)

**Gestor de conexiones** (`/src/lib/chat/sse-manager.ts`):

- Mantiene conexiones activas por usuario
- Envía eventos en tiempo real (mensajes, lecturas, sistema)
- Heartbeat cada 30 segundos (`: heartbeat\n\n`)
- Reconexión automática con `Last-Event-ID`

**Tipos de eventos SSE**:

- `message` - Nuevo mensaje recibido
- `read` - Mensajes marcados como leídos
- `system` - Eventos del sistema
- `heartbeat` - Mantener conexión viva

### Rate Limiting

**Límites** (`/src/lib/chat/rate-limiter.ts`):

- **10 mensajes por 10 segundos** por usuario
- Implementación en memoria (para producción considerar Redis)
- Respuesta `429 Too Many Requests` con header `Retry-After`

## Feature Flag

El módulo se activa/desactiva por organización mediante el campo `features` JSON en el modelo `Organization`:

```json
{
  "chat": true
}
```

**Verificación en todas las rutas**:

```typescript
const features = org.features as Record<string, unknown>;
const chatEnabled = features.chat === true;
```

Si está desactivado:

- Endpoints retornan `403 Forbidden`
- UI no se muestra en el sidebar
- SSE stream no se conecta

## Frontend

### Hooks

#### `useChatStream` (`/src/hooks/use-chat-stream.ts`)

Hook para conectarse al stream SSE con fallback a polling.

```typescript
const { isConnected, transport, reconnectAttempts } = useChatStream({
  enabled: true,
  onMessage: (message) => {
    /* ... */
  },
  onRead: (data) => {
    /* ... */
  },
  onError: (error) => {
    /* ... */
  },
});
```

**Características**:

- Reintentos exponenciales (1s, 2s, 4s, 8s, 16s, 30s max)
- Máximo 5 intentos antes de caer a polling
- Polling cada 10 segundos como fallback
- Cleanup automático al desmontar

### Componentes

#### `ChatContainer` (principal)

Contenedor principal que maneja:

- Lista de conversaciones (sidebar)
- Vista de conversación (área principal)
- Conexión SSE global
- Dialog para nuevo chat

#### `ConversationsList`

Lista de conversaciones con:

- Avatar del otro usuario
- Último mensaje enviado
- Timestamp relativo (ej: "2h", "3d")
- Indicador de conversación seleccionada

#### `ConversationView`

Vista de mensajes con:

- Header con info del usuario
- ScrollArea con mensajes
- Input para enviar nuevos mensajes
- Auto-scroll al último mensaje
- Burbujas de chat (izquierda=recibidos, derecha=enviados)

#### `NewChatDialog`

Dialog para iniciar nuevo chat:

- Búsqueda de usuarios por nombre/email
- Resultados en tiempo real
- Creación de conversación al seleccionar usuario

### Rutas

```
/dashboard/chat - Página principal del módulo de chat
```

Añadida al sidebar en "Mi día a día" → "Mensajes".

## Seguridad

### Multi-tenant

- Todos los queries filtrados por `orgId`
- Solo participantes pueden acceder a conversación
- Validación de permisos en endpoints y server actions

### Rate Limiting

```typescript
// 10 mensajes por 10 segundos
chatRateLimiter.check(userId);
```

### Validación de Mensajes

- Tamaño máximo: **2KB** (2048 bytes)
- Sanitización de espacios extras
- Trim de espacios en blanco

### Autenticación

Todos los endpoints requieren sesión activa:

```typescript
const session = await auth();
if (!session?.user?.id || !session?.user?.orgId) {
  return NextResponse.json({ error: "No autenticado" }, { status: 401 });
}
```

## Configuración de Producción

### Variables de Entorno

Ninguna requerida específicamente para el chat. Usa las variables existentes:

```bash
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="..."
```

### Nginx (si se usa como proxy)

Para SSE es importante desactivar buffering:

```nginx
location /api/chat/stream {
    proxy_pass http://localhost:3000;
    proxy_buffering off;
    proxy_cache off;
    proxy_set_header X-Accel-Buffering no;
    proxy_set_header Connection '';
    proxy_http_version 1.1;
    chunked_transfer_encoding off;
}
```

### Despliegue

1. **Aplicar migración de base de datos**:

```bash
npx prisma migrate deploy
```

2. **Activar feature flag** en cada organización:

```sql
UPDATE organizations
SET features = jsonb_set(features, '{chat}', 'true')
WHERE id = 'org_id_here';
```

3. **Reiniciar servidor** para que tome los cambios.

## Limitaciones Conocidas

1. **Sin adjuntos**: Solo texto plano (MVP)
2. **Sin "typing indicator"**: No hay indicador de "escribiendo..."
3. **Sin notificaciones push**: Solo tiempo real si la app está abierta
4. **Sin grupos**: Solo conversaciones 1:1
5. **Sin edición de mensajes**: Solo soft-delete (futuro)
6. **Rate limiter en memoria**: Para producción considerar Redis

## Próximas Mejoras

- [ ] Adjuntos de archivos e imágenes
- [ ] Indicador "escribiendo..."
- [ ] Notificaciones push (Web Push API)
- [ ] Edición de mensajes
- [ ] Mensajes de voz
- [ ] Reacciones a mensajes (emojis)
- [ ] Búsqueda de mensajes
- [ ] Archivar conversaciones
- [ ] Bloquear usuarios
- [ ] Grupos/canales

## Troubleshooting

### SSE no conecta

1. Verificar que el navegador soporta EventSource (todos los modernos sí)
2. Revisar consola del navegador por errores
3. Verificar que el proxy (si hay) no está bloqueando SSE
4. El sistema caerá automáticamente a polling después de 5 intentos

### Mensajes no llegan en tiempo real

1. Verificar que `isConnected: true` en la UI
2. Revisar logs del servidor: `[SSE] Nueva conexión: ...`
3. Si está en modo polling, los mensajes llegarán cada 10s
4. Verificar feature flag habilitado en la organización

### Rate limit excedido

1. Mensaje: "Demasiados mensajes. Intenta de nuevo más tarde."
2. Esperar el tiempo indicado en `retryAfter`
3. Ajustar límites en `/src/lib/chat/rate-limiter.ts` si es necesario

### Migración pendiente

El comando `prisma migrate dev` puede fallar por problemas de red con binarios de Prisma.

**Solución alternativa**:

```bash
# Sincronizar schema sin perder datos
npx prisma db push

# Luego crear migración manualmente cuando la red funcione
npx prisma migrate dev --name add_chat_module
```

## Logs y Monitoreo

### Logs del servidor

```
[SSE] Nueva conexión: org:user (Total: X)
[SSE] Cliente desconectado: user
[SSE] Stream cancelado para usuario user
[API] Error en POST /api/chat/messages: ...
```

### Métricas disponibles

```typescript
// Conexiones SSE activas
sseManager.getStats();
// { totalConnections: 10, connectionsByOrg: { "org1": 5, "org2": 5 } }

// Rate limiter
chatRateLimiter.getStats();
// { totalUsers: 8, maxRequests: 10, windowMs: 10000 }
```

## Testing

### Test manual

1. Login con dos usuarios diferentes en dos navegadores
2. Ir a `/dashboard/chat` en ambos
3. Usuario A inicia chat con Usuario B
4. Enviar mensajes en ambas direcciones
5. Verificar que llegan en tiempo real
6. Verificar indicador "Conectado (Tiempo real)"

### Test de reconnection

1. Abrir `/dashboard/chat`
2. Abrir DevTools → Network → cerrar conexión SSE
3. Verificar que se reconecta automáticamente
4. Después de 5 intentos, debe caer a polling

### Test de rate limiting

1. Enviar 11 mensajes rápidamente
2. El mensaje 11 debe fallar con error "Demasiados mensajes"
3. Esperar 10 segundos y volver a intentar

## Estructura de Archivos

```
src/
├── app/
│   ├── api/
│   │   └── chat/
│   │       ├── conversations/
│   │       │   ├── [id]/
│   │       │   │   └── messages/
│   │       │   │       └── route.ts
│   │       │   └── route.ts
│   │       ├── messages/
│   │       │   ├── read/
│   │       │   │   └── route.ts
│   │       │   └── route.ts
│   │       ├── stream/
│   │       │   └── route.ts
│   │       └── users/
│   │           └── search/
│   │               └── route.ts
│   └── (main)/
│       └── dashboard/
│           └── chat/
│               ├── page.tsx
│               └── _components/
│                   ├── chat-container.tsx
│                   ├── conversations-list.tsx
│                   ├── conversation-view.tsx
│                   └── new-chat-dialog.tsx
├── hooks/
│   └── use-chat-stream.ts
├── lib/
│   └── chat/
│       ├── types.ts
│       ├── utils.ts
│       ├── rate-limiter.ts
│       └── sse-manager.ts
├── server/
│   └── actions/
│       └── chat.ts
└── navigation/
    └── sidebar/
        └── sidebar-items-translated.tsx
```

## Créditos

Desarrollado siguiendo las mejores prácticas de:

- Next.js 15 App Router
- React Server Components
- Server-Sent Events (SSE)
- Multi-tenant architecture
- shadcn/ui components

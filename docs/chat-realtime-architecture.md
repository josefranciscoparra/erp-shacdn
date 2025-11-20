# Arquitectura de Chat en Tiempo Real - TimeNow ERP

## 📋 Resumen Ejecutivo

Este documento describe la arquitectura del sistema de chat 1:1 en tiempo real de TimeNow, las decisiones técnicas tomadas, y la estrategia de escalado para soportar desde 100 hasta 50.000+ usuarios activos simultáneos.

**Decisión Clave**: **SSE Global montado en el layout del dashboard** para notificaciones en tiempo real de mensajes no leídos, visible desde cualquier módulo de la aplicación.

---

## 🎯 Objetivos del Sistema

1. **UX de Primera Categoría**: El usuario siempre sabe si tiene mensajes nuevos, sin necesidad de entrar al módulo de chat
2. **Rendimiento Óptimo**: Sin polling, sin queries innecesarias, sin re-renders masivos
3. **Escalabilidad Clara**: Camino definido desde 100 hasta 50.000+ usuarios concurrentes
4. **Arquitectura Profesional**: Siguiendo patrones de Slack, Linear, Notion

---

## 🏗️ Arquitectura Actual (Fase 1)

### Stack Técnico

- **Backend**: Next.js 15 Server Actions + Prisma + PostgreSQL
- **Realtime**: Server-Sent Events (SSE)
- **Estado Frontend**: Zustand para estado global + React local state
- **UI**: shadcn/ui + Tailwind CSS

### Componentes Clave

```
┌─────────────────────────────────────────────────────────────┐
│                    Dashboard Layout                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  useChatStream() - CONEXIÓN SSE GLOBAL (1 por pestaña)│ │
│  │  • onMessage → incrementa contador                     │ │
│  │  • onConversationRead → decrementa contador            │ │
│  │  • Actualiza: chat-unread-store (Zustand)             │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  Sidebar    │  │  Chat Page   │  │  Otros Módulos   │   │
│  │  - Lee      │  │  - Lee       │  │  (Fichajes,      │   │
│  │    store    │  │    store     │  │   Gastos, etc.)  │   │
│  │  - Muestra  │  │  - Gestiona  │  │                  │   │
│  │    badge    │  │    mensajes  │  │                  │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
           │                           │
           ▼                           ▼
   ┌───────────────┐         ┌─────────────────┐
   │  Zustand      │         │  Backend        │
   │  Store        │◄────────│  SSE Manager    │
   │  (Global)     │         │  + Prisma       │
   └───────────────┘         └─────────────────┘
```

### Flujo de Datos

#### 1. **Usuario A envía mensaje a Usuario B**

```
1. Usuario A: sendMessage() → Server Action
2. Backend:
   - INSERT en Message
   - UPDATE Conversation (incrementa unreadCountUserB)
   - SSE broadcast a Usuario B
3. Usuario B (cualquier página del dashboard):
   - Recibe evento SSE
   - Incrementa contador local (Zustand)
   - Sidebar muestra badge rojo
```

#### 2. **Usuario B abre conversación**

```
1. Usuario B: Click en conversación
2. Frontend:
   - Optimistic update: badge desaparece inmediatamente
   - Decrementa contador (Zustand)
3. Backend:
   - markConversationAsRead()
   - UPDATE Conversation (unreadCountUserB = 0)
   - SSE broadcast a otros dispositivos de B
```

---

## 📊 Estrategia de Escalado por Fases

### 🟢 **Fase 1: 100-5.000 usuarios activos/mes** (Actual)

**Conexiones Simultáneas Estimadas**: 20-500

**Infraestructura**:

- 1-2 instancias de Next.js en Render
- PostgreSQL (Plan Hobby o Basic)
- Sin capa de cache adicional

**Arquitectura**:

- SSE global en layout del dashboard
- Estado en Zustand (cliente)
- Queries directas a Postgres

**Costo Mensual**: ~$50-100

**Métricas a Vigilar**:

- ✅ Conexiones SSE activas < 100 por instancia
- ✅ Latencia de eventos < 100ms P95
- ✅ CPU < 70% en instancias
- ✅ Re-conexiones automáticas funcionan

**Cuándo Escalar**: Cuando tengas >500 conexiones simultáneas o CPU >70% sostenido

---

### 🟡 **Fase 2: 5.000-50.000 usuarios activos/mes**

**Conexiones Simultáneas Estimadas**: 500-5.000

**Infraestructura Necesaria**:

- 5-10 instancias de Next.js con Load Balancer
- PostgreSQL (Plan Pro)
- **Redis Pub/Sub** para distribuir eventos entre instancias
- Sticky sessions o estado compartido

**Cambios en Arquitectura**:

```typescript
// Backend: En lugar de sseManager.broadcast() directo
// Publicar en Redis Pub/Sub

await redis.publish(
  "chat:new_message",
  JSON.stringify({
    userId: receiverId,
    conversationId,
    message,
  }),
);

// Cada instancia escucha Redis y notifica a sus conexiones SSE
redis.subscribe("chat:new_message", (message) => {
  const data = JSON.parse(message);
  sseManager.sendMessageToUser(data.userId, data.orgId, data.message);
});
```

**Frontend**: **NO CAMBIA** (sigue usando el mismo SSE)

**Costo Mensual**: ~$300-500

**Métricas a Vigilar**:

- ✅ Distribución de conexiones balanceada
- ✅ Latencia Redis < 10ms
- ✅ Eventos distribuidos correctamente entre instancias

**Cuándo Escalar**: Cuando tengas >5.000 conexiones o necesites más control/features avanzadas

---

### 🔴 **Fase 3: 50.000+ usuarios activos/mes** ("Problema Bonito")

**Conexiones Simultáneas Estimadas**: 5.000-50.000+

**Infraestructura Necesaria**:

- Microservicio dedicado de realtime
- Cluster de WebSockets con Redis
- Posible CDN/Edge computing para baja latencia global
- O servicio gestionado (Pusher, Ably, Supabase Realtime)

**Cambios en Arquitectura**:

- Separar servicio de realtime del backend principal
- Posible migración de SSE a WebSockets (bidi)
- Sharding por organización para distribución
- Métricas avanzadas (Grafana, Datadog)

**Frontend**: Cambios mínimos (solo URL de conexión o biblioteca de cliente)

**Costo Mensual**: $1.000-3.000+ (pero ya tienes revenue para pagarlo)

---

## ⚠️ Antipatrones a Evitar (CRÍTICO)

### 🔴 **Antipatrón 1: Múltiples Conexiones SSE**

❌ **MAL**:

```typescript
// chat-container.tsx
useChatStream(); // ← Conexión 1

// sidebar.tsx
useChatStream(); // ← Conexión 2

// notifications.tsx
useChatStream(); // ← Conexión 3

// = 3 conexiones por usuario = DESASTRE
```

✅ **BIEN**:

```typescript
// dashboard/layout.tsx
useChatStream(); // ← UNA SOLA CONEXIÓN

// Todos los demás componentes:
const totalUnread = useChatUnreadStore((state) => state.totalUnreadCount);
```

---

### 🔴 **Antipatrón 2: Queries en Handlers de SSE**

❌ **MAL**:

```typescript
onMessage: async (message) => {
  // ¡NO HACER ESTO!
  const conversations = await fetch("/api/chat/conversations");
  const users = await fetch("/api/users");
  setConversations(conversations);
};
```

✅ **BIEN**:

```typescript
onMessage: (message) => {
  // Solo actualizar estado local, sin fetches
  chatUnreadStore.getState().incrementUnreadCount();
};
```

---

### 🔴 **Antipatrón 3: Re-renders Masivos**

❌ **MAL**:

```typescript
onMessage: () => {
  // Re-renderiza TODA la lista de conversaciones
  setConversations([...allConversations]);
};
```

✅ **BIEN**:

```typescript
onMessage: (message) => {
  // Solo actualiza la conversación específica
  setConversations((prev) =>
    prev.map((c) => (c.id === message.conversationId ? { ...c, unreadCount: c.unreadCount + 1 } : c)),
  );
};
```

---

## 🔧 Configuración y Mantenimiento

### Variables de Entorno

```bash
# Chat habilitado por organización (DB)
# No hay variable de entorno, se controla desde Settings

# Timeout de heartbeat SSE (30s)
SSE_HEARTBEAT_INTERVAL=30000
```

### Monitoreo Recomendado

**Fase 1** (actual):

- Logs de consola suficientes
- Revisar métricas de Render/Vercel

**Fase 2**:

- Añadir `winston` o `pino` para logs estructurados
- Métricas de SSE: conexiones activas, eventos/segundo
- Alertas si conexiones > 1000 por instancia

**Fase 3**:

- Stack completo de observabilidad (Grafana, Datadog, etc.)

---

## 📈 Métricas de Éxito

### KPIs de Rendimiento

| Métrica                    | Target     | Alerta  |
| -------------------------- | ---------- | ------- |
| **Latencia SSE**           | < 50ms P95 | > 100ms |
| **Conexiones/instancia**   | < 100      | > 200   |
| **Re-conexiones exitosas** | > 99%      | < 95%   |
| **CPU promedio**           | < 60%      | > 80%   |
| **Memoria promedio**       | < 70%      | > 85%   |

### KPIs de UX

| Métrica                      | Target    |
| ---------------------------- | --------- |
| **Tiempo hasta ver mensaje** | < 1s      |
| **Badge actualizado**        | Inmediato |
| **Sin pérdida de mensajes**  | 100%      |

---

## 🚀 Roadmap de Mejoras Futuras

### Corto Plazo (1-3 meses)

- [x] SSE global en layout
- [x] Indicador en sidebar
- [ ] Notificaciones push (PWA)
- [ ] Sonido al recibir mensaje

### Medio Plazo (3-6 meses)

- [ ] Typing indicators ("Usuario está escribiendo...")
- [ ] Envío de archivos/imágenes
- [ ] Emojis/reacciones
- [ ] Búsqueda de mensajes

### Largo Plazo (6-12 meses)

- [ ] Redis Pub/Sub (Fase 2)
- [ ] Chats grupales (3+ usuarios)
- [ ] Videollamadas (integración externa)
- [ ] Encriptación E2E

---

## 📚 Referencias y Recursos

### Artículos Técnicos

- [MDN: Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
- [Next.js Streaming and SSE](https://nextjs.org/docs/app/building-your-application/routing/route-handlers#streaming)

### Ejemplos de Arquitectura Similar

- Linear (Chat + Issues)
- Slack (Chat empresarial)
- Notion (Comentarios en tiempo real)

---

## 👥 Decisiones y Razones

### ¿Por qué SSE en lugar de WebSockets?

**SSE**:

- ✅ Más simple (HTTP estándar)
- ✅ Auto-reconnect nativo
- ✅ Compatible con HTTP/2
- ✅ Suficiente para chat 1:1 (unidireccional servidor→cliente)

**WebSockets**:

- ⚠️ Más complejo (protocolo custom)
- ⚠️ Requiere sticky sessions o Redis
- ✅ Bidireccional (útil para typing indicators)
- ✅ Mejor para latencia ultra-baja

**Conclusión**: SSE para Fase 1 y 2, evaluar WebSockets en Fase 3 si es necesario.

---

### ¿Por qué Zustand en lugar de Context API?

- ✅ Mejor rendimiento (selectores granulares)
- ✅ Fuera del árbol de React (sin re-renders innecesarios)
- ✅ DevTools excelentes
- ✅ Menos boilerplate

---

## 🔒 Seguridad

### Autenticación SSE

- ✅ Cookies de sesión (httpOnly, secure)
- ✅ Validación de sesión en cada conexión
- ✅ Auto-cierre si sesión expira

### Autorización

- ✅ Solo conversaciones donde el usuario es participante
- ✅ Validación en backend en cada operación
- ✅ No se envían eventos a usuarios no autorizados

---

## 📝 Changelog

| Fecha      | Versión | Cambios                                            |
| ---------- | ------- | -------------------------------------------------- |
| 2025-01-11 | 1.0     | Documento inicial - SSE global + indicador sidebar |
| 2025-01-11 | 1.1     | Sistema de contadores de no leídos implementado    |

---

## 🤝 Contribuidores y Contacto

**Mantenedor Principal**: Equipo TimeNow
**Última Actualización**: 11 de Enero de 2025
**Versión del Sistema**: 1.0

---

## 📌 Resumen de Decisiones Técnicas

1. ✅ **SSE Global**: Montado en `/dashboard/layout.tsx`, una conexión por pestaña
2. ✅ **Contadores Denormalizados**: `unreadCountUserA` y `unreadCountUserB` en tabla `Conversation`
3. ✅ **Estado Global**: Zustand para `totalUnreadCount`, compartido por toda la app
4. ✅ **Handlers Ligeros**: Sin queries, sin fetches, solo actualizar contadores
5. ✅ **Optimistic Updates**: UI responde antes de confirmación del servidor
6. ✅ **Escalado Horizontal**: Clear path de 100 a 50.000+ usuarios

**Esto NO es over-engineering, es arquitectura profesional con camino claro de escalado** 🚀

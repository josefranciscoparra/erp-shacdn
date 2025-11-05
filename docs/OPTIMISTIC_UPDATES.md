# Actualizaciones Optimistas (Optimistic Updates)

## 📚 Índice

1. [¿Qué es una actualización optimista?](#qué-es-una-actualización-optimista)
2. [El problema: Parpadeo en la UI](#el-problema-parpadeo-en-la-ui)
3. [La solución: Optimistic Updates](#la-solución-optimistic-updates)
4. [Patrón de implementación](#patrón-de-implementación)
5. [Ejemplos en el proyecto](#ejemplos-en-el-proyecto)
6. [Cuándo aplicar este patrón](#cuándo-aplicar-este-patrón)
7. [Casos de uso comunes](#casos-de-uso-comunes)
8. [Manejo de errores](#manejo-de-errores)

---

## ¿Qué es una actualización optimista?

Una **actualización optimista** es un patrón de UI que actualiza la interfaz inmediatamente cuando el usuario realiza una acción, **sin esperar** la confirmación del servidor. La aplicación "asume" que la operación será exitosa y actualiza la UI de inmediato para mejorar la experiencia del usuario.

### Ventajas

- ✅ **Respuesta instantánea**: La UI reacciona inmediatamente a las acciones del usuario
- ✅ **Sin parpadeos**: No hay recargas completas de componentes
- ✅ **Mejor UX**: Sensación de aplicación más rápida y fluida
- ✅ **Menos latencia percibida**: El usuario no espera al servidor

### Desventajas

- ⚠️ Complejidad adicional en el manejo de errores
- ⚠️ Puede mostrar estado incorrecto temporalmente si el servidor rechaza la operación

---

## El problema: Parpadeo en la UI

### ❌ Patrón incorrecto (causa parpadeo)

```typescript
const handleAction = async () => {
  try {
    // 1. Llamada al servidor (tarda 500ms-2s)
    await updateDataOnServer(data);

    // 2. Toast de éxito
    toast.success("Actualizado correctamente");

    // 3. RECARGA COMPLETA desde el servidor (parpadeo aquí)
    await loadAllData();
  } catch (error) {
    toast.error("Error al actualizar");
  }
};
```

**Problemas:**
1. El usuario ve un delay de 500ms-2s antes de ver cambios
2. `loadAllData()` recarga TODO desde el servidor → parpadeo visible
3. Experiencia lenta y poco responsive

---

## La solución: Optimistic Updates

### ✅ Patrón correcto (sin parpadeo)

```typescript
const handleAction = async () => {
  // 1. ACTUALIZAR UI INMEDIATAMENTE (sin esperar al servidor)
  setData((prev) => ({
    ...prev,
    // ... cambios que queremos ver
  }));

  try {
    // 2. Llamada al servidor en background
    await updateDataOnServer(data);

    // 3. Toast de éxito
    toast.success("Actualizado correctamente");

    // 4. NO recargar (opcional: solo si es necesario)
    // await loadAllData(); // ❌ NO HACER
  } catch (error) {
    // 5. Si falla, recargar para obtener estado correcto del servidor
    toast.error("Error al actualizar");
    await loadAllData(); // Solo en caso de error
  }
};
```

**Ventajas:**
1. ⚡ **Respuesta instantánea**: La UI se actualiza en 0ms
2. 🚫 **Sin parpadeo**: No hay recargas completas
3. 🎯 **Mejor UX**: El usuario ve el cambio inmediatamente

---

## Patrón de implementación

### Template básico

```typescript
const handleOptimisticUpdate = async (newValue: T) => {
  // 1. Guardar estado anterior (para revertir en caso de error)
  const previousState = currentState;

  // 2. Actualizar UI inmediatamente (optimistic)
  setState(newValue);

  try {
    // 3. Llamar al servidor en background
    await serverAction(newValue);

    // 4. Toast de éxito
    toast.success("Actualizado correctamente");

    // 5. (Opcional) Actualizar solo si es necesario
    // await refreshOnlyIfNeeded();

  } catch (error) {
    // 6. En caso de error: revertir o recargar
    setState(previousState); // Opción A: Revertir
    // O
    await loadFromServer(); // Opción B: Recargar del servidor

    // 7. Toast de error
    toast.error("Error al actualizar");
  }
};
```

---

## Ejemplos en el proyecto

### Ejemplo 1: Marcar todas las notificaciones como leídas

**Archivo:** `/src/app/(main)/dashboard/notifications/page.tsx`

```typescript
const handleMarkAllAsRead = async () => {
  // 1. Actualización optimista: actualizar estado local primero
  setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  setTotals((prev) => ({ ...prev, unread: 0 }));

  try {
    // 2. Llamar al servidor en background
    await markAllNotificationsAsRead();
    toast.success("Todas las notificaciones marcadas como leídas");

    // 3. Solo recargar si estamos en modo "solo no leídas"
    if (filterMode === "unread") {
      await loadNotifications(true, pagination.page, pagination.pageSize);
    }
  } catch {
    // 4. En caso de error, recargar para obtener el estado correcto
    toast.error("Error al marcar notificaciones como leídas");
    await loadNotifications(filterMode === "unread", pagination.page, pagination.pageSize);
  }
};
```

**Resultado:**
- ⚡ Los iconos Mail → MailOpen cambian **instantáneamente**
- 🚫 **Sin parpadeo** en la tabla
- 🎯 La UI responde en **0ms**

### Ejemplo 2: Toggle leído/no leído individual

**Archivo:** `/src/app/(main)/dashboard/notifications/page.tsx`

```typescript
const handleToggleRead = useCallback(
  async (notification: Notification, event: React.MouseEvent) => {
    event.stopPropagation();

    // 1. Actualización optimista: actualizar estado local primero
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, isRead: !n.isRead } : n))
    );
    setTotals((prev) => ({
      ...prev,
      unread: notification.isRead ? prev.unread + 1 : Math.max(prev.unread - 1, 0),
    }));

    try {
      // 2. Llamar al servidor en background
      if (notification.isRead) {
        await markNotificationAsUnread(notification.id);
        toast.success("Notificación marcada como no leída");
      } else {
        await markNotificationAsRead(notification.id);
        toast.success("Notificación marcada como leída");
      }
    } catch {
      // 3. En caso de error, recargar para obtener el estado correcto
      toast.error("Error al actualizar notificación");
      await loadNotifications(filterMode === "unread", pagination.page, pagination.pageSize);
    }
  },
  [filterMode, loadNotifications, pagination.page, pagination.pageSize],
);
```

**Resultado:**
- ⚡ El icono cambia **inmediatamente** al hacer click
- 🚫 **Sin delay** esperando al servidor
- 🎯 Experiencia fluida y responsive

### Ejemplo 3: Widget de fichajes (Quick Clock)

**Archivo:** `/src/components/time-tracking/quick-clock-widget.tsx`

```typescript
const updateLiveMinutes = () => {
  if (currentStatus === "CLOCKED_IN" && todaySummary?.timeEntries) {
    const now = new Date();
    const entries = todaySummary.timeEntries;
    const lastWorkStart = [...entries]
      .reverse()
      .find((e) => e.entryType === "CLOCK_IN" || e.entryType === "BREAK_END");

    if (lastWorkStart) {
      const startTime = new Date(lastWorkStart.timestamp);
      const secondsFromStart = (now.getTime() - startTime.getTime()) / 1000;
      const minutesFromStart = secondsFromStart / 60;
      const baseMinutes = Number(todaySummary.totalWorkedMinutes || 0);

      // Actualización optimista cada segundo
      setLiveWorkedMinutes(baseMinutes + minutesFromStart);
      return;
    }
  }

  setLiveWorkedMinutes(todaySummary?.totalWorkedMinutes ?? 0);
};

// Actualizar cada segundo sin llamadas al servidor
useEffect(() => {
  updateLiveMinutes();
  const interval = setInterval(updateLiveMinutes, 1000);
  return () => clearInterval(interval);
}, [currentStatus, todaySummary, setLiveWorkedMinutes]);
```

**Resultado:**
- ⚡ El contador se actualiza **cada segundo** sin llamadas al servidor
- 🚫 **Sin parpadeo** en el widget
- 🎯 Experiencia fluida similar a un cronómetro nativo

---

## Cuándo aplicar este patrón

### ✅ Aplicar cuando:

1. **Operaciones de actualización simple**
   - Marcar/desmarcar items
   - Toggle de estados (activo/inactivo)
   - Cambios de propiedades individuales

2. **Alta frecuencia de interacción**
   - Botones que se clickean repetidamente
   - Contadores en tiempo real
   - Estados de UI que cambian mucho

3. **Operaciones que casi siempre tienen éxito**
   - Operaciones locales (marcar como leído)
   - Validaciones simples
   - Sin lógica compleja en el servidor

4. **Cuando el parpadeo es muy visible**
   - Tablas con muchas filas
   - Listas largas
   - Componentes con animaciones

### ❌ NO aplicar cuando:

1. **Operaciones complejas con validaciones**
   - Pagos
   - Envío de emails
   - Procesamiento de archivos grandes

2. **Operaciones que pueden fallar frecuentemente**
   - Validaciones de negocio complejas
   - Dependencias de datos externos
   - Operaciones con permisos estrictos

3. **Cambios que afectan múltiples entidades**
   - Cascadas de actualizaciones
   - Recálculos complejos
   - Sincronizaciones de datos

4. **Operaciones críticas**
   - Eliminaciones permanentes
   - Cambios de contraseña
   - Transacciones financieras

---

## Casos de uso comunes

### 1. Marcar como leído/no leído

```typescript
const toggleRead = async (id: string, currentState: boolean) => {
  // Optimistic
  setItems(prev => prev.map(item =>
    item.id === id ? { ...item, isRead: !currentState } : item
  ));

  try {
    await api.toggleRead(id);
  } catch {
    await reloadItems(); // Revertir en caso de error
  }
};
```

### 2. Activar/desactivar items

```typescript
const toggleActive = async (id: string, currentState: boolean) => {
  // Optimistic
  setItems(prev => prev.map(item =>
    item.id === id ? { ...item, active: !currentState } : item
  ));

  try {
    await api.toggleActive(id);
    toast.success(currentState ? "Desactivado" : "Activado");
  } catch {
    await reloadItems();
    toast.error("Error al actualizar");
  }
};
```

### 3. Actualizar contador en tiempo real

```typescript
useEffect(() => {
  const updateCounter = () => {
    if (isActive) {
      const elapsed = Date.now() - startTime;
      setCounter(elapsed / 1000); // Optimistic update cada frame
    }
  };

  const interval = setInterval(updateCounter, 1000);
  return () => clearInterval(interval);
}, [isActive, startTime]);
```

### 4. Drag & Drop / Reordenar items

```typescript
const handleReorder = async (newOrder: Item[]) => {
  // Optimistic: mostrar nuevo orden inmediatamente
  setItems(newOrder);

  try {
    await api.updateOrder(newOrder.map(item => item.id));
  } catch {
    // Revertir si falla
    await reloadItems();
    toast.error("Error al reordenar");
  }
};
```

### 5. Likes / Favoritos

```typescript
const toggleLike = async (id: string, isLiked: boolean) => {
  // Optimistic
  setItems(prev => prev.map(item =>
    item.id === id
      ? { ...item, isLiked: !isLiked, likeCount: item.likeCount + (isLiked ? -1 : 1) }
      : item
  ));

  try {
    await api.toggleLike(id);
  } catch {
    await reloadItems();
  }
};
```

---

## Manejo de errores

### Estrategia 1: Revertir al estado anterior

```typescript
const handleUpdate = async (newValue: T) => {
  const previousValue = currentValue;

  // Optimistic
  setValue(newValue);

  try {
    await api.update(newValue);
  } catch {
    // Revertir
    setValue(previousValue);
    toast.error("Error al actualizar");
  }
};
```

**Ventajas:**
- ✅ No hace llamadas adicionales al servidor
- ✅ Más rápido

**Desventajas:**
- ⚠️ Puede quedarse desincronizado si hubo otros cambios
- ⚠️ No refleja el estado real del servidor

### Estrategia 2: Recargar desde el servidor

```typescript
const handleUpdate = async (newValue: T) => {
  // Optimistic
  setValue(newValue);

  try {
    await api.update(newValue);
  } catch {
    // Recargar desde servidor
    await loadFromServer();
    toast.error("Error al actualizar");
  }
};
```

**Ventajas:**
- ✅ Garantiza sincronización con el servidor
- ✅ Estado siempre correcto

**Desventajas:**
- ⚠️ Hace una llamada adicional
- ⚠️ Puede tardar más

### Estrategia 3: Híbrida (recomendada)

```typescript
const handleUpdate = async (newValue: T) => {
  const previousValue = currentValue;

  // Optimistic
  setValue(newValue);

  try {
    const serverResponse = await api.update(newValue);
    // Actualizar con respuesta del servidor (por si cambió algo)
    setValue(serverResponse.data);
  } catch (error) {
    // Si es error de red, revertir
    if (error.code === 'NETWORK_ERROR') {
      setValue(previousValue);
    } else {
      // Si es error de validación, recargar
      await loadFromServer();
    }
    toast.error("Error al actualizar");
  }
};
```

**Ventajas:**
- ✅ Maneja diferentes tipos de error apropiadamente
- ✅ Balancea velocidad y precisión

---

## Checklist de implementación

Cuando implementes actualizaciones optimistas, asegúrate de:

- [ ] **Actualizar UI primero** antes de llamar al servidor
- [ ] **Actualizar todos los estados relacionados** (ej: totales, contadores)
- [ ] **Manejar errores apropiadamente** (revertir o recargar)
- [ ] **Mostrar feedback al usuario** (toast de éxito/error)
- [ ] **Usar `useCallback`** si la función se pasa como dependencia
- [ ] **Actualizar tipos TypeScript** correctamente
- [ ] **NO recargar** a menos que sea estrictamente necesario
- [ ] **Probar casos de error** (desconectar red, errores del servidor)

---

## Referencias en el proyecto

### Implementaciones existentes

1. **Notificaciones** → `/src/app/(main)/dashboard/notifications/page.tsx`
   - Marcar todas como leídas
   - Toggle individual leído/no leído

2. **Quick Clock Widget** → `/src/components/time-tracking/quick-clock-widget.tsx`
   - Contador en tiempo real
   - Actualización optimista del tiempo trabajado

### Server Actions relacionados

- `/src/server/actions/notifications.ts` - Acciones de notificaciones
- `/src/stores/notifications-store.tsx` - Store con optimistic updates

---

## Ejemplos de código completos

### Template completo para copiar/pegar

```typescript
import { useCallback, useState } from "react";
import { toast } from "sonner";

interface Item {
  id: string;
  name: string;
  isActive: boolean;
}

export function MyComponent() {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Función para recargar datos (solo usar en caso de error)
  const loadItems = async () => {
    setIsLoading(true);
    try {
      const data = await fetch("/api/items").then(r => r.json());
      setItems(data);
    } finally {
      setIsLoading(false);
    }
  };

  // Actualización optimista con manejo de errores
  const handleToggleActive = useCallback(async (id: string, currentState: boolean) => {
    // 1. Actualización optimista (UI primero)
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, isActive: !currentState } : item
      )
    );

    try {
      // 2. Servidor en background
      await fetch(`/api/items/${id}/toggle`, { method: "POST" });

      // 3. Toast de éxito
      toast.success(currentState ? "Desactivado" : "Activado");

    } catch {
      // 4. En caso de error, recargar
      toast.error("Error al actualizar");
      await loadItems();
    }
  }, []);

  return (
    <div>
      {items.map(item => (
        <div key={item.id}>
          <span>{item.name}</span>
          <button onClick={() => handleToggleActive(item.id, item.isActive)}>
            {item.isActive ? "Desactivar" : "Activar"}
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

## Conclusión

Las **actualizaciones optimistas** son una técnica esencial para crear interfaces fluidas y responsive. Cuando se implementan correctamente:

- ✅ Eliminan el parpadeo de la UI
- ✅ Mejoran la percepción de velocidad
- ✅ Aumentan la satisfacción del usuario
- ✅ Reducen la sensación de latencia

Aplica este patrón en cualquier operación de actualización donde la UI necesite responder **inmediatamente** a las acciones del usuario.

---

**Última actualización:** 2025-01-05
**Mantenedores:** Equipo de desarrollo ERP

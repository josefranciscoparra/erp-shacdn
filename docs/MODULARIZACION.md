# Sistema de Modularización de Features

Documentación del sistema de gestión de módulos/features habilitados por organización, diseñado para venta de aplicación por módulos.

## 📋 Índice

- [Visión General](#visión-general)
- [Arquitectura](#arquitectura)
- [Cómo Funciona](#cómo-funciona)
- [Añadir un Nuevo Módulo](#añadir-un-nuevo-módulo)
- [Troubleshooting](#troubleshooting)
- [Mejores Prácticas](#mejores-prácticas)

---

## Visión General

### Problema que resuelve

Antes de este sistema, cada feature habilitada por organización hacía una llamada individual a la API desde el cliente:

```tsx
// ❌ ANTES: Delay de 1-2 segundos
const { chatEnabled } = useChatEnabled(); // Fetch individual
const { documentsEnabled } = useDocumentsEnabled(); // Otro fetch
```

Esto causaba:

- **Delay visual** en el sidebar (items aparecían progresivamente)
- **Múltiples API calls** (uno por feature)
- **No escalable** para modelo de venta por módulos

### Solución implementada

Sistema centralizado que:

- ✅ **Carga features server-side** (cero delay en cliente)
- ✅ **Inicialización síncrona** (antes del primer render)
- ✅ **Un solo store Zustand** para todos los módulos
- ✅ **Escalable** (añadir módulos = añadir 1 campo)

---

## Arquitectura

### Componentes del sistema

```
┌─────────────────────────────────────────────────────────────┐
│  1. DATABASE (PostgreSQL)                                   │
│     Organization.chatEnabled                                │
│     Organization.documentsEnabled (futuro)                  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  2. SERVER LAYOUT (Next.js Server Component)                │
│     /dashboard/layout.tsx                                   │
│     - Fetch features desde DB                               │
│     - Pasa a FeaturesInitializer                            │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  3. FEATURES INITIALIZER (Client Component)                 │
│     FeaturesInitializer recibe initialFeatures             │
│     - Inicializa store SÍNCRONAMENTE                        │
│     - Antes del primer render                               │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  4. ZUSTAND STORE                                           │
│     organization-features-store.ts                          │
│     - features: { chatEnabled, ... }                        │
│     - Persiste durante toda la sesión                       │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  5. COMPONENTES CLIENTE                                     │
│     Sidebar, Settings, etc.                                 │
│     - Leen del store                                        │
│     - Sin delay, valores inmediatos                         │
└─────────────────────────────────────────────────────────────┘
```

### Archivos clave

| Archivo                                                         | Propósito                                     |
| --------------------------------------------------------------- | --------------------------------------------- |
| `src/stores/organization-features-store.ts`                     | Store Zustand con todos los features          |
| `src/app/(main)/dashboard/layout.tsx`                           | Fetch server-side de features                 |
| `src/app/(main)/dashboard/_components/features-initializer.tsx` | Inicialización síncrona del store             |
| `src/app/api/organization/features/route.ts`                    | Endpoint API (opcional, para revalidación)    |
| `src/hooks/use-init-features.ts`                                | Hook de inicialización (no usado actualmente) |

---

## Cómo Funciona

### Flujo de ejecución

```
1. Usuario hace login
   ↓
2. Next.js renderiza /dashboard/layout.tsx (SERVER)
   ↓
3. Layout hace query a PostgreSQL:
   SELECT chatEnabled FROM Organization WHERE id = ?
   ↓
4. Layout pasa features a <FeaturesInitializer initialFeatures={{chatEnabled: true}} />
   ↓
5. FeaturesInitializer se renderiza (CLIENT):
   - Ejecuta SÍNCRONAMENTE: useOrganizationFeaturesStore.getState().setFeatures(...)
   - Antes de que React renderice el resto
   ↓
6. Sidebar se renderiza:
   - Lee: useOrganizationFeaturesStore(state => state.features.chatEnabled)
   - Valor YA está disponible (true)
   - ✅ Renderiza "Mensajes" inmediatamente
```

### Inicialización síncrona explicada

**Por qué es importante:**

```tsx
// ❌ ASYNC (useEffect) - Causa delay
useEffect(() => {
  setFeatures(initialFeatures); // Se ejecuta DESPUÉS del primer render
}, []);

// ✅ SYNC (render directo) - Sin delay
if (!initialized.current) {
  useOrganizationFeaturesStore.getState().setFeatures(initialFeatures);
  // Se ejecuta DURANTE el primer render, ANTES de componentes hijos
  initialized.current = true;
}
```

**Resultado:**

- El sidebar lee `chatEnabled: true` desde el primer render
- Sin "salto visual" ni delay

---

## Añadir un Nuevo Módulo

### Ejemplo: Añadir módulo "Signatures"

#### Paso 1: Actualizar Prisma Schema

```prisma
model Organization {
  // ... campos existentes
  chatEnabled       Boolean @default(false)
  signaturesEnabled Boolean @default(false)  // ← NUEVO
}
```

```bash
npx prisma migrate dev --name add_signatures_module
```

#### Paso 2: Actualizar el Store

**Archivo:** `src/stores/organization-features-store.ts`

```typescript
export interface OrganizationFeatures {
  chatEnabled: boolean;
  signaturesEnabled: boolean; // ← NUEVO
}

const initialFeatures: OrganizationFeatures = {
  chatEnabled: false,
  signaturesEnabled: false, // ← NUEVO
};

// En fetchFeatures:
set({
  features: {
    chatEnabled: data.chatEnabled ?? false,
    signaturesEnabled: data.signaturesEnabled ?? false, // ← NUEVO
  },
  // ...
});
```

#### Paso 3: Actualizar Dashboard Layout

**Archivo:** `src/app/(main)/dashboard/layout.tsx`

```typescript
// Cargar features de la organización en el servidor
const org = await prisma.organization.findUnique({
  where: { id: session.user.orgId },
  select: {
    chatEnabled: true,
    signaturesEnabled: true, // ← NUEVO
  },
});

const orgFeatures = {
  chatEnabled: org?.chatEnabled ?? false,
  signaturesEnabled: org?.signaturesEnabled ?? false, // ← NUEVO
};
```

#### Paso 4: Actualizar API Endpoint (opcional)

**Archivo:** `src/app/api/organization/features/route.ts`

```typescript
const org = await prisma.organization.findUnique({
  where: { id: session.user.orgId },
  select: {
    chatEnabled: true,
    signaturesEnabled: true, // ← NUEVO
  },
});

return NextResponse.json({
  chatEnabled: org.chatEnabled ?? false,
  signaturesEnabled: org.signaturesEnabled ?? false, // ← NUEVO
});
```

#### Paso 5: Usar en componentes

**Ejemplo en sidebar:**

```tsx
export function useSidebarItems(): NavGroup[] {
  const chatEnabled = useOrganizationFeaturesStore((state) => state.features.chatEnabled);
  const signaturesEnabled = useOrganizationFeaturesStore(
    (state) => state.features.signaturesEnabled, // ← NUEVO
  );

  const allItems = [
    // ...
    ...(signaturesEnabled
      ? [
          {
            title: "Firmas Electrónicas",
            url: "/dashboard/signatures",
            icon: FileSignature,
          },
        ]
      : []),
  ];
}
```

**Ejemplo en settings:**

```tsx
export function SignaturesSettings() {
  const signaturesEnabled = useOrganizationFeaturesStore((state) => state.features.signaturesEnabled);

  if (!signaturesEnabled) {
    return <div>Módulo no disponible</div>;
  }

  return <div>Configuración de firmas...</div>;
}
```

---

## Troubleshooting

### Problema: Features aparecen con delay

**Síntomas:** Items del sidebar aparecen 1-2 segundos después de cargar la página.

**Causas posibles:**

1. Inicialización async (useEffect) en lugar de sync
2. Fetch desde cliente en lugar de server-side
3. Store no se inicializa antes del primer render

**Solución:**

- Verificar que `FeaturesInitializer` use `useRef` + render directo
- Verificar que `layout.tsx` haga fetch server-side
- No usar `useEffect` para inicialización

### Problema: Features no se actualizan después de cambio

**Síntomas:** Admin cambia `chatEnabled` pero usuario no ve el cambio sin relogin.

**Esto es esperado:** Los features se cargan UNA vez al hacer login y persisten durante la sesión.

**Soluciones:**

1. **Requerir relogin** (más seguro):

   ```tsx
   // En admin settings después de cambiar feature
   toast.success("Cambios guardados. Los usuarios verán los cambios al volver a iniciar sesión.");
   ```

2. **Revalidar sin relogin** (avanzado):
   ```tsx
   // Llamar desde cliente cuando admin cambia settings
   const fetchFeatures = useOrganizationFeaturesStore((state) => state.fetchFeatures);
   await fetchFeatures(); // Re-fetch desde /api/organization/features
   ```

### Problema: Store retorna valores por defecto (false)

**Síntomas:** `chatEnabled` siempre es `false` aunque en DB es `true`.

**Causas posibles:**

1. `FeaturesInitializer` no se montó
2. Inicialización no se ejecutó
3. Fetch server-side falló

**Debug:**

```tsx
// En layout.tsx, añadir log temporal
console.log("Features cargados:", orgFeatures);

// En FeaturesInitializer, añadir log temporal
console.log("Inicializando features:", initialFeatures);
```

---

## Mejores Prácticas

### 1. Nomenclatura consistente

```tsx
// ✅ CORRECTO: Sufijo "Enabled"
chatEnabled: boolean;
documentsEnabled: boolean;
signaturesEnabled: boolean;

// ❌ INCORRECTO: Inconsistente
hasChat: boolean;
documentsActive: boolean;
signaturesFeature: boolean;
```

### 2. Valores por defecto seguros

```tsx
// ✅ CORRECTO: Default false (opt-in)
const orgFeatures = {
  chatEnabled: org?.chatEnabled ?? false,
};

// ❌ INCORRECTO: Default true (puede activar módulos no pagados)
const orgFeatures = {
  chatEnabled: org?.chatEnabled ?? true,
};
```

### 3. Validación en endpoints

```tsx
// ✅ CORRECTO: Verificar feature antes de operar
export async function POST(req: Request) {
  const session = await auth();
  const org = await prisma.organization.findUnique({
    where: { id: session.user.orgId },
    select: { chatEnabled: true },
  });

  if (!org?.chatEnabled) {
    return NextResponse.json({ error: "Chat module not enabled" }, { status: 403 });
  }

  // ... lógica del endpoint
}
```

### 4. UI consistente para módulos deshabilitados

```tsx
// ✅ CORRECTO: Mensaje claro cuando módulo no está disponible
export function ChatPage() {
  const chatEnabled = useOrganizationFeaturesStore((state) => state.features.chatEnabled);

  if (!chatEnabled) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="Módulo no disponible"
        description="El módulo de chat no está habilitado en tu organización."
      />
    );
  }

  return <ChatContainer />;
}
```

### 5. TypeScript types centralizados

```tsx
// ✅ CORRECTO: Usar tipo exportado del store
import type { OrganizationFeatures } from "@/stores/organization-features-store";

function MyComponent(props: { features: OrganizationFeatures }) {
  // TypeScript garantiza que todos los features estén presentes
}
```

---

## Ventajas del sistema

### Para desarrollo

- ✅ **Escalable**: Añadir módulos = modificar 4 archivos
- ✅ **Type-safe**: TypeScript garantiza consistencia
- ✅ **Centralizado**: Una sola fuente de verdad
- ✅ **Testeable**: Fácil mockear features en tests

### Para ventas

- ✅ **Control granular**: Activar/desactivar módulos por organización
- ✅ **Migración sencilla**: Cambiar plan = UPDATE en DB
- ✅ **Sin código duplicado**: Misma base de código para todos

### Para usuarios

- ✅ **Performance**: Cero delay en UI
- ✅ **Consistencia**: UI siempre coherente
- ✅ **Experiencia fluida**: Sin "saltos" visuales

---

## Ejemplo completo: Módulo de Inventario

### 1. Base de datos

```prisma
model Organization {
  // ...
  inventoryEnabled Boolean @default(false)
}
```

```bash
npx prisma migrate dev --name add_inventory_module
```

### 2. Store

```typescript
// src/stores/organization-features-store.ts
export interface OrganizationFeatures {
  chatEnabled: boolean;
  inventoryEnabled: boolean;
}

const initialFeatures: OrganizationFeatures = {
  chatEnabled: false,
  inventoryEnabled: false,
};
```

### 3. Layout

```typescript
// src/app/(main)/dashboard/layout.tsx
const org = await prisma.organization.findUnique({
  where: { id: session.user.orgId },
  select: {
    chatEnabled: true,
    inventoryEnabled: true,
  },
});

const orgFeatures = {
  chatEnabled: org?.chatEnabled ?? false,
  inventoryEnabled: org?.inventoryEnabled ?? false,
};
```

### 4. Sidebar

```tsx
// src/navigation/sidebar/sidebar-items-translated.tsx
import { Package } from "lucide-react";

export function useSidebarItems() {
  const inventoryEnabled = useOrganizationFeaturesStore((state) => state.features.inventoryEnabled);

  const items = [
    // ...
    ...(inventoryEnabled
      ? [
          {
            title: "Inventario",
            url: "/dashboard/inventory",
            icon: Package,
            permission: "manage_inventory",
          },
        ]
      : []),
  ];
}
```

### 5. Página protegida

```tsx
// src/app/(main)/dashboard/inventory/page.tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function InventoryPage() {
  const session = await auth();

  const org = await prisma.organization.findUnique({
    where: { id: session.user.orgId },
    select: { inventoryEnabled: true },
  });

  if (!org?.inventoryEnabled) {
    redirect("/dashboard");
  }

  return <InventoryContainer />;
}
```

### 6. Settings toggle

```tsx
// src/app/(main)/dashboard/settings/_components/inventory-tab.tsx
"use client";

import { Switch } from "@/components/ui/switch";
import { useOrganizationFeaturesStore } from "@/stores/organization-features-store";

export function InventoryTab() {
  const inventoryEnabled = useOrganizationFeaturesStore((state) => state.features.inventoryEnabled);
  const fetchFeatures = useOrganizationFeaturesStore((state) => state.fetchFeatures);

  const handleToggle = async (enabled: boolean) => {
    await fetch("/api/admin/organization", {
      method: "PATCH",
      body: JSON.stringify({ inventoryEnabled: enabled }),
    });

    // Revalidar features sin relogin
    await fetchFeatures();
    toast.success("Configuración actualizada");
  };

  return (
    <div>
      <Switch checked={inventoryEnabled} onCheckedChange={handleToggle} />
      <label>Activar módulo de inventario</label>
    </div>
  );
}
```

---

## Resumen

Este sistema de modularización permite:

1. **Vender la aplicación por módulos** - cada organización paga solo lo que usa
2. **Activar/desactivar features sin código** - solo cambios en DB
3. **Performance óptima** - cero delay en UI
4. **Escalabilidad** - fácil añadir nuevos módulos
5. **Mantenibilidad** - código centralizado y type-safe

**Para añadir un nuevo módulo solo necesitas:**

- Añadir campo boolean en `Organization` (Prisma)
- Actualizar `OrganizationFeatures` interface
- Añadir en 3 sitios: store, layout, API endpoint
- Usar en componentes con `useOrganizationFeaturesStore`

**¡Listo para escalar! 🚀**

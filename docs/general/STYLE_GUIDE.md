# Guía de Estilo - Dashboard ERP

Este documento resume los cambios de estilo aplicados al dashboard "Mi Espacio" basados en el **shadcn-ui-kit-dashboard**, para mantener consistencia visual en todo el ERP.

---

## 🎨 Principios de Diseño

### 1. **Adaptable al Tema**

- ❌ **NUNCA** usar colores hardcodeados (`text-blue-700`, `bg-green-50`, etc.)
- ✅ **SIEMPRE** usar variables CSS del tema:
  - `text-primary` - Color principal del tema
  - `text-muted-foreground` - Texto secundario
  - `text-foreground` - Texto principal
  - `bg-muted` - Fondos suaves
  - `border` - Bordes estándar

### 2. **Minimalismo y Limpieza**

- Sin gradientes de colores
- Cards blancas/oscuras simples
- Iconos pequeños y discretos
- Espaciado generoso pero no excesivo

### 3. **Consistencia Visual**

- Todos los componentes deben seguir el mismo patrón
- Estructura CardHeader + CardContent
- Iconos circulares con `bg-muted`
- Tipografía consistente

---

## 📊 Componentes de Métricas/KPIs

### Referencia: `/dashboard/(auth)/crm/`

#### Estilo Aplicado

```tsx
<Card>
  <CardHeader>
    <CardDescription>Título de la métrica</CardDescription>
    <div className="flex flex-col gap-2">
      <h4 className="font-display text-2xl lg:text-3xl">Valor Principal</h4>
      <div className="text-muted-foreground text-sm">
        <span className="text-green-600">+20.1%</span> desde el mes pasado
      </div>
    </div>
    <CardAction>
      <div className="flex gap-4">
        <div className="bg-muted flex size-12 items-center justify-center rounded-full border">
          <IconComponent className="size-5" />
        </div>
      </div>
    </CardAction>
  </CardHeader>
</Card>
```

#### Tipografía

- **Número principal**: `font-display text-2xl lg:text-3xl`
- **Descripción**: `text-muted-foreground text-sm`
- **Etiqueta**: `CardDescription` (texto pequeño superior)

#### Colores de Progreso

- Verde (`text-green-600`) para valores positivos/completados
- Naranja (`text-orange-500` o `text-orange-600`) para valores en progreso/incompletos
- Sin colores para neutral

---

## 📈 Gráficas Circulares (RadialBarChart)

### Referencia: `/dashboard/(auth)/crm/target-card.tsx`

#### Estructura

```tsx
<Card className="gap-2">
  <CardHeader>
    <CardTitle className="font-display text-xl">Título dinámico según estado</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="flex items-center gap-2">
      <div>
        <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[60px]">
          <RadialBarChart data={chartData} startAngle={0} endAngle={250} innerRadius={25} outerRadius={20}>
            {/* Configuración estándar */}
          </RadialBarChart>
        </ChartContainer>
      </div>
      <p className="text-muted-foreground text-sm">
        Descripción con <span className="text-green-600">valor resaltado</span>
      </p>
    </div>
  </CardContent>
</Card>
```

#### Chart Config

```tsx
const chartConfig = {
  keyName: {
    label: "Etiqueta",
    color: "var(--primary)", // SIEMPRE usar variable del tema
  },
} satisfies ChartConfig;
```

---

## 🎯 Acciones Rápidas / Enlaces

### Referencia: Patrón de cards clickeables

#### Estructura

```tsx
<Card>
  <CardHeader>
    <CardTitle>Título de la sección</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="grid gap-2 md:grid-cols-2">
      <Link href="/ruta" className="hover:bg-accent flex items-center gap-3 rounded-lg border p-4 transition-colors">
        <div className="bg-muted flex size-10 items-center justify-center rounded-full border">
          <IconComponent className="text-primary size-4" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">Título</p>
          <p className="text-muted-foreground text-xs">Descripción breve</p>
        </div>
        <ChevronRight className="text-muted-foreground size-4" />
      </Link>
    </div>
  </CardContent>
</Card>
```

#### Características

- **Icono circular**: `bg-muted` con `text-primary`
- **Hover**: `hover:bg-accent`
- **Grid responsivo**: 1 col móvil, 2 cols desktop
- **Chevron derecha**: Indica navegación

---

## 📅 Timeline Vertical (Eventos)

### Referencia: `/dashboard/(auth)/pages/profile/latest-activity.tsx`

#### Estructura

```tsx
<Card>
  <CardHeader>
    <CardTitle>Título</CardTitle>
    <CardAction>
      <Link href="/ver-mas" className="text-muted-foreground hover:text-primary text-sm hover:underline">
        Ver todos
      </Link>
    </CardAction>
  </CardHeader>
  <CardContent className="ps-8">
    <ol className="relative border-s">
      <li className="ms-6 mb-8 space-y-2">
        <span className="bg-muted absolute -start-3 flex h-6 w-6 items-center justify-center rounded-full border">
          <IconComponent className="text-primary size-3" />
        </span>
        <h3 className="font-semibold">Título del evento</h3>
        <time className="text-muted-foreground flex items-center gap-1.5 text-sm leading-none">
          <Clock className="size-3" /> Fecha formateada
        </time>
        <p className="text-muted-foreground text-sm">Descripción</p>
      </li>
    </ol>
  </CardContent>
</Card>
```

#### Características

- **Línea vertical**: `border-s` en el `<ol>`
- **Círculos con iconos**: `bg-muted` con icono `text-primary`
- **Espaciado**: `mb-8` entre items (excepto último)
- **Padding**: `ps-8` en CardContent

---

## 📬 Notificaciones / Listados Compactos

### Estructura

```tsx
<Card>
  <CardHeader>
    <CardTitle>Título</CardTitle>
    <CardAction>
      <Button variant="ghost" asChild>
        <Link href="/ver-todas">
          Ver todas
          <ChevronRightIcon />
        </Link>
      </Button>
    </CardAction>
  </CardHeader>
  <CardContent>
    <div className="space-y-2">
      <Link
        href="/detalle"
        className="hover:bg-accent flex items-start justify-between gap-4 rounded-lg border p-3 transition-colors"
      >
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium">Mensaje principal</p>
          <p className="text-muted-foreground text-xs">Información adicional</p>
        </div>
        <ChevronRightIcon className="text-muted-foreground size-4 flex-shrink-0" />
      </Link>
    </div>
  </CardContent>
</Card>
```

#### Características

- **Cards individuales**: Cada item es un link con border
- **Spacing compacto**: `space-y-2` entre items
- **Padding**: `p-3` en cada card
- **Sin tabla**: Más flexible y sin espacios vacíos

---

## 🎨 Grid y Layout

### Grid de Métricas

```tsx
<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{/* Cards de métricas */}</div>
```

### Grid de Secciones

```tsx
<div className="grid gap-3 md:gap-4 lg:grid-cols-2">{/* Eventos y Notificaciones lado a lado */}</div>
```

### Spacing Global

```tsx
<div className="space-y-4">{/* Secciones con espacio consistente */}</div>
```

---

## 🔤 Tipografía

### Títulos

- **Page Title**: `text-xl font-bold tracking-tight lg:text-2xl`
- **CardTitle**: Por defecto con componente `<CardTitle>`
- **Section Header**: `font-display text-xl`
- **Números grandes**: `font-display text-2xl lg:text-3xl`

### Texto

- **Normal**: Default sin clase adicional
- **Secundario**: `text-muted-foreground`
- **Pequeño**: `text-sm` o `text-xs`

### Font Display

Usar `font-display` para números y títulos destacados (requiere configuración en tailwind)

---

## 🎯 Estados y Badges

### Badges Estándar

```tsx
<Badge variant="default">Nueva</Badge>
<Badge variant="success">Completado</Badge>
<Badge variant="info">En progreso</Badge>
<Badge variant="outline">Neutral</Badge>
```

### Empty States

```tsx
<EmptyState
  icon={<IconComponent className="text-muted-foreground/60 h-10 w-10" />}
  title="No hay elementos"
  description="Descripción de por qué está vacío"
/>
```

---

## ⚠️ Reglas IMPORTANTES

### ❌ NUNCA Hacer:

1. Usar colores hardcodeados (`bg-blue-50`, `text-green-700`, etc.)
2. Crear componentes Table cuando hay pocos items
3. Usar gradientes de colores
4. Cards con `pb-0` que dejan espacios vacíos
5. Ignorar el modo oscuro

### ✅ SIEMPRE Hacer:

1. Usar variables CSS del tema (`text-primary`, `bg-muted`, etc.)
2. Iconos con `text-primary` dentro de círculos `bg-muted`
3. Estructura CardHeader + CardContent
4. Grid responsivo: 1 col móvil, 2-3 cols desktop
5. Hover states con `hover:bg-accent`
6. ChevronRight para indicar navegación
7. Probar en diferentes temas (default, brutalist, soft-pop, tangerine)

---

## 📱 Responsive

### Breakpoints Estándar

- **Móvil**: 1 columna por defecto
- **Tablet** (`md:`): 2 columnas
- **Desktop** (`lg:` / `xl:`): 3-4 columnas

### Container Queries (Opcional)

```tsx
className = "@container/main";
className = "@xl/main:grid-cols-2";
```

---

## 🚀 Aplicación a Otras Pantallas

### Checklist de Migración

1. **Identificar componentes actuales**
   - ¿Tiene métricas/KPIs? → Aplicar estilo CRM
   - ¿Tiene listados? → Timeline o Cards clickeables
   - ¿Tiene acciones? → Cards con iconos circulares

2. **Reemplazar colores**
   - Buscar todos los colores hardcodeados
   - Reemplazar por variables del tema

3. **Actualizar estructura**
   - CardHeader + CardContent
   - Eliminar padding custom, usar defaults

4. **Revisar tipografía**
   - Números grandes → `font-display text-2xl lg:text-3xl`
   - Descripciones → `text-muted-foreground text-sm`

5. **Probar en temas**
   - Verificar en default, dark, y otros temas
   - Asegurar que todo se adapta correctamente

---

## 📚 Referencias del uiKit

- **Métricas**: `/dashboard/(auth)/crm/components/`
- **Timeline**: `/dashboard/(auth)/pages/profile/latest-activity.tsx`
- **Transactions**: `/dashboard/(auth)/payment/components/transaction-history.tsx`
- **Target Card**: `/dashboard/(auth)/crm/components/target-card.tsx`

---

**Última actualización**: Noviembre 2024
**Versión**: 1.0

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## IMPORTANTE: Idioma de respuesta

Por favor, SIEMPRE responde en español/castellano cuando trabajes en este proyecto.

## Project Overview

Next.js 15 admin dashboard template with TypeScript, Tailwind CSS v4, and shadcn/ui components. Built using App Router architecture with colocation file system pattern.

## Development Commands

```bash
# Development with Turbopack
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Linting
npm run lint

# Code formatting
npm run format
npm run format:check

# Generate theme presets (SOLO ejecutar manualmente si se modifican presets)
npm run generate:presets
```

**IMPORTANTE**: El comando `generate:presets` NO debe ejecutarse automáticamente en pre-commit hooks. Solo ejecutar manualmente cuando se modifiquen archivos de presets de tema.

## IMPORTANTE: Gestión del Puerto de Desarrollo

**SIEMPRE usar el puerto 3000 para desarrollo**

- Si el puerto 3000 está ocupado, MATAR el proceso y liberar el puerto
- NUNCA usar puertos alternativos (3001, 3002, etc.)
- Comando para liberar puerto 3000: `pkill -f "next|node.*3000"`
- La aplicación DEBE estar disponible en http://localhost:3000

## Architecture & Patterns

### Route Organization

- `/src/app/(external)/` - Public-facing pages (landing)
- `/src/app/(main)/dashboard/` - Protected dashboard routes
- `/src/app/(main)/auth/` - Authentication pages (v1 and v2 variants)
- Page-specific components in `_components/` subdirectories within each route

### Component Structure

- `/src/components/ui/` - shadcn/ui components (47+ reusable components)
- `/src/components/data-table/` - TanStack Table implementation
- Components are co-located with their consuming pages when page-specific

### State Management

- Zustand stores in `/src/stores/` with vanilla store creation for SSR compatibility
- Preferences store manages theme mode (light/dark) and presets (default, brutalist, soft-pop, tangerine)
- Server-side initialization via cookies with client-side hydration

### Theme System

- CSS variables approach with OKLCH color space
- Multiple theme presets in `/src/styles/presets/`
- Theme variables defined in `/src/app/globals.css`
- Server-side theme detection from cookies
- Client-side theme switching via Zustand store

### Authentication

- Cookie-based authentication using `auth-token`
- Middleware configuration in `/src/middleware.disabled.ts` (currently disabled)
- Protected routes under `/dashboard/:path*`
- Server actions for preference management in `/src/server/actions/`

### Navigation

- Sidebar navigation configuration in `/src/navigation/`
- Hierarchical menu structure with groups and sub-items
- Support for external links and "coming soon" indicators

## Key Technologies

- **Framework**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4, CSS custom properties
- **UI Components**: shadcn/ui with "new-york" style
- **Forms**: React Hook Form with Zod validation
- **Tables**: TanStack Table
- **State**: Zustand
- **Icons**: Lucide React, Simple Icons
- **Development**: ESLint, Prettier, Husky, Lint-staged

## Important Files

- `/src/config/app-config.ts` - Application metadata and configuration
- `/src/navigation/sidebar-nav.tsx` - Sidebar navigation structure
- `/src/stores/preferences-store.tsx` - Theme preferences management
- `/components.json` - shadcn/ui configuration
- `/src/app/globals.css` - Global styles and theme variables

## Development Guidelines

When modifying theme styles:

- Light mode variables are in `:root` selector
- Dark mode variables are in `.dark` selector
- Theme presets override these in `/src/styles/presets/`
- Use OKLCH color format for consistency

When adding new routes:

- Place in appropriate route group (`(external)` or `(main)`)
- Create `_components/` subdirectory for page-specific components
- Update navigation in `/src/navigation/sidebar-nav.tsx` if needed

When working with components:

- Use existing shadcn/ui components from `/src/components/ui/`
- Follow the established pattern for data tables
- Maintain TypeScript type safety throughout

## CRÍTICO: Compatibilidad Safari ⚠️

Safari requiere atención especial en varios aspectos. **Ver documentación completa en `/docs/SAFARI_COMPATIBILITY.md`**.

### Reglas Obligatorias para Safari

#### 1. Backdrop Filter / Blur

- ❌ **NUNCA** confiar en que `backdrop-filter` funcione en Safari
- ✅ **SIEMPRE** tener fallback con fondo sólido usando `@supports`
- ✅ **SIEMPRE** aceptar que Safari puede tener fondo sólido

**Patrón recomendado**:

```css
.elemento-con-blur {
  backdrop-filter: blur(16px);
  background-color: hsl(var(--background) / 0.95);
}

@supports (backdrop-filter: blur(1px)) {
  .elemento-con-blur {
    background-color: hsl(var(--background) / 0.6);
  }
}

@supports (-webkit-backdrop-filter: blur(1px)) and (not (backdrop-filter: blur(1px))) {
  .elemento-con-blur {
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    background-color: hsl(var(--background)); /* sólido */
  }
}
```

#### 2. Elementos Visuales Pequeños (líneas, bordes, separadores)

- ❌ **NUNCA** usar Tailwind con opacidades para elementos críticos (`bg-gray-300/30`)
- ❌ **NUNCA** usar `hsl()` con opacidades en elementos pequeños
- ❌ **NUNCA** confiar en que Safari renderice elementos con `h-0.5` o `h-1`
- ✅ **SIEMPRE** usar estilos inline con colores hex sólidos
- ✅ **SIEMPRE** usar `height: "2px"` o más (mínimo 2px)

**Patrón recomendado**:

```tsx
{
  /* ❌ NO hacer esto - invisible en Safari */
}
<div className="h-0.5 w-full bg-gray-300/30" />;

{
  /* ✅ SÍ hacer esto - visible en Safari y Chrome */
}
<div
  style={{
    width: "100%",
    height: "2px",
    backgroundColor: "#d1d5db", // hex sólido, sin opacidad
  }}
/>;
```

#### 3. Layout con Viewport (h-screen, footers sticky/fixed)

- ❌ **NUNCA** usar `h-screen` + `position: fixed` para footers
- ❌ **NUNCA** usar `overflow-hidden` en contenedores con sticky/fixed
- ✅ **SIEMPRE** usar `min-h-screen` + flexbox + `position: sticky`
- ✅ **SIEMPRE** usar `flex-1` en contenido y `mt-auto` en footer

**Patrón recomendado**:

```tsx
<div className="flex min-h-screen flex-col gap-4">
  {/* Header */}
  <div>...</div>

  {/* Contenido - flex-1 empuja footer al final */}
  <div className="flex-1">{/* Contenido con scroll */}</div>

  {/* Footer - sticky en lugar de fixed */}
  <div className="sticky bottom-0 z-50 mt-auto">{/* Acciones */}</div>
</div>
```

#### 4. Testing Obligatorio

**SIEMPRE** probar en Safari cuando el código incluya:

- `backdrop-filter` o efectos blur
- Elementos visuales pequeños (`< 3px`)
- Opacidades en Tailwind (`/30`, `/50`, etc.) para elementos críticos
- `position: fixed` con viewport units
- Layouts con `h-screen`

### Checklist Pre-Commit

Si modificas alguno de estos elementos, verificar en Safari:

- [ ] Footer sticky/fixed visible y accesible
- [ ] Efectos blur tienen fallback sólido
- [ ] Líneas divisoras/bordes visibles
- [ ] Layout no se rompe (botones accesibles)
- [ ] Elementos pequeños visibles (>= 2px)

**Si no tienes Safari disponible**: dejar comentario en el PR indicando que requiere testing en Safari.

## ERP Development Strategy

### Workflow de Migraciones (CRÍTICO antes de merge a main) ⚠️

**SIEMPRE que cambies el schema de Prisma, crear migración ANTES de merge a main**

#### Proceso obligatorio:

1. **Cambias schema.prisma** → `prisma db push` (desarrollo local, sincroniza sin perder datos)
2. **Antes de commit/merge** → **CREAR MIGRACIÓN OBLIGATORIAMENTE**:

   ```bash
   npx prisma migrate dev --name nombre_descriptivo_de_la_funcionalidad
   ```

   **🎯 Nombres de migración DESCRIPTIVOS y ESPECÍFICOS:**
   - ✅ CORRECTO: `add_hierarchy_type_to_organization`
   - ✅ CORRECTO: `add_manual_time_entry_system`
   - ✅ CORRECTO: `add_signature_request_tables`
   - ❌ INCORRECTO: `update_schema`
   - ❌ INCORRECTO: `changes`
   - ❌ INCORRECTO: `fix`

   **Las migraciones ya incluyen timestamp automático** (ejemplo: `20251030152234_add_hierarchy_type`)

3. **Verificar migración creada** → Comitear SIEMPRE con el schema
4. **En producción** → `prisma migrate deploy` se ejecuta automáticamente (docker-entrypoint.sh)

#### Si hay DRIFT (schema desincronizado con migraciones):

**NUNCA usar `prisma migrate reset` sin consentimiento explícito (destruye datos)**

Opciones:

1. `npx prisma db push` - Sincroniza schema SIN perder datos
2. Luego crear migración limpia manualmente
3. Si es complejo: pedir ayuda o revisar el drift con `prisma migrate diff`

#### Validación automática (opcional - CI):

```bash
# Rompe el build si hay drift entre schema y migraciones
npx prisma migrate diff \
  --from-schema-datamodel ./prisma/schema.prisma \
  --to-migrations ./prisma/migrations \
  --exit-code
```

**⚠️ NUNCA hacer merge a main sin migración si cambias schema → Producción fallará**

**⚠️ SIEMPRE crear migraciones con nombres descriptivos de la funcionalidad**

## Reglas de Código (ESLint) - CRÍTICO ⚠️

**IMPORTANTE**: El pre-commit hook ejecuta ESLint y BLOQUEARÁ el commit si hay errores. SIEMPRE seguir estas reglas:

### Errores que BLOQUEAN commits (nunca usar):

1. **NUNCA usar `||` para valores por defecto** - SIEMPRE usar `??` (nullish coalescing)

   ```typescript
   ❌ INCORRECTO: const value = data.value || "default"
   ✅ CORRECTO:   const value = data.value ?? "default"

   ❌ INCORRECTO: value={field.value || ""}
   ✅ CORRECTO:   value={field.value ?? ""}
   ```

2. **NUNCA declarar variables en catch sin usar** - Usar `catch {` en lugar de `catch (err) {`

   ```typescript
   ❌ INCORRECTO: } catch (err) { setError("Error"); }
   ✅ CORRECTO:   } catch { setError("Error"); }
   ```

3. **NUNCA importar componentes/funciones sin usarlos** - Eliminar imports no usados

   ```typescript
   ❌ INCORRECTO: import { Foo, Bar, Baz } from "lib" // Bar no se usa
   ✅ CORRECTO:   import { Foo, Baz } from "lib"
   ```

4. **CUIDADO con `??` y optional chaining juntos** - Usar `||` en lugar de `??` cuando ya se usa `?.`

   ```typescript
   ❌ INCORRECTO: event.calendar?.color ?? "default"  // Causa warning
   ✅ CORRECTO:   event.calendar?.color || "default"  // Sin warning

   // Explicación: optional chaining (?.) ya maneja null/undefined,
   // por lo que ?? es redundante y causa warnings de ESLint
   ```

5. **NUNCA usar `??` después de conversiones de tipo** - `Number()`, `String()`, etc. NUNCA devuelven null/undefined

   ```typescript
   ❌ INCORRECTO: const value = Number(data.field) ?? 0  // Number() nunca es null
   ✅ CORRECTO:   const value = Number(data.field || 0)  // Usar || con el valor original
   ✅ CORRECTO:   const value = Number(data.field) || 0  // Usar || para manejar NaN

   ❌ INCORRECTO: const total = Number(todaySummary.totalWorkedMinutes) ?? 0
   ✅ CORRECTO:   const total = Number(todaySummary.totalWorkedMinutes || 0)

   // Explicación: Number(x) devuelve un número (puede ser NaN, pero no null/undefined).
   // Usar ?? causa error "no-constant-binary-expression" y bloquea el commit.
   ```

6. **NUNCA usar `||` en condiciones con valores opcionales** - SIEMPRE usar `??` para chequeos explícitos de null/undefined

   ```typescript
   ❌ INCORRECTO: {(obj?.field1 || obj?.field2) && <Component />}
   ✅ CORRECTO:   {(obj?.field1 ?? obj?.field2) && <Component />}

   ❌ INCORRECTO: if (notification?.ptoRequestId || notification?.manualRequestId) { }
   ✅ CORRECTO:   if (notification?.ptoRequestId ?? notification?.manualRequestId) { }

   // Explicación: Con valores opcionales, usar || puede causar comportamiento inesperado
   // con valores falsy (0, "", false). ESLint requiere ?? para ser explícito.
   // Error: "Prefer using nullish coalescing operator (`??`) instead of a logical or (`||`)"
   ```

### Warnings que son aceptables (no bloquean):

- `Generic Object Injection Sink` (security warning) - Aceptable en código interno
- `complexity` warnings - Intentar simplificar pero no bloquea
- `max-lines` - Intentar dividir archivos grandes pero no bloquea

### Validación antes de commit:

**SIEMPRE ejecutar antes de hacer commit:**

```bash
npm run lint
```

Si hay errores, corregirlos ANTES de intentar el commit.

## Sistema de Geolocalización GPS ⚠️

### Descripción General

Sistema completo de captura y visualización de ubicación GPS en fichajes, con cumplimiento RGPD/LOPDGDD.

### Configuración

*

**IMPORTANTE - Serialización de Decimals:**
Los campos `Decimal` de Prisma NO se pueden pasar directamente del servidor al cliente en Next.js 15. SIEMPRE usar `serializeTimeEntry()` que convierte a números:

```typescript
function serializeTimeEntry(entry: any) {
  return {
    ...entry,
    latitude: entry.latitude ? Number(entry.latitude) : null,
    longitude: entry.longitude ? Number(entry.longitude) : null,
    accuracy: entry.accuracy ? Number(entry.accuracy) : null,
    distanceFromCenter: entry.distanceFromCenter ? Number(entry.distanceFromCenter) : null,
  };
}
```

**Server Actions - Parámetros Individuales:**
Next.js 15 NO permite acceder a propiedades de objetos pasados desde cliente a servidor. SIEMPRE pasar parámetros como valores primitivos individuales:

```typescript
// ❌ INCORRECTO
export async function clockIn(geoData: { latitude: number; longitude: number; accuracy: number });

// ✅ CORRECTO
export async function clockIn(latitude?: number, longitude?: number, accuracy?: number);
```



### Dependencias

```bash
npm install leaflet react-leaflet @types/leaflet
```

**CSS de Leaflet:**
Ya incluido en `time-entries-map.tsx` con `import 'leaflet/dist/leaflet.css'`

### Limitaciones Conocidas

- **Safari en localhost**: No permite geolocalización por seguridad. Usar Chrome para desarrollo o HTTPS en producción
- **Precisión GPS**: Depende del dispositivo (móviles ~5-50m, ordenadores ~50-500m)
- **Requiere HTTPS en producción**: Navegadores modernos solo permiten GPS en contextos seguros

## Guía de Estilo UI para ERP - IMPORTANTE ⚠️

### SIEMPRE Seguir Estos Patrones de Diseño

- **NUNCA crear componentes UI custom** - Usar SIEMPRE componentes shadcn/ui existentes
- **Referencia visual**: El dashboard `/dashboard/default` es el patrón de oro para el diseño
- **Consistencia absoluta**: Todas las páginas deben verse como parte del mismo sistema

### Colores y Fondos

- **Cards de estadísticas**: `from-primary/5 to-card bg-gradient-to-t shadow-xs`
- **Cards generales**: `rounded-lg border` con fondo predeterminado
- **Modo oscuro**: `dark:bg-card` se maneja automáticamente
- **Texto**: Usar clases `text-foreground`, `text-muted-foreground` para consistencia

### Layout y Espaciado

- **Container principal**: `@container/main flex flex-col gap-4 md:gap-6`
- **Grids responsivos**: `grid-cols-1 @xl/main:grid-cols-2 @5xl/main:grid-cols-4`
- **Container queries**: Usar `@container/card`, `@container/main` para responsive
- **Gaps consistentes**: `gap-4` para móvil, `md:gap-6` para desktop

### Componentes Específicos

- **DataTables**: Basar en `/dashboard/default/_components/data-table.tsx`
- **SectionHeader**: Usar componente existente `/components/hr/section-header.tsx`
- **EmptyState**: Usar componente existente `/components/hr/empty-state.tsx`
- **Cards con métricas**: Seguir patrón de `section-cards.tsx`

### Navegación

- **NO usar submenus innecesarios** - Simplicidad ante todo
- **Enlaces directos**: Ejemplo `Empleados` → `/dashboard/employees`
- **Opciones internas**: Botones de acción dentro de cada página

### Estado con Zustand

- **Stores centralizados**: Para empleados, organización, etc.
- **Actions async**: Preparar para APIs futuras
- **Loading states**: Manejar en el store, mostrar en UI

## Guía para Componentes Profesionales - SIEMPRE APLICAR 🎯

### Cuando el usuario pida componentes, INTERPRETAR así:

#### ✅ **Frases que indican componente PROFESIONAL:**

- "Listado de [X]" → DataTable completo con tabs
- "Tabla de [X]" → TanStack Table + paginación + filtros
- "Componente de [X]" → Patrón /dashboard/default automáticamente

#### ✅ **SIEMPRE incluir estas características (sin que las pida):**

- **Tabs con badges**: `Activos <Badge>3</Badge>`, `Todos`, etc.
- **DataTable de TanStack**: Con sorting, filtering, paginación
- **DataTableViewOptions**: Botón para mostrar/ocultar columnas
- **DataTablePagination**: Navegación entre páginas
- **Container queries**: `@container/main flex flex-col gap-4 md:gap-6`
- **Estados vacíos**: Para tabs sin contenido con iconos y mensajes
- **Responsive**: Select en móvil (`@4xl/main:hidden`), Tabs en desktop (`@4xl/main:flex`)

#### ✅ **Estructura estándar para DataTables:**

```tsx
<div className="@container/main flex flex-col gap-4 md:gap-6">
  <SectionHeader title="[X]" actionLabel="Nuevo [X]" />

  <Tabs defaultValue="active">
    <div className="flex items-center justify-between">
      <Select>...</Select> {/* Móvil */}
      <TabsList>...</TabsList> {/* Desktop */}
      <div className="flex gap-2">
        <DataTableViewOptions />
        <Button>Nuevo</Button>
      </div>
    </div>

    <TabsContent value="active">
      <div className="overflow-hidden rounded-lg border">
        <DataTableNew table={table} columns={columns} />
      </div>
      <DataTablePagination table={table} />
    </TabsContent>
  </Tabs>
</div>
```

#### ❌ **NUNCA hacer componentes básicos:**

- Table HTML simple (`<table><tr><td>`)
- Cards simples sin tabs
- Listados sin paginación
- Sin estados vacíos

#### 🎯 **Nivel de referencia SIEMPRE:**

- **Patrón oro**: `/dashboard/default/_components/data-table.tsx`
- **Calidad**: Aplicación empresarial (Linear, Notion, Monday.com)
- **Consistencia**: Todos los listados deben verse idénticos

## Sistema de Horarios V2.0

**IMPORTANTE**: Para toda la documentación detallada del Sistema de Horarios V2.0, consultar:

📄 **[/docs/PLAN_MIGRACION_HORARIOS_V2.md](/docs/PLAN_MIGRACION_HORARIOS_V2.md)**

### Resumen Rápido

**Sistema V2 (OFICIAL - USAR SIEMPRE):**

- **Ubicación**: `/src/app/(main)/dashboard/schedules/`
- **Server Actions**: `/src/server/actions/schedules-v2.ts`
- **Motor de cálculo**: `/src/lib/schedule-engine.ts` ✅ IMPLEMENTADO
- **Estado**: Sprint 1-3 completados (motor + integración con fichajes)

**Arquitectura:**

- `ScheduleTemplate` → Plantilla reutilizable
- `SchedulePeriod` → Períodos (REGULAR, INTENSIVE, SPECIAL)
- `WorkDayPattern` → Patrón por día de semana
- `TimeSlot` → Franjas horarias (en minutos)
- `EmployeeScheduleAssignment` → Asignación empleado ↔ plantilla

**Sistema V1 (DEPRECADO - NO USAR):**

- Ubicación: `/src/app/(main)/dashboard/employees/new/_components/wizard-step-3-schedule.tsx`
- Problema: Acoplado, no reutilizable
- Acción: Migrar a V2


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

## ERP Development Strategy

### IMPORTANTE: Desarrollo Incremental de Base de Datos

- **NO crear todo el schema de Prisma de una vez**
- Ir añadiendo modelos y campos conforme se implementan las funcionalidades
- Empezar con los modelos mínimos necesarios para cada feature
- **IMPORTANTE: Si hay drift en migraciones, usar `npx prisma db push` en lugar de reset**
  - `prisma db push`: Sincroniza el schema SIN perder datos (ideal para desarrollo)
  - `prisma migrate dev`: Crea migraciones (usar cuando el historial está limpio)
  - `prisma migrate reset`: DESTRUYE todos los datos (solo usar con consentimiento explícito)
- Esto permite:
  - Detectar errores temprano
  - Ajustar el modelo según necesidades reales
  - Evitar complejidad innecesaria
  - Mantener un historial claro de cambios
  - **NO perder datos durante el desarrollo**

### Orden de Implementación Sugerido:

1. **Sprint 0**: Solo modelos `Organization`, `User`, `Session` (auth básica)
2. **Sprint 1**: Añadir `Employee`, `Department`, `CostCenter`
3. **Sprint 2**: Añadir `TimeEntry`, `WorkdaySummary`
4. **Sprint 3**: Añadir `PtoRequest`, `PtoBalance`, `AbsenceType`
5. **Sprint 4**: Añadir modelos de nómina y exportación

### Configuración de Base de Datos

- **Base de datos**: PostgreSQL
- **Usuario**: erp_user
- **Contraseña**: erp_pass
- **Base de datos**: erp_dev
- **Puerto**: 5432
- **URL**: postgresql://erp_user:erp_pass@localhost:5432/erp_dev

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

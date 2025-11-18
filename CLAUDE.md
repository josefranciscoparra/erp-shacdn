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
{/* ❌ NO hacer esto - invisible en Safari */}
<div className="h-0.5 w-full bg-gray-300/30" />

{/* ✅ SÍ hacer esto - visible en Safari y Chrome */}
<div
  style={{
    width: "100%",
    height: "2px",
    backgroundColor: "#d1d5db", // hex sólido, sin opacidad
  }}
/>
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
  <div className="flex-1">
    {/* Contenido con scroll */}
  </div>

  {/* Footer - sticky en lugar de fixed */}
  <div className="sticky bottom-0 z-50 mt-auto">
    {/* Acciones */}
  </div>
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

### Sistema de Identidad Organizacional (Multi-tenant)

#### 1. Numeración Automática de Empleados

**Formato:** `{PREFIX}{SEQUENCE}` → `TMNW00001`, `ACME00042`

**Características:**

- ✅ **Automático**: El número se genera automáticamente al crear un empleado
- ✅ **Único**: Contador atómico previene duplicados
- ✅ **Profesional**: Números como `TMNW00001` en nóminas y documentos
- ✅ **Escalable**: Hasta 99,999 empleados por organización (5 dígitos)

**Implementación:**

```typescript
// Al crear organización
const prefix = generateOrganizationPrefix("TimeNow"); // → "TMNW"

// Al crear empleado
const updatedOrg = await prisma.organization.update({
  where: { id: orgId },
  data: { employeeNumberCounter: { increment: 1 } },
});

const employeeNumber = formatEmployeeNumber(updatedOrg.employeeNumberPrefix, updatedOrg.employeeNumberCounter); // → "TMNW00001"
```

**Prefijos:**

- Generación automática desde el nombre de la organización
- Editable ANTES de crear el primer empleado
- Inmutable DESPUÉS del primer empleado (integridad de numeración)

#### 2. Validación de Dominios de Email Corporativos

**Variable de entorno:**

```bash
ENFORCE_ORGANIZATION_EMAIL_DOMAINS="true|false"
```

**Funcionamiento:**

- `true`: Solo permitir emails con dominios configurados en la organización
- `false`: Permitir cualquier email (para empresas pequeñas sin dominio propio)

**Configuración por organización:**

```typescript
// Organization model
allowedEmailDomains: ["acme.com", "acme.es"]; // Array de dominios permitidos
```

**Validación:**

```typescript
// Si ENFORCE_ORGANIZATION_EMAIL_DOMAINS=true Y tiene dominios configurados
validateEmailDomain("juan@acme.com", ["acme.com"]); // ✅ Válido
validateEmailDomain("juan@gmail.com", ["acme.com"]); // ❌ Inválido
```

**Casos de uso:**

1. **Empresa con dominio propio**: `allowedEmailDomains: ["timenow.cloud"]` + `ENFORCE=true`
2. **Empresa pequeña**: `allowedEmailDomains: []` + `ENFORCE=false` (permite cualquier email)
3. **Multi-dominio**: `allowedEmailDomains: ["acme.com", "acme.es", "acme.fr"]`

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

### Componentes Principales

1. **Captura GPS** (`/src/hooks/use-geolocation.ts`)
   - Hook de React para capturar ubicación del navegador
   - Manejo de errores y permisos
   - Cálculo de precisión GPS

2. **Server Actions** (`/src/server/actions/geolocation.ts`)
   - `checkGeolocationConsent()` - Verifica consentimiento del usuario
   - `saveGeolocationConsent()` - Guarda consentimiento RGPD
   - `validateClockLocation()` - Valida si está dentro del área permitida
   - `getCostCentersWithLocation()` - Obtiene centros con GPS configurado
   - `getGeolocationStats()` - Estadísticas de uso

3. **Visualización en Mapa** (`/src/app/(main)/dashboard/me/clock/_components/time-entries-map.tsx`)
   - Librería: Leaflet + React-Leaflet
   - Marcadores de colores por tipo de fichaje
   - Círculos de precisión GPS
   - Popups con detalles de cada fichaje

4. **Panel de Control** (`/src/app/(main)/dashboard/settings/_components/geolocation-tab.tsx`)
   - Toggle ON/OFF para activar/desactivar geolocalización
   - Estadísticas: fichajes totales, con GPS, que requieren revisión
   - Enlace al mapa de fichajes

### Funcionalidades

**✅ Captura Automática:**
- Al fichar (entrada/salida/pausas), captura GPS automáticamente si está activado
- Solo pide permisos la primera vez (dialog de consentimiento RGPD)
- Funciona en Chrome/Firefox (Safari en localhost NO permite GPS por seguridad)

**✅ Validación de Ubicación:**
- Calcula distancia al centro de trabajo más cercano usando fórmula Haversine
- Marca fichajes fuera de área como "Requiere revisión"
- Permite fichaje incluso si GPS falla (graceful degradation)

**✅ Visualización:**
- Vista Lista: Badges GPS mostrando precisión, estado dentro/fuera de área
- Vista Mapa: Mapa interactivo con Leaflet mostrando todos los fichajes con GPS
- Toggle entre lista/mapa disponible cuando hay fichajes con GPS

### Configuración

**Base de Datos (Prisma):**
```typescript
// TimeEntry - Almacena coordenadas GPS
latitude: Decimal?
longitude: Decimal?
accuracy: Decimal?
isWithinAllowedArea: Boolean?
requiresReview: Boolean
distanceFromCenter: Decimal?
nearestCostCenterId: String?

// GeolocationConsent - Cumplimiento RGPD
userId, orgId, consentVersion, ipAddress, active

// CostCenter - Centros con ubicación configurada
latitude, longitude, allowedRadiusMeters

// Organization - Configuración global
geolocationEnabled: Boolean
geolocationRequired: Boolean
geolocationMinAccuracy: Int (metros)
geolocationMaxRadius: Int (metros)
```

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
export async function clockIn(geoData: { latitude: number, longitude: number, accuracy: number })

// ✅ CORRECTO
export async function clockIn(latitude?: number, longitude?: number, accuracy?: number)
```

### Uso

**Activación:**
1. Ir a `/dashboard/settings` → Pestaña "Geolocalización"
2. Activar toggle de geolocalización
3. Los fichajes ahora capturarán GPS automáticamente

**Visualización de Fichajes con GPS:**
1. Ir a `/dashboard/me/clock`
2. En "Fichajes de hoy", verás badges GPS en cada entrada
3. Si hay fichajes con GPS, aparece botón toggle "Lista/Mapa"
4. Click en "Mapa" para ver todos los fichajes en mapa interactivo con Leaflet

**Configurar Centros de Trabajo:**
1. Ir a `/dashboard/cost-centers`
2. Editar centro → Configurar `latitude`, `longitude`, `allowedRadiusMeters`
3. Los fichajes se validarán contra estos centros

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

## Sistema de Horarios V2.0 - CRÍTICO ⚠️

### Estrategia de Migración

**IMPORTANTE**: Existe un sistema de horarios V1 (legacy) y V2 (actual). **SIEMPRE usar V2**.

#### Sistema V1 (DEPRECADO - NO USAR)

- **Ubicación**: `/src/app/(main)/dashboard/employees/new/_components/wizard-step-3-schedule.tsx`
- **Modelo**: Campos directos en tabla `Employee` (scheduleType, scheduleData JSON)
- **Problema**: Acoplado al wizard de creación, no reutilizable, difícil de gestionar
- **Estado**: DEPRECADO - Marcar para migración futura

#### Sistema V2 (OFICIAL - USAR SIEMPRE)

- **Ubicación**: `/src/app/(main)/dashboard/schedules/`
- **Modelo**: Sistema de plantillas con jerarquía completa
  - `ScheduleTemplate` → Plantilla reutilizable (40h semanales, turnos rotativos, etc.)
  - `SchedulePeriod` → Períodos dentro de plantilla (REGULAR, INTENSIVE, SPECIAL)
  - `WorkDayPattern` → Patrón diario (Lunes a Domingo)
  - `TimeSlot` → Franjas horarias del día
  - `EmployeeScheduleAssignment` → Asignación empleado ↔ plantilla
- **Ventajas**: Reutilizable, histórico, flexible, multi-período
- **Estado**: SISTEMA OFICIAL ACTIVO

### Decisión de Migración: Opción 1 (Adoptada)

**Estrategia**: Migrar completamente al V2, eliminar wizard V1 Step 3

**Acciones pendientes**:

1. **Actualizar wizard de empleados** (`/src/app/(main)/dashboard/employees/new/`)
   - Eliminar Step 3 actual (formulario FLEXIBLE/FIXED)
   - Crear nuevo Step 3: Selector de plantilla V2 existente
   - Componente: `<ScheduleTemplateSelector />` (dropdown o cards)

2. **Asignación automática al crear empleado**
   ```typescript
   // En el submit final del wizard
   if (selectedTemplateId) {
     await assignScheduleToEmployee({
       employeeId: newEmployee.id,
       scheduleTemplateId: selectedTemplateId,
       validFrom: new Date(),
       isActive: true,
     })
   }
   ```

3. **Migración de datos existentes** (si hay empleados con V1)
   - Script de migración: Convertir `Employee.scheduleData` a `ScheduleTemplate` + assignment
   - Ejecutar ANTES de eliminar Step 3 del wizard

### Funcionalidades V2 Implementadas

**✅ Gestión de Plantillas** (`/dashboard/schedules`)
- ✅ Crear/editar plantillas de horario
- ✅ Tipos: FIXED, SHIFT, ROTATION, FLEXIBLE
- ✅ Períodos configurables (REGULAR, INTENSIVE, SPECIAL)
- ✅ Editor de horarios semanales con validación 40h
- ✅ Badge indicador: "Más de 40h", "~40h", "Menos de 40h"
- ✅ Listado de plantillas con contador de empleados asignados

**✅ Asignación de Empleados** (`/dashboard/schedules/[id]`)
- ✅ Dialog multi-select para asignar empleados a plantillas
- ✅ Lista de empleados asignados con fecha de inicio
- ✅ Desasignar empleados con confirmación
- ✅ Búsqueda por nombre, email, número, departamento
- ✅ Filtrado automático: solo muestra empleados disponibles (no asignados)
- ✅ Asignación masiva de múltiples empleados
- ✅ Inferencia automática de assignmentType desde templateType

**✅ Server Actions** (`/src/server/actions/schedules-v2.ts`)
- ✅ `getScheduleTemplateById()` - Obtener plantilla con períodos
- ✅ `getAvailableEmployeesForTemplate()` - Empleados NO asignados a la plantilla (con departamento desde contract)
- ✅ `getTemplateAssignedEmployees()` - Empleados actualmente asignados (con departamento desde contract)
- ✅ `assignScheduleToEmployee()` - Crear asignación empleado ↔ plantilla (con auto-inferencia de tipo)
- ✅ `endEmployeeAssignment()` - Finalizar asignación (soft delete)

**✅ Correcciones Técnicas Aplicadas**
- ✅ Modelo Employee NO tiene relación directa con Department → Se obtiene desde EmploymentContract
- ✅ Campos firstName/lastName están en Employee directamente (no en User)
- ✅ Campo assignmentType se infiere automáticamente desde templateType de la plantilla

### Arquitectura de Datos

```prisma
model ScheduleTemplate {
  id           String   @id @default(cuid())
  name         String
  description  String?
  templateType TemplateType  // FIXED, SHIFT, ROTATION, FLEXIBLE
  isActive     Boolean  @default(true)

  periods      SchedulePeriod[]
  employeeAssignments EmployeeScheduleAssignment[]
}

model SchedulePeriod {
  id               String   @id @default(cuid())
  scheduleTemplateId String
  scheduleTemplate ScheduleTemplate @relation(fields: [scheduleTemplateId])

  periodType       PeriodType  // REGULAR, INTENSIVE, SPECIAL
  startDate        DateTime
  endDate          DateTime?

  workDayPatterns  WorkDayPattern[]
}

model WorkDayPattern {
  id             String   @id @default(cuid())
  schedulePeriodId String
  schedulePeriod SchedulePeriod @relation(fields: [schedulePeriodId])

  dayOfWeek      Int  // 0=Domingo, 1=Lunes, ..., 6=Sábado
  isWorkingDay   Boolean @default(true)

  timeSlots      TimeSlot[]
}

model TimeSlot {
  id                String   @id @default(cuid())
  workDayPatternId  String
  workDayPattern    WorkDayPattern @relation(fields: [workDayPatternId])

  startTimeMinutes  Int  // Minutos desde medianoche (0-1439)
  endTimeMinutes    Int
  slotType          SlotType  // WORK, BREAK, FLEXIBLE
}

model EmployeeScheduleAssignment {
  id                  String   @id @default(cuid())
  employeeId          String
  scheduleTemplateId  String

  validFrom           DateTime
  validTo             DateTime?
  isActive            Boolean  @default(true)

  employee            Employee @relation(fields: [employeeId])
  scheduleTemplate    ScheduleTemplate @relation(fields: [scheduleTemplateId])
}
```

### Patrones Técnicos Importantes

#### 1. Server Actions con 3 parámetros
```typescript
export async function updateWorkDayPattern(
  periodId: string,
  dayOfWeek: number,
  data: UpdateWorkDayPatternInput
) {
  // Next.js 15 requiere parámetros primitivos individuales
  // NO pasar objetos complejos como único parámetro
}
```

#### 2. Serialización de Prisma Decimal
```typescript
// Prisma Decimal NO se puede pasar directamente a componentes cliente
const serializedPeriods = periods.map(period => ({
  ...period,
  workDayPatterns: period.workDayPatterns.map(pattern => ({
    ...pattern,
    timeSlots: pattern.timeSlots.map(slot => ({
      ...slot,
      startTimeMinutes: Number(slot.startTimeMinutes),  // Decimal → number
      endTimeMinutes: Number(slot.endTimeMinutes),
    })),
  })),
}))
```

#### 3. Reset de formularios en diálogos
```typescript
// Resetear form cuando cambien los datos del servidor
useEffect(() => {
  if (open && data) {
    form.reset({
      // Valores del servidor
    })
  }
}, [open, data, form])
```

#### 4. Filtros condicionales en Prisma
```typescript
// Solo aplicar filtro notIn si hay IDs asignados
const employees = await prisma.employee.findMany({
  where: {
    orgId,
    status: "ACTIVE",
    ...(assignedIds.length > 0 && {
      id: { notIn: assignedIds }
    }),
  },
})
```

### Nombres de campos CRÍTICOS

**⚠️ SIEMPRE usar estos nombres exactos:**
- `startTimeMinutes` y `endTimeMinutes` (NO `startMinutes`/`endMinutes`)
- `dayOfWeek` (0=Domingo, 1=Lunes, ..., 6=Sábado)
- `scheduleTemplateId` (NO `templateId`)
- `validFrom` y `validTo` (para asignaciones con histórico)

### Rutas y Archivos Clave

**Páginas principales:**
- `/src/app/(main)/dashboard/schedules/page.tsx` - Listado de plantillas
- `/src/app/(main)/dashboard/schedules/[id]/page.tsx` - Detalle y edición de plantilla
- `/src/app/(main)/dashboard/schedules/new/page.tsx` - Crear nueva plantilla

**Componentes importantes:**
- `/src/app/(main)/dashboard/schedules/[id]/_components/week-schedule-editor.tsx` - Editor visual semanal
- `/src/app/(main)/dashboard/schedules/[id]/_components/assign-employees-dialog.tsx` - Dialog asignación masiva
- `/src/app/(main)/dashboard/schedules/[id]/_components/assigned-employees-list.tsx` - Lista de asignados
- `/src/app/(main)/dashboard/schedules/[id]/_components/create-period-dialog.tsx` - Crear períodos

**Server actions:**
- `/src/server/actions/schedules-v2.ts` - TODAS las operaciones del sistema V2

### Testing y Validación

**Completado ✅:**
- [x] Plantilla creada correctamente con al menos 1 período
- [x] Editor semanal muestra badge correcto (40h → "~40h", 41h → "Más de 40h")
- [x] Asignación de empleados funciona (multi-select + batch assignment)
- [x] Empleados asignados se muestran en pestaña "Empleados"
- [x] Desasignación funciona con confirmación
- [x] Búsqueda de empleados filtra correctamente
- [x] Solo aparecen empleados no asignados en dialog de asignación

### Próximos Pasos (Migración V1 → V2)

**Fase 1: Integración con Wizard de Empleados (PENDIENTE)**
1. ❌ **Crear componente `ScheduleTemplateSelector`** para wizard de empleados
   - Dropdown o cards para seleccionar plantilla existente
   - Mostrar descripción y tipo de cada plantilla
   - Opcional: permitir "sin horario" temporalmente

2. ❌ **Actualizar `/src/app/(main)/dashboard/employees/new/page.tsx`**
   - Reemplazar Step 3 actual con `ScheduleTemplateSelector`
   - Integrar con el flujo de creación de empleado
   - Asignación automática al finalizar wizard

**Fase 2: Aplicación del Horario en Fichajes (CRÍTICO - SIGUIENTE)**
3. ❌ **Implementar validación de horario en fichajes**
   - Obtener horario asignado del empleado para la fecha actual
   - Comparar entrada/salida con horario esperado
   - Marcar desviaciones (tarde, temprano, horas extra)
   - Calcular horas trabajadas vs. horas esperadas

4. ❌ **Crear componente de visualización de horario personal**
   - Vista para que el empleado vea su horario asignado
   - Calendario semanal con franjas horarias
   - Ubicación: `/dashboard/me/schedule`

5. ❌ **Integrar horarios con cálculo de nómina**
   - Calcular horas ordinarias según horario
   - Identificar horas extras (fuera de horario asignado)
   - Detectar ausencias (falta de fichaje en horario esperado)

**Fase 3: Limpieza y Optimización**
6. ❌ **Script de migración** para convertir datos V1 existentes
7. ❌ **Eliminar Step 3 del wizard V1** una vez migrados todos los datos
8. ❌ **Actualizar documentación** del wizard para reflejar nuevo flujo

### Funcionalidades Críticas Pendientes

**🔴 ALTA PRIORIDAD - Aplicación de Horarios:**
- Validar fichajes contra horario asignado
- Calcular desviaciones (retrasos, salidas anticipadas)
- Marcar horas extras automáticamente
- Detectar ausencias por falta de fichaje

**🟡 MEDIA PRIORIDAD - UX Empleado:**
- Vista de horario personal para empleados
- Notificaciones de cambios de horario
- Historial de horarios asignados

**🟢 BAJA PRIORIDAD - Mejoras:**
- Plantillas compartidas entre organizaciones
- Importar/exportar plantillas
- Duplicar plantillas existentes

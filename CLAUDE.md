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

# Generate theme presets
npm run generate:presets
```

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
- Usar migraciones incrementales: `npx prisma migrate dev --name descripcion-cambio`
- Esto permite:
  - Detectar errores temprano
  - Ajustar el modelo según necesidades reales
  - Evitar complejidad innecesaria
  - Mantener un historial claro de cambios

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
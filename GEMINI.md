# GEMINI.md - Project Context & Guidelines

## Language Preference
**IMPORTANTE:** Por favor, **SIEMPRE** responde en **Español** cuando trabajes en este proyecto.

## Project Overview
**TimeNow ERP** is a comprehensive SaaS B2B Enterprise Resource Planning system focused on Human Resources, Time Tracking, PTO management, and Electronic Signatures. It is built with **Next.js 15**, **TypeScript**, and **Prisma**, following a multi-tenant architecture.

## Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL
- **ORM:** Prisma (with multi-tenant helper patterns)
- **Styling:** Tailwind CSS v4, Shadcn UI (Radix UI based), OKLCH color space
- **State Management:** Zustand
- **Forms & Validation:** React Hook Form, Zod
- **Tables:** TanStack Table (Headless)
- **Authentication:** NextAuth.js v5 (Auth.js)
- **Maps:** Leaflet / React-Leaflet

## Development Workflow

### Key Commands
| Command | Description |
|---------|-------------|
| `npm run dev` | Starts the development server (Turbopack) on **Port 3000**. |
| `npm run build` | Builds the application for production. |
| `npm run lint` | Runs ESLint. **Must pass before committing.** |
| `npx prisma db push` | Syncs schema to DB without creating a migration history (Use for local dev). |
| `npx prisma migrate dev` | Creates a versioned migration. **Mandatory before merging to main.** |

### Port Management
*   **Strictly use Port 3000.**
*   If occupied: `pkill -f "next|node.*3000"`

### Database & Migrations
*   **Strategy:** Incremental schema development.
*   **Workflow:**
    1.  Modify `schema.prisma`.
    2.  `npx prisma db push` to test locally.
    3.  `npx prisma migrate dev --name <descriptive_name>` **BEFORE** commit/merge.
*   **Multi-tenancy:** Most models require an `orgId`. Use the `createOrgPrisma` helper or ensure `where: { orgId }` is applied to all queries to prevent data leaks.

## Architecture & Patterns

### App Router Structure
*   `src/app/(external)`: Public routes (landing pages).
*   `src/app/(main)`: Protected application routes (require auth).
*   **Colocation Pattern:** Feature-specific components, hooks, and utils are stored *inside* the route folder in `_components/`, `_hooks/`, etc.
    *   Example: `src/app/(main)/dashboard/employees/_components/employee-table.tsx`

### Server vs. Client Components
*   **Default:** Server Components (Data fetching, Layouts).
*   **Client:** Use `'use client'` for interactivity (Forms, State, Event Listeners).
*   **Serialization:** `Decimal` types from Prisma must be serialized to `number` or `string` before passing to Client Components.

## Coding Standards & Rules

### ESLint & Code Quality
*   **Nullish Coalescing:** NEVER use `||` for defaults; always use `??`.
*   **Catch Blocks:** Use `catch {}` if the error variable is unused.
*   **Unused Imports:** Remove them.
*   **Validation:** Use Zod schemas for both frontend forms and backend API routes.

### Safari Compatibility (CRITICAL)
*   **Backdrop Filter:** Always provide a solid color fallback via `@supports`.
*   **Borders/Lines:** Never use opacity (e.g., `bg-gray-200/50`) for thin lines. Use solid hex colors. Minimum height/width `2px`.
*   **Layout:** Avoid `h-screen` with `fixed` footers. Use `min-h-screen` + `sticky`.

### UI Guidelines
*   **Components:** Use existing **Shadcn UI** components from `src/components/ui`. Do not create custom UI primitives.
*   **Data Tables:** Follow the "Professional" pattern:
    *   Include Tabs (e.g., "All", "Active", "Archived").
    *   Use `TanStack Table` with pagination, sorting, and column visibility toggles.
    *   See `/dashboard/default` as the design "Gold Standard".

## Key Features Context

### Geolocation
*   **GPS Tracking:** Configurable per organization.
*   **Privacy:** User consent required (RGPD).
*   **Logic:** `src/lib/geolocation.ts` and `src/server/actions/geolocation.ts`.

### Schedule System V2
*   **Engine:** `src/lib/schedule-engine.ts` handles complex shifts, rotations, and exceptions.
*   **Storage:** `ScheduleTemplate`, `SchedulePeriod`, `EmployeeScheduleAssignment`.
*   **Integration:** Time tracking automatically calculates deviations from the assigned schedule.

### Shift Planner (Dashboard → Shifts)
*   **Backend:** Server Actions en `src/server/actions/schedules-v2.ts` (`ManualShiftAssignment`, `ManualShiftTemplate`, zonas).
*   **Servicio/UI:** `_lib/shift-service.ts` + `_store/shifts-store.tsx` + `_components/*` (calendarios, diálogos y tablas).
*   **Capacidades:** drag & drop, plantillas reutilizables, aplicación masiva, copy/publish week y configuración multicentro.

## Documentation
*   Refer to `TECHNICAL.md` for deep dives into the stack.
*   Refer to `CLAUDE.md` for specific AI-assistant behavioral rules (Spanish language preference, etc.).
*   Domain documentation is located in `docs/` (e.g., `PLAN_MIGRACION_HORARIOS_V2.md`).

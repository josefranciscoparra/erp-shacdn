# Módulo de Turnos - Plan de UI con Mocks

## 📋 Resumen Ejecutivo

### Objetivo

Crear interfaz de usuario completa y funcional para el **Módulo de Gestión de Turnos Rotativos** de TimeNow, orientado a sectores de retail y hospitality (tiendas, hoteles, restaurantes, gimnasios). Esta implementación incluye únicamente la capa de presentación con datos mock desacoplados, lista para integrar con backend real posteriormente.

### Alcance

- ✅ **SÍ incluye**: UI completa, interacciones (drag & drop), validaciones visuales, datos mock en memoria
- ❌ **NO incluye**: Base de datos, migraciones Prisma, API real, persistencia, lógica de negocio real

### Sectores Objetivo

- **Retail**: Tiendas con horarios cambiantes, turnos de mañana/tarde/noche
- **Hospitality**: Hoteles (recepción, limpieza), restaurantes (cocina, barra, sala), gimnasios
- **Estructura genérica**: Lugares → Zonas → Empleados asignados a turnos

---

## 🎯 Decisiones Arquitectónicas Clave

### 1. Integración con Sistema Existente

#### Campo de Activación de Turnos

- **Decisión**: Añadir campo `usesShiftSystem: boolean` al modelo `Employee`
- **Razón**: Permite que empleados individuales elijan entre:
  - Jornada fija tradicional (sistema actual)
  - Sistema de turnos rotativos (módulo nuevo)
- **Implementación**: Solo en tipos TypeScript mock, NO migración Prisma aún

#### Lugares de Trabajo

- **Decisión**: Reutilizar modelo `CostCenter` existente como "Lugares"
- **Razón**: Evita duplicación, CostCenter ya tiene nombre, dirección, timezone
- **Mapeo**:
  - `CostCenter` = Lugar de trabajo físico
  - `Zone` (nuevo) = Área dentro del lugar (ej: Cocina, Barra, Recepción)

### 2. Desacoplamiento de Mocks

#### Arquitectura en Capas

```
┌─────────────────────────────────────┐
│  Componentes UI (React)             │ ← NO tocan mocks directamente
├─────────────────────────────────────┤
│  Zustand Store                       │ ← Usa interfaz IShiftService
├─────────────────────────────────────┤
│  IShiftService (interface)           │ ← Contrato público
├─────────────────────────────────────┤
│  ShiftServiceMock (implementación)   │ ← Mock aquí, fácil de reemplazar
└─────────────────────────────────────┘
```

#### Ventajas

- Componentes UI no conocen el mock
- Cambiar a API real: modificar 1 línea en el store
- Tests: inyectar mock diferente sin tocar UI
- Código limpio y mantenible

### 3. Validaciones

#### Estrategia: Solo Warnings Visuales

- **Decisión**: Validaciones NO bloquean guardado, solo advierten
- **Razón**: Flexibilidad operativa (situaciones especiales, urgencias)
- **Implementación**:
  - Badge rojo ⚠️ en turnos conflictivos
  - Toast/Alert con mensaje claro
  - Estado `status: 'conflict'` visible en UI
- **Validaciones mock**:
  - ✅ Solapamiento de turnos del mismo empleado
  - ✅ Descanso mínimo < 12h entre turnos
  - ✅ Ausencias (vacaciones/bajas registradas)
  - ✅ Horas semanales excedidas

---

## 🗺️ Mapa de Pantallas y Flujos

### Navegación Principal

```
/dashboard/shifts (Cuadrante) ─┬─ Vista: Semana por Empleado (default)
                               ├─ Vista: Mes por Empleado
                               └─ Vista: Semana por Áreas

/dashboard/shifts (Tabs)       ─┬─ Cuadrante (calendario operativo)
                               ├─ Plantillas (gestión de rotaciones)
                               └─ Configuración (zonas de trabajo)
```

### Pantalla 1: Cuadrante - Vista Semana por Empleado

**Layout**:

```
┌────────────────────────────────────────────────────────────┐
│ [Filtros: Lugar | Zona | Rol | Estado] [Semana: ◀ Nov 11-17 ▶] │
│ [Vista: 📅 Semana | 📆 Mes] [Modo: 👤 Empleado | 🏢 Áreas]     │
├────────────────────────────────────────────────────────────┤
│                Lun 11  Mar 12  Mié 13  Jue 14  Vie 15 ...  │
├────────────────────────────────────────────────────────────┤
│ Juan Pérez     [08:00-16:00] [09:00-17:00] ...  40/40h 🟢 │
│ María García   [---]         [14:00-22:00] ...  32/40h 🟡 │
│ Carlos López   [08:00-16:00⚠️] [Ausencia]  ...  24/40h 🟢 │
│                                                             │
│ [+ Nuevo Turno]  [Copiar Semana Anterior]  [📢 Publicar]  │
└────────────────────────────────────────────────────────────┘
```

**Funcionalidades**:

- ✅ Grid responsive con scroll horizontal/vertical
- ✅ Cada celda vacía muestra botón `+` al hover
- ✅ Turnos son bloques visuales (drag & drop con dnd-kit)
- ✅ Arrastrar turno entre empleados/días
- ✅ Redimensionar turno horizontalmente para cambiar duración
- ✅ Indicador por empleado: `Horas asignadas / Jornada pactada`
  - 🟢 Verde: 90-110% de jornada
  - 🟡 Ámbar: 70-89% o 111-130%
  - 🔴 Rojo: <70% o >130%
- ✅ Badge ⚠️ en turnos conflictivos (click → tooltip con detalles)

### Pantalla 2: Cuadrante - Vista Mes por Empleado

**Layout**: Similar a vista semanal pero más compacto

- Columnas: 30 días (scroll horizontal)
- Celdas: Resumen `8-16h` en lugar de bloques grandes
- Contadores: Total mensual de horas por empleado

### Pantalla 3: Cuadrante - Vista Semana por Áreas

**Layout**:

```
┌────────────────────────────────────────────────────────────┐
│                Lun 11      Mar 12      Mié 13    ...       │
├────────────────────────────────────────────────────────────┤
│ Recepción     [3/2 🟢]    [2/2 🟢]    [1/2 🔴]  ...       │
│ Cocina        [4/5 🔴]    [5/5 🟢]    [3/5 🟡]  ...       │
│ Barra         [2/3 🟡]    [3/3 🟢]    [2/3 🟡]  ...       │
└────────────────────────────────────────────────────────────┘

Leyenda: [Asignados/Requeridos]
```

**Funcionalidades**:

- ✅ Heatmap visual: color de fondo según ratio asignados/requeridos
  - 🟢 Verde: >= requeridos
  - 🟡 Ámbar: 70-99% de requeridos
  - 🔴 Rojo: < 70% requeridos
- ✅ Click en celda → Modal crear turno pre-rellenado con zona y día
- ✅ Tooltip al hover: Listado de empleados asignados

### Pantalla 4: Modal Crear/Editar Turno

**Campos**:

```
┌─────────────────────────────────────┐
│ Crear Turno                     [X] │
├─────────────────────────────────────┤
│ Empleado *:  [Juan Pérez      ▼]   │
│ Fecha *:     [Nov 18, 2025     📅]  │
│ Inicio *:    [08:00           🕐]   │
│ Fin *:       [16:00           🕐]   │
│ Lugar *:     [Hotel Centro    ▼]   │
│ Zona *:      [Recepción       ▼]   │
│ Rol:         [Turno mañana      ]   │
│ Notas:       [                  ]   │
│                                      │
│ ⚠️ Advertencias:                    │
│ • Descanso mínimo 8h desde último  │
│   turno (termina 23:00 del día 17) │
│                                      │
│ [Cancelar]           [Guardar]      │
└─────────────────────────────────────┘
```

**Validaciones Visuales** (warnings, no bloquean):

- ⚠️ **Ausencia**: "Empleado en vacaciones del 20-25 Nov"
- ⚠️ **Solapamiento**: "Ya tiene turno 09:00-17:00 este día"
- ⚠️ **Descanso mínimo**: "Menos de 12h desde último turno"
- ⚠️ **Horas semanales**: "Excede 150% de jornada semanal"

**Estados del Turno**:

- `draft`: Borrador (gris)
- `published`: Publicado (azul)
- `conflict`: Con conflicto (rojo con ⚠️)

### Pantalla 5: Plantillas

**Tabla de Plantillas**:

```
┌──────────────────────────────────────────────────────────┐
│ Nombre                Patrón           Duración  Acciones│
├──────────────────────────────────────────────────────────┤
│ Rotativo M-T-N-D     M→T→N→Descanso    8h       [📋][✏️] │
│ Fines de Semana      S→D→Descanso      10h      [📋][✏️] │
└──────────────────────────────────────────────────────────┘

[+ Nueva Plantilla]
```

**Modal Aplicar Plantilla**:

```
┌─────────────────────────────────────┐
│ Aplicar Plantilla               [X] │
├─────────────────────────────────────┤
│ Plantilla *:  [Rotativo M-T-N-D ▼] │
│ Empleados *:  [Juan, María, ... ▼] │
│ Fecha inicio*:[Nov 18, 2025    📅]  │
│ Fecha fin *:  [Dic 31, 2025    📅]  │
│ Grupo inicial:[Turno 1         ▼]  │
│ Lugar *:      [Hotel Centro    ▼]  │
│ Zona *:       [Recepción       ▼]  │
│                                      │
│ 📊 Vista previa:                    │
│ • 3 empleados x 6 semanas = 18 turnos│
│ • Patrón: M→T→N→D (rotación 4 días) │
│                                      │
│ [Cancelar]         [Aplicar]        │
└─────────────────────────────────────┘
```

### Pantalla 6: Configuración - Zonas de Trabajo

**CRUD de Zonas**:

```
┌──────────────────────────────────────────────────────────┐
│ Zonas de Trabajo                                         │
├──────────────────────────────────────────────────────────┤
│ Nombre         Lugar            Cobertura  Activo Acciones│
├──────────────────────────────────────────────────────────┤
│ Recepción     Hotel Centro      M:2 T:2    ✓     [✏️][🗑️] │
│ Cocina        Restaurante       M:3 T:4    ✓     [✏️][🗑️] │
│ Barra         Restaurante       M:2 T:3    ✓     [✏️][🗑️] │
└──────────────────────────────────────────────────────────┘

[+ Nueva Zona]
```

**Modal Crear/Editar Zona**:

- Nombre, Lugar (CostCenter), Activo
- Cobertura requerida (JSON mock): `{ morning: 2, afternoon: 3, night: 1 }`

---

## 🎨 Decisiones de UX/UI

### Principios de Diseño

1. **Consistencia**: Seguir patrón establecido en `/dashboard/default`
2. **Feedback inmediato**: Toasts, badges, colores semánticos
3. **Accesibilidad**: Navegación por teclado, ARIA labels, contraste WCAG AA
4. **Responsive**: Móvil (stack vertical), Tablet (grid 2 cols), Desktop (grid completo)

### Paleta de Colores (Variables CSS existentes)

- **Estados turnos**:
  - Draft: `bg-muted` (gris)
  - Published: `bg-primary/10 border-primary` (azul)
  - Conflict: `bg-destructive/10 border-destructive` (rojo)
- **Heatmap áreas**:
  - 🟢 OK: `bg-emerald-100 dark:bg-emerald-950/30`
  - 🟡 Justo: `bg-amber-100 dark:bg-amber-950/30`
  - 🔴 Faltan: `bg-red-100 dark:bg-red-950/30`
- **Semáforo horas**:
  - 🟢 Verde: `text-emerald-600`
  - 🟡 Ámbar: `text-amber-600`
  - 🔴 Rojo: `text-red-600`

### Componentes shadcn/ui Utilizados

- `DataTable`, `Tabs`, `Select`, `Calendar`, `Badge`
- `Dialog`, `Form`, `Input`, `Button`, `Card`
- `Tooltip`, `DropdownMenu`, `Switch`, `Toast`
- `Alert`, `Skeleton` (loading states)

### Interacciones Drag & Drop

- **Librería**: `@dnd-kit/core` (ya instalada en proyecto)
- **Drag**: Turno completo se arrastra a otra celda (empleado/día)
- **Resize**: Esquinas del bloque de turno para cambiar duración
- **Feedback visual**:
  - Bloque arrastrado: `opacity-50`
  - Celda destino válida: `border-2 border-dashed border-primary`
  - Celda destino inválida: `border-2 border-dashed border-destructive`

### Estados Vacíos

Cada vista sin datos muestra:

- Icono ilustrativo (Lucide React)
- Mensaje claro: "No hay turnos para esta semana"
- CTA: "Crear primer turno" o "Aplicar plantilla"

---

## 🧩 Componentes Clave y Responsabilidades

### 1. `shifts-view-selector.tsx`

**Responsabilidad**: Toggle vista (Semana/Mes) + Modo (Empleado/Área)
**Props**:

```typescript
interface ShiftsViewSelectorProps {
  view: "week" | "month";
  mode: "employee" | "area";
  onViewChange: (view: "week" | "month") => void;
  onModeChange: (mode: "employee" | "area") => void;
}
```

### 2. `shifts-filters-bar.tsx`

**Responsabilidad**: Filtros (Lugar, Zona, Rol, Estado) + Navegación semana
**Props**:

```typescript
interface ShiftsFiltersBarProps {
  filters: ShiftFilters;
  onFiltersChange: (filters: Partial<ShiftFilters>) => void;
  currentWeek: Date;
  onWeekChange: (date: Date) => void;
}
```

### 3. `calendar-week-employee.tsx`

**Responsabilidad**: Grid semanal, drag & drop, mostrar turnos por empleado
**Props**:

```typescript
interface CalendarWeekEmployeeProps {
  shifts: Shift[];
  employees: Employee[];
  weekStart: Date;
  onShiftMove: (shiftId: string, newEmployeeId: string, newDate: Date) => void;
  onShiftResize: (shiftId: string, newStart: string, newEnd: string) => void;
  onShiftClick: (shift: Shift) => void;
  onCreateShift: (employeeId: string, date: Date) => void;
}
```

### 4. `shift-block.tsx`

**Responsabilidad**: Bloque visual de turno (draggable, resizable)
**Props**:

```typescript
interface ShiftBlockProps {
  shift: Shift;
  onClick: () => void;
  isDragging?: boolean;
}
```

### 5. `shift-dialog.tsx`

**Responsabilidad**: Modal crear/editar turno con validaciones visuales
**Props**:

```typescript
interface ShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift?: Shift; // undefined = crear, definido = editar
  onSave: (data: ShiftInput) => Promise<void>;
}
```

---

## 📂 Estructura de Archivos Completa

```
src/app/(main)/dashboard/shifts/
├── TURNOS_UI_PLAN.md                    # Este documento
│
├── _lib/                                 # Core business logic (mock)
│   ├── types.ts                         # Tipos TS: Shift, Zone, Template, ShiftFilters, etc.
│   ├── shift-service.interface.ts       # IShiftService (contrato público)
│   ├── shift-service.mock.ts            # Implementación mock + seed data
│   ├── shift-validations.ts            # Validaciones mock (conflictos, descansos)
│   └── shift-utils.ts                   # Helpers (formateo fechas, cálculos, colores)
│
├── _store/
│   └── shifts-store.tsx                 # Zustand store (usa IShiftService)
│
├── _components/
│   ├── shifts-view-selector.tsx         # Toggle vista/modo
│   ├── shifts-filters-bar.tsx           # Filtros + navegación semana
│   ├── calendar-week-employee.tsx       # Grid semanal empleados (DnD)
│   ├── calendar-month-employee.tsx      # Grid mensual empleados
│   ├── calendar-week-area.tsx           # Grid semanal áreas (heatmap)
│   ├── shift-block.tsx                  # Bloque visual turno (draggable)
│   ├── shift-dialog.tsx                 # Modal crear/editar turno
│   ├── shift-conflicts-badge.tsx        # Badge ⚠️ conflictos
│   ├── templates-table.tsx              # Tabla de plantillas
│   ├── template-apply-dialog.tsx        # Modal aplicar plantilla
│   ├── publish-bar.tsx                  # Barra de publicación
│   ├── empty-states.tsx                 # Estados vacíos por vista
│   └── zones-crud.tsx                   # CRUD zonas de trabajo
│
├── page.tsx                             # Página principal (tabs: Cuadrante | Plantillas)
└── config/
    └── page.tsx                         # Página configuración zonas
```

---

## 🔌 Puntos de Extensión para Backend Real

### Cambio de Mock a API Real (3 pasos)

#### Paso 1: Crear implementación real

```typescript
// shift-service.api.ts
export class ShiftServiceAPI implements IShiftService {
  async getShifts(filters: ShiftFilters): Promise<Shift[]> {
    const response = await fetch("/api/shifts", {
      method: "POST",
      body: JSON.stringify(filters),
      credentials: "include",
    });
    return response.json();
  }
  // ... resto de métodos
}
```

#### Paso 2: Cambiar import en store (1 línea)

```typescript
// shifts-store.tsx
// ANTES:
import { shiftService } from "@/lib/shift-service.mock";
// DESPUÉS:
import { shiftService } from "@/lib/shift-service.api";
```

#### Paso 3: Listo ✅

- Los componentes NO se tocan
- La UI sigue funcionando igual
- Ahora con datos reales

---

## ✅ Criterios de Aceptación (Checklist)

### Funcionalidad Core

- [ ] Puedo crear un turno desde celda vacía (click +)
- [ ] Puedo editar un turno existente (click en bloque)
- [ ] Puedo eliminar un turno (botón en modal)
- [ ] Puedo arrastrar turno a otro empleado/día (DnD funciona)
- [ ] Puedo redimensionar turno para cambiar duración
- [ ] Copiar semana anterior duplica turnos respetando filtros
- [ ] Filtros (Lugar/Zona/Rol/Estado) afectan todas vistas
- [ ] Navegación semana anterior/siguiente funciona

### Vistas

- [ ] Vista Semana por Empleado muestra grid correctamente
- [ ] Vista Mes por Empleado muestra resúmenes compactos
- [ ] Vista Semana por Área muestra heatmap asignados/requeridos
- [ ] Cambiar entre vistas mantiene filtros y semana actual
- [ ] Indicador horas/jornada con semáforo por empleado
- [ ] Estados vacíos con iconos y CTAs en todas vistas

### Validaciones y Conflictos

- [ ] Turnos conflictivos muestran badge ⚠️ rojo
- [ ] Click en badge muestra tooltip con detalle del conflicto
- [ ] Warnings por: solapamiento, descanso mínimo, ausencia, horas excedidas
- [ ] Validaciones NO bloquean guardado (solo advierten)

### Plantillas

- [ ] Puedo listar plantillas en tabla
- [ ] Puedo aplicar plantilla a múltiples empleados
- [ ] Modal aplicar plantilla muestra vista previa
- [ ] Aplicar plantilla crea turnos mock correctamente

### Publicación

- [ ] Botón Publicar cambia turnos de draft → published
- [ ] Toast de confirmación "X turnos publicados"
- [ ] Badge visual diferencia draft vs published

### Configuración

- [ ] Puedo crear/editar/eliminar zonas de trabajo
- [ ] Zonas se vinculan a lugares (CostCenters)
- [ ] Cambios en zonas reflejan en selectores

### Desacoplamiento

- [ ] Componentes NO importan shift-service.mock directamente
- [ ] Store usa interfaz IShiftService
- [ ] Puedo cambiar a API real modificando 1 línea
- [ ] Código limpio, sin lógica mock en componentes

### UX y Accesibilidad

- [ ] Navegación por teclado funciona (Tab, Enter, Esc)
- [ ] Roles ARIA correctos en grids y modales
- [ ] Contraste de colores WCAG AA
- [ ] Responsive: móvil (stack), tablet (2 cols), desktop (full grid)
- [ ] Loading states (Skeleton) durante operaciones async
- [ ] Toasts informativos en acciones (crear, editar, eliminar)
- [ ] Confirmación antes de eliminar turno

---

## 📊 Datos Mock - Semilla Inicial

### CostCenters (Lugares) - Reutilizar existentes

```typescript
const MOCK_COST_CENTERS = [
  { id: "cc1", name: "Hotel Centro Madrid", timezone: "Europe/Madrid" },
  { id: "cc2", name: "Restaurante Plaza Mayor", timezone: "Europe/Madrid" },
  { id: "cc3", name: "Tienda Gran Vía", timezone: "Europe/Madrid" },
];
```

### Zonas de Trabajo

```typescript
const MOCK_ZONES = [
  {
    id: "z1",
    name: "Recepción",
    costCenterId: "cc1",
    requiredCoverage: { morning: 2, afternoon: 2, night: 1 },
    active: true,
  },
  {
    id: "z2",
    name: "Limpieza",
    costCenterId: "cc1",
    requiredCoverage: { morning: 3, afternoon: 1, night: 0 },
    active: true,
  },
  {
    id: "z3",
    name: "Cocina",
    costCenterId: "cc2",
    requiredCoverage: { morning: 3, afternoon: 4, night: 2 },
    active: true,
  },
  {
    id: "z4",
    name: "Barra",
    costCenterId: "cc2",
    requiredCoverage: { morning: 2, afternoon: 3, night: 2 },
    active: true,
  },
  {
    id: "z5",
    name: "Sala",
    costCenterId: "cc2",
    requiredCoverage: { morning: 2, afternoon: 4, night: 3 },
    active: true,
  },
  {
    id: "z6",
    name: "Caja",
    costCenterId: "cc3",
    requiredCoverage: { morning: 2, afternoon: 2, night: 1 },
    active: true,
  },
  {
    id: "z7",
    name: "Almacén",
    costCenterId: "cc3",
    requiredCoverage: { morning: 1, afternoon: 1, night: 0 },
    active: true,
  },
];
```

### Empleados

```typescript
const MOCK_EMPLOYEES = [
  {
    id: "e1",
    firstName: "Juan",
    lastName: "Pérez",
    contractHours: 40,
    usesShiftSystem: true,
    costCenterId: "cc1",
    absences: [{ start: "2025-11-20", end: "2025-11-25", reason: "Vacaciones" }],
  },
  {
    id: "e2",
    firstName: "María",
    lastName: "García",
    contractHours: 40,
    usesShiftSystem: true,
    costCenterId: "cc1",
    absences: [],
  },
  {
    id: "e3",
    firstName: "Carlos",
    lastName: "López",
    contractHours: 30,
    usesShiftSystem: true,
    costCenterId: "cc2",
    absences: [],
  },
  // ... 10-15 empleados totales
];
```

### Turnos (Semana Actual)

```typescript
const MOCK_SHIFTS = [
  {
    id: "s1",
    employeeId: "e1",
    date: "2025-11-18",
    startTime: "08:00",
    endTime: "16:00",
    costCenterId: "cc1",
    zoneId: "z1",
    role: "Turno mañana",
    status: "published",
    notes: "",
  },
  {
    id: "s2",
    employeeId: "e1",
    date: "2025-11-19",
    startTime: "09:00",
    endTime: "17:00",
    costCenterId: "cc1",
    zoneId: "z1",
    role: "Turno mañana",
    status: "published",
    notes: "",
  },
  // ... 30-50 turnos para semana actual
];
```

### Plantillas

```typescript
const MOCK_TEMPLATES = [
  {
    id: "t1",
    name: "Rotativo Mañana-Tarde-Noche-Descanso",
    pattern: ["morning", "afternoon", "night", "off"],
    shiftDuration: 8, // horas
    description: "Rotación clásica 4 días: M→T→N→D",
  },
  {
    id: "t2",
    name: "Fines de Semana",
    pattern: ["saturday", "sunday", "off", "off"],
    shiftDuration: 10, // horas
    description: "Solo sábados y domingos",
  },
];
```

---

## 🎨 Guía de Estilos y Componentes

### Colores Semánticos (Variables CSS)

```css
/* Estados turnos */
--shift-draft: hsl(var(--muted));
--shift-published: hsl(var(--primary) / 0.1);
--shift-conflict: hsl(var(--destructive) / 0.1);

/* Heatmap */
--heatmap-ok: hsl(142 76% 90%); /* Emerald 100 */
--heatmap-warning: hsl(43 96% 90%); /* Amber 100 */
--heatmap-danger: hsl(0 93% 94%); /* Red 100 */

/* Semáforo horas */
--traffic-green: hsl(142 71% 45%); /* Emerald 600 */
--traffic-amber: hsl(32 95% 44%); /* Amber 600 */
--traffic-red: hsl(0 72% 51%); /* Red 600 */
```

### Componentes Reutilizables (ya existentes)

- **SectionHeader**: Título + botón acción (de `/components/hr/section-header.tsx`)
- **EmptyState**: Estado vacío con icono (de `/components/hr/empty-state.tsx`)
- **DataTable**: Tabla profesional (de `/components/data-table/`)
- **Badge**: Para estados y conflictos
- **Tooltip**: Para detalles al hover

---

## ♿ Notas de Accesibilidad

### Navegación por Teclado

- **Tab**: Navegar entre filtros, turnos, botones
- **Enter**: Abrir modal editar turno
- **Escape**: Cerrar modales
- **Flechas**: Navegar grid calendario (↑↓←→)
- **Space**: Seleccionar opciones en combos

### ARIA Labels

```tsx
// Ejemplo grid calendario
<div
  role="grid"
  aria-label="Calendario de turnos semanal"
>
  <div role="row" aria-label="Empleado Juan Pérez">
    <div
      role="gridcell"
      aria-label="Lunes 18 Noviembre, turno 08:00 a 16:00"
      tabIndex={0}
    >
      {/* Bloque turno */}
    </div>
  </div>
</div>

// Ejemplo botón crear turno
<Button
  aria-label="Crear nuevo turno para Juan Pérez el Lunes 18"
  onClick={() => handleCreate()}
>
  +
</Button>
```

### Contraste y Legibilidad

- Texto sobre fondos: ratio mínimo 4.5:1 (WCAG AA)
- Iconos informativos + texto alternativo
- Estados visuales NO solo por color (usar iconos + texto)

---

## ⚡ Notas de Rendimiento

### Optimizaciones

- **Virtualización**: Si > 50 empleados, usar `@tanstack/react-virtual`
- **Memoización**: `useMemo` para cálculos pesados (validaciones, totales)
- **React.memo**: Componentes `ShiftBlock`, `CalendarCell`
- **Debounce**: Filtros con delay 300ms para evitar renders innecesarios

### Lazy Loading

```tsx
// Cargar vistas solo cuando se activan
const CalendarWeekArea = lazy(() => import("./calendar-week-area"));
const TemplatesTable = lazy(() => import("./templates-table"));
```

---

## 🚀 Próximos Pasos (Fuera de Alcance)

### Sprint 2: Backend Real

1. Migraciones Prisma: `Shift`, `Zone`, `ShiftTemplate`, `usesShiftSystem` en Employee
2. Server Actions: CRUD turnos, validaciones reales
3. Integración con absencias (PtoRequest)
4. Sistema de notificaciones (publicación de turnos)

### Sprint 3: Funcionalidades Avanzadas

1. Aprobación de turnos (workflow)
2. Solicitudes de cambio de turno entre empleados
3. Exportación de cuadrantes (PDF, Excel)
4. Integración con fichajes (TimeEntry)
5. Reportes: horas trabajadas vs planificadas

---

## 📝 Changelog y Versiones

### v0.1.0 - UI Mock Inicial (Actual)

- ✅ Documento de plan completo
- ⏳ Implementación de UI con mocks desacoplados
- ⏳ Vistas: Semana/Mes por Empleado, Semana por Área
- ⏳ Drag & drop con dnd-kit
- ⏳ Validaciones visuales (warnings)
- ⏳ Plantillas y publicación
- ⏳ Configuración de zonas

### v0.2.0 - Backend Real (Futuro)

- [ ] Migraciones Prisma
- [ ] API real con Server Actions
- [ ] Persistencia en base de datos
- [ ] Integración con ausencias

### v1.0.0 - Producción (Futuro)

- [ ] Sistema de aprobación
- [ ] Notificaciones push
- [ ] Reportes avanzados
- [ ] Exportación PDF/Excel

---

**Fecha de creación**: 2025-11-12
**Última actualización**: 2025-11-12
**Autor**: Claude Code (Anthropic)
**Versión**: 0.1.0

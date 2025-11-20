# UI Cuadrante de Turnos - Rediseño v2

**Fecha**: 12 Nov 2025
**Estado**: 🎨 Solo UI con datos MOCK
**Inspiración**: Google Calendar, Factorial, Linear, Monday.com

---

## 🎯 Objetivos

Crear un calendario de turnos con:

- ✅ Excelente jerarquía visual
- ✅ Barras de duración proporcionales tipo Gantt
- ✅ Información mínima pero útil
- ✅ Navegación sticky
- ✅ Legible incluso con 20+ empleados
- ✅ Modo compacto toggle

---

## 📐 Wireframe

```
┌────────────────────────────────────────────────────────────────────┐
│  Gestión de Turnos                              [Nuevo Turno]      │
│  ──────────────────────────────────────────────────────────────    │
│  [Dashboard] [Cuadrante] [Plantillas] [Configuración]              │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│  Lugar: [Todos]  Zona: [Todas]  Rol: [Todos]  [Más filtros]       │
│  Agrupar por: ◉ Empleado  ○ Áreas                                 │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐ ← STICKY
│         [ < ]    10 – 16 nov 2025    [ > ]    [Hoy]                │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│         │  LUN    │  MAR    │  MIÉ    │  JUE    │  VIE    │  SÁB  │
│         │   10    │   11    │   12    │   13    │   14    │   15  │
│         ├─────────┼─────────┼─────────┼─────────┼─────────┼───────│
│  [F]    │┌──────┐ │┌──────┐ │┌──────┐ │┌──────┐ │┌──────┐ │       │
│ Francesc││10-18 │ ││10-18 │ ││10-18 │ ││10-18 │ ││10-18 │ │       │
│ 40h/40h │││ 8h  │ │││ 8h  │ │││ 8h  │ │││ 8h  │ │││ 8h  │ │       │
│         ││Planta│ ││Planta│ ││Planta│ ││Planta│ ││Planta│ │       │
│         │└──────┘ │└──────┘ │└──────┘ │└──────┘ │└──────┘ │       │
│         │         │         │         │         │         │       │
├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼───────│
│  [M]    │         │┌──────┐ │┌──────┐ │┌──────┐ │┌──────┐ │       │
│  Marta  │         ││14-20 │ ││14-20 │ ││16-20 │ ││10-16 │ │       │
│ 24h/30h │         │││ 6h  │ │││ 6h  │ │││ 4h  │ │││ 6h  │ │       │
│         │         ││ Caja │ ││ Caja │ ││ Caja │ ││Planta│ │       │
│         │         │└──────┘ │└──────┘ │└──────┘ │└──────┘ │       │
└─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴───────┘
```

---

## 🎨 Paleta de colores

### Colores principales

- **Primary**: `#7B3EFF` (TimeNow purple)
- **Primary Light**: `#F5E8FF` (fondo turnos)
- **Grises**: slate-50, slate-100, slate-200, slate-300

### Colores semánticos

- **Success**: emerald-500 (cobertura completa)
- **Warning**: amber-500 (cobertura media)
- **Error**: red-500 (conflictos, cobertura baja)

### Fondos y bordes

- **Card background**: white / dark:slate-900
- **Border**: slate-200 / dark:slate-700
- **Shadow**: shadow-sm, hover:shadow-md

---

## 📦 Componentes

### 1. CalendarHeaderV2

**Ubicación**: `_components/cuadrante/calendar-header-v2.tsx`

```tsx
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-2xl font-bold">Cuadrante de Turnos</h1>
    <p className="text-muted-foreground text-sm">Visualiza y gestiona turnos</p>
  </div>
  <Button>
    <Plus /> Nuevo Turno
  </Button>
</div>
```

**Características**:

- Título grande (text-2xl)
- Subtítulo pequeño
- Botón alineado a la derecha
- Sin caja contenedora

---

### 2. FilterBarV2

**Ubicación**: `_components/cuadrante/filter-bar-v2.tsx`

```tsx
<Card className="p-3">
  <div className="flex flex-wrap items-center gap-3">
    {/* Filtros principales */}
    <Select /> {/* Lugar */}
    <Select /> {/* Zona */}
    <Select /> {/* Rol */}
    <Select /> {/* Estado */}
    {/* Botón "Más filtros" */}
    <Button variant="outline" size="sm">
      <SlidersHorizontal /> Más filtros
    </Button>
    {/* Agrupar por */}
    <div className="ml-auto">
      <ToggleGroup type="single">
        <ToggleGroupItem value="employee">Empleado</ToggleGroupItem>
        <ToggleGroupItem value="area">Áreas</ToggleGroupItem>
      </ToggleGroup>
    </div>
  </div>
</Card>
```

**Características**:

- Padding compacto (p-3)
- Selects pequeños (h-9)
- Agrupar por alineado a la derecha
- Botón "Más filtros" con icono

---

### 3. WeekNavigatorV2

**Ubicación**: `_components/cuadrante/week-navigator-v2.tsx`

```tsx
<div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 border-b backdrop-blur">
  <div className="flex items-center justify-center gap-4 py-3">
    <Button variant="ghost" size="icon">
      <ChevronLeft />
    </Button>

    <span className="text-sm font-medium">10 – 16 nov 2025</span>

    <Button variant="ghost" size="icon">
      <ChevronRight />
    </Button>

    <Button variant="outline" size="sm">
      Hoy
    </Button>
  </div>
</div>
```

**Características**:

- **Sticky**: `sticky top-0 z-10`
- Backdrop blur para efecto glassmorphism
- Sin caja, solo border-b
- Botones ghost para navegación
- Botón "Hoy" outline

---

### 4. WeekDaysHeaderV2

**Ubicación**: `_components/cuadrante/week-days-header-v2.tsx`

```tsx
<div className="grid grid-cols-[200px_repeat(7,1fr)] border-b">
  <div /> {/* Espacio empleados */}
  {weekDays.map((day) => (
    <div key={day.date} className="py-3 text-center">
      <div className="text-muted-foreground text-xs font-medium uppercase">{day.dayName}</div>
      <div className="mt-1 text-2xl font-bold">{day.dayNumber}</div>
    </div>
  ))}
</div>
```

**Características**:

- Grid con columna fija de 200px para empleados
- Día pequeño uppercase (LUN)
- Número grande (10)
- Border bottom elegante

---

### 5. EmployeeRowV2

**Ubicación**: `_components/cuadrante/employee-row-v2.tsx`

```tsx
<div className="grid min-h-[80px] grid-cols-[200px_repeat(7,1fr)] border-b">
  {/* Columna empleado */}
  <div className="flex items-center gap-3 border-r bg-slate-50 p-4">
    {/* Avatar */}
    <Avatar className="size-10">
      <AvatarFallback className="bg-primary/10 text-primary font-semibold">F</AvatarFallback>
    </Avatar>

    {/* Info */}
    <div className="flex-1">
      <p className="text-sm font-semibold">Francesc</p>
      <Badge variant="outline" className="mt-1 text-xs">
        40h/40h
      </Badge>
    </div>
  </div>

  {/* Columnas de días */}
  {weekDays.map((day) => (
    <div key={day.date} className="border-r p-2">
      {/* Aquí van las ShiftCards */}
    </div>
  ))}
</div>
```

**Características**:

- Columna empleado: fondo slate-50, border-r
- Avatar con inicial
- Nombre + badge de horas
- Altura mínima 80px
- Columnas días con padding p-2

---

### 6. ShiftCardV2

**Ubicación**: `_components/cuadrante/shift-card-v2.tsx`

```tsx
<div className="group relative">
  <div className="rounded-xl border bg-[#F5E8FF] p-3 shadow-sm transition-all hover:shadow-md">
    {/* Rango horario */}
    <div className="text-sm font-semibold">10:00 – 18:00</div>

    {/* Duración */}
    <div className="text-muted-foreground mt-0.5 text-xs">8h</div>

    {/* Lugar */}
    <div className="text-muted-foreground mt-1 text-xs">Planta Baja</div>

    {/* Barra de duración */}
    <DurationBar percentage={80} className="mt-2" />

    {/* Acciones (solo hover) */}
    <div className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" className="size-6">
          <Pencil className="size-3" />
        </Button>
        <Button size="icon" variant="ghost" className="size-6">
          <Copy className="size-3" />
        </Button>
        <Button size="icon" variant="ghost" className="size-6">
          <Trash className="size-3" />
        </Button>
      </div>
    </div>
  </div>
</div>
```

**Características**:

- **Fondo**: `#F5E8FF` (morado muy suave)
- **Border radius**: rounded-xl (12px)
- **Padding**: p-3
- **Hover**: shadow-md + elevación
- **Acciones**: opacity-0, visible solo en hover
- Barra de duración proporcional

---

### 7. DurationBar

**Ubicación**: `_components/cuadrante/duration-bar.tsx`

```tsx
<div className="relative h-1 overflow-hidden rounded-full bg-slate-200">
  <div
    className="bg-primary absolute inset-y-0 left-0 rounded-full transition-all"
    style={{ width: `${percentage}%` }}
  />
</div>
```

**Características**:

- Altura 1 (4px)
- Fondo slate-200
- Barra primary con ancho proporcional
- Transición suave

---

### 8. CompactModeToggle

**Ubicación**: `_components/cuadrante/compact-mode-toggle.tsx`

```tsx
<div className="flex items-center gap-2">
  <Label className="text-xs">Modo compacto</Label>
  <Switch checked={isCompact} onCheckedChange={setIsCompact} />
</div>
```

**Características**:

- Solo UI, no afecta lógica
- Switch de shadcn/ui
- Label pequeño

---

## 📊 Datos MOCK

### Estructura `cuadrante-mock-data.ts`

```typescript
interface MockShiftCard {
  id: string;
  startTime: string;
  endTime: string;
  duration: number; // horas
  zone: string;
  costCenter: string;
  status: "draft" | "published" | "conflict";
}

interface MockEmployeeRow {
  id: string;
  firstName: string;
  initial: string;
  assignedHours: number;
  contractHours: number;
  shifts: Record<string, MockShiftCard[]>; // date -> shifts
}

const MOCK_WEEK_DAYS = [
  { date: "2025-11-10", dayName: "LUN", dayNumber: "10" },
  { date: "2025-11-11", dayName: "MAR", dayNumber: "11" },
  // ... resto de días
];

const MOCK_EMPLOYEES: MockEmployeeRow[] = [
  {
    id: "e1",
    firstName: "Francesc",
    initial: "F",
    assignedHours: 40,
    contractHours: 40,
    shifts: {
      "2025-11-10": [
        {
          id: "s101",
          startTime: "10:00",
          endTime: "18:00",
          duration: 8,
          zone: "Planta Baja",
          costCenter: "cc1",
          status: "published",
        },
      ],
      // ... más días
    },
  },
  // ... más empleados
];
```

---

## 🎭 Estados y variantes

### ShiftCard estados

#### Draft (borrador)

```tsx
bg-[#F5E8FF] border-primary/20
```

#### Published (publicado)

```tsx
bg-[#F5E8FF] border-primary/40
```

#### Conflict (conflicto)

```tsx
bg-red-50 border-red-300
```

### Modo compacto

Cuando `isCompact === true`:

- Altura mínima row: 60px (en lugar de 80px)
- Font size shift card: text-xs (en lugar de text-sm)
- Padding shift card: p-2 (en lugar de p-3)
- Ocultar barra de duración

---

## 🚀 Responsive

### Desktop (>1024px)

- Grid completo con 7 días
- Columna empleado 200px

### Tablet (768px - 1024px)

- Grid con 5 días (scroll horizontal)
- Columna empleado 160px

### Mobile (<768px)

- Vista diferente (no implementar, fuera de scope)

---

## ✅ Checklist de éxito

- [ ] Documento `ui-cuadrante.md` creado
- [ ] Archivo `cuadrante-mock-data.ts` con datos reales
- [ ] Componente `calendar-header-v2.tsx`
- [ ] Componente `filter-bar-v2.tsx`
- [ ] Componente `week-navigator-v2.tsx`
- [ ] Componente `week-days-header-v2.tsx`
- [ ] Componente `employee-row-v2.tsx`
- [ ] Componente `shift-card-v2.tsx`
- [ ] Componente `duration-bar.tsx`
- [ ] Componente `compact-mode-toggle.tsx`
- [ ] Vista ensamblada `calendar-week-employee-v2.tsx`
- [ ] Diseño limpio nivel Factorial/Linear
- [ ] Transiciones suaves
- [ ] Modo compacto funcional (UI only)

---

## 🚫 Fuera de scope

- ❌ Implementar drag & drop real
- ❌ Conectar con backend/API
- ❌ Validaciones de negocio
- ❌ Modificar componentes actuales
- ❌ Estados de error complejos
- ❌ Responsive mobile

---

## 📌 Notas técnicas

- Usar `grid-cols-[200px_repeat(7,1fr)]` para layout
- Sticky navegador: `sticky top-0 z-10`
- Transiciones: `transition-all duration-200`
- Hover elevación: `hover:shadow-md`
- Color morado suave: `#F5E8FF`
- Usar datos reales: empleados cc1 (Rambla del ganso)

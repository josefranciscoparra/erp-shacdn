# Resumen: Implementación de Calendarios para la Organización

## 📋 Base de Datos (Prisma Schema)

### Modelos creados:
```prisma
model Calendar {
  id           String        @id @default(cuid())
  name         String
  description  String?
  year         Int
  calendarType CalendarType  @default(NATIONAL_HOLIDAY)
  color        String        @default("#3b82f6")
  active       Boolean       @default(true)
  orgId        String
  organization Organization  @relation(fields: [orgId], references: [id], onDelete: Cascade)
  costCenterId String?
  costCenter   CostCenter?   @relation(fields: [costCenterId], references: [id])
  events       CalendarEvent[]
}

model CalendarEvent {
  id          String   @id @default(cuid())
  name        String
  description String?
  date        DateTime
  endDate     DateTime?
  eventType   CalendarEventType @default(HOLIDAY)
  isRecurring Boolean  @default(false)
  calendarId  String
  calendar    Calendar @relation(fields: [calendarId], references: [id], onDelete: Cascade)
}

enum CalendarType {
  NATIONAL_HOLIDAY
  LOCAL_HOLIDAY
  CORPORATE_EVENT
  CUSTOM
}

enum CalendarEventType {
  HOLIDAY
  CLOSURE
  EVENT
  MEETING
  DEADLINE
  OTHER
}
```

## 🔌 API Routes

### `/api/calendars/route.ts`
- **GET**: Lista todos los calendarios de la organización
- **POST**: Crea nuevo calendario

### `/api/calendars/[id]/route.ts`
- **GET**: Obtiene calendario específico con sus eventos
- **PATCH**: Actualiza calendario
- **DELETE**: Elimina calendario

### `/api/calendars/[id]/events/route.ts`
- **POST**: Crea nuevo evento en calendario

### `/api/calendars/[id]/events/[eventId]/route.ts`
- **PATCH**: Actualiza evento
- **DELETE**: Elimina evento

## 🗂️ Store (Zustand)

**Archivo**: `/src/stores/calendars-store.tsx`

### State:
- `calendars`: Array de calendarios
- `selectedCalendar`: Calendario actual
- `isLoading`: Estado de carga
- `error`: Mensajes de error

### Actions:
- `fetchCalendars()`: Obtiene todos los calendarios
- `fetchCalendarById(id)`: Obtiene calendario específico
- `createCalendar(data)`: Crea calendario
- `updateCalendar(id, data)`: Actualiza calendario
- `deleteCalendar(id)`: Elimina calendario
- `createEvent(calendarId, data)`: Crea evento
- `updateEvent(calendarId, eventId, data)`: Actualiza evento
- `deleteEvent(calendarId, eventId)`: Elimina evento

## 📄 Páginas y Componentes

### Estructura de archivos:
```
/dashboard/calendars/
├── page.tsx                              # Lista de calendarios
├── new/page.tsx                          # Crear calendario
├── [id]/page.tsx                         # Detalle de calendario
├── [id]/edit/page.tsx                    # Editar calendario
└── _components/
    ├── calendars-data-table.tsx          # Tabla con tabs (Todos, Activos, Nacional, Local, Corporativo)
    ├── calendars-columns.tsx             # Definición de columnas
    ├── calendar-event-dialog.tsx         # Modal crear/editar eventos
    └── calendar-event-schema.ts          # Validación Zod para eventos
```

### `/dashboard/calendars/page.tsx`
- Lista de calendarios con DataTable
- Tabs: Todos, Activos, Nacional, Local, Corporativo
- Botón "Nuevo calendario" (color primario)
- Estados vacíos por tab

### `/dashboard/calendars/new/page.tsx`
- Formulario crear calendario
- Campos: nombre, descripción, año, tipo, color, centro de coste (si es local), activo
- Validación con Zod
- Color picker con presets

### `/dashboard/calendars/[id]/page.tsx`
- Header con color del calendario
- Badges: tipo, año, centro de coste
- Stats: total eventos, estado, año
- Botón "Editar" (navega a edit)
- Botón "Eliminar" (con confirmación)
- Lista de eventos agrupados por mes
- Cada evento tiene botones editar/eliminar
- Botón "Nuevo evento" (abre diálogo)

### `/dashboard/calendars/[id]/edit/page.tsx`
- Formulario pre-llenado con datos del calendario
- Misma estructura que `/new`
- Actualiza calendario existente

### `calendar-event-dialog.tsx`
- Modal para crear/editar eventos
- **Checkbox "Es un rango de fechas"**:
  - Por defecto OFF → muestra solo "Fecha"
  - Si ON → muestra "Fecha de inicio" + "Fecha de fin"
- Campos: nombre, descripción, fecha(s), tipo de evento, recurrente
- Validación: fecha fin >= fecha inicio

### `calendar-event-schema.ts`
```typescript
z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  date: z.date(),
  endDate: z.date().optional().nullable(),
  eventType: z.enum([...]),
  isRecurring: z.boolean().default(false),
}).refine((data) => {
  if (data.endDate && data.date) {
    return data.endDate >= data.date;
  }
  return true;
})
```

## 🎨 UI/UX Patterns

### DataTable:
- Tabs con badges de conteo
- Select en móvil, Tabs en desktop
- Botón acción primario (sin outline, color primario)
- DataTableViewOptions para columnas
- Paginación
- Estados vacíos con iconos y mensajes

### Forms:
- React Hook Form + Zod
- Inputs, Textareas, Selects con fondo `bg-muted` / `dark:bg-white/20`
- Checkboxes con fondo `bg-muted` / `dark:bg-white/20`
- Color picker con presets
- Validación en tiempo real

### Navigation:
- Breadcrumbs implícitos (botón "Atrás")
- Links con `asChild` en Buttons
- Confirmaciones con `window.confirm()`

## 🔑 Características Clave

1. **Tres tipos de calendario**:
   - Nacional: Aplica a toda la organización
   - Local: Específico por centro de coste
   - Corporativo: Eventos de empresa

2. **Eventos flexibles**:
   - Un día o rango de fechas
   - Tipos: Festivo, Cierre, Evento, Reunión, Deadline, Otro
   - Eventos recurrentes (anuales)

3. **Organización por año**: Cada calendario tiene un año específico

4. **Filtros y vistas**: Tabs para filtrar por tipo y estado

5. **CRUD completo**: Crear, leer, actualizar, eliminar calendarios y eventos

## 📝 Notas para Calendarios de Usuario

Para los calendarios de usuario, necesitarás:
- Relación con `Employee` en lugar de `Organization`
- Posibilidad de ver calendarios organizacionales (solo lectura)
- Calendarios personales (lectura/escritura)
- Vista combinada: eventos organizacionales + personales
- Filtros por tipo de calendario (organizacional vs personal)
- Permisos: usuario solo ve sus calendarios + los organizacionales de su centro

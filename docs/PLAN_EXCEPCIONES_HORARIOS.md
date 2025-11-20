# PLAN: Sistema de Excepciones de Horarios

**Fecha:** 2025-11-19
**Estado:** ✅ Sistema Completo - Edición + Vista de Calendario
**Versión:** 1.2
**Parte de:** [PLAN_MIGRACION_HORARIOS_V2.md](./PLAN_MIGRACION_HORARIOS_V2.md) - FASE 7

---

## 🎯 Objetivo

Implementar un sistema completo de **excepciones de horarios** que permita definir horarios especiales para días concretos, tanto a nivel de plantilla (afecta a todos los empleados) como a nivel individual (solo un empleado).

---

## 📋 Casos de Uso

### 1. Excepciones a Nivel de Plantilla (Template)

Afectan a **todos los empleados** asignados a esa plantilla:

- **Festivos**: "25 de diciembre - Navidad (día no laborable)"
- **Jornadas reducidas**: "24 de diciembre - Nochebuena (solo hasta 14:00)"
- **Eventos corporativos**: "15 de junio - Formación anual (9:00-13:00)"
- **Cierres especiales**: "5 de agosto - Cierre de verano (no se trabaja)"

### 2. Excepciones a Nivel Individual (Employee)

Afectan solo a **un empleado específico**:

- **Citas médicas**: "Juan - 20 nov - Cita médica (entrada 11:00 en lugar de 9:00)"
- **Permisos especiales**: "María - 3 dic - Permiso matrimonio (no trabaja)"
- **Ajustes personales**: "Pedro - 10 ene - Trámite bancario (salida 16:00 en lugar de 18:00)"

---

## 🏗️ Arquitectura

### Modelo de Datos (Prisma)

El modelo **`ExceptionDayOverride`** ya existe en el schema. Necesitamos asegurarnos de que tiene todos los campos necesarios:

```prisma
model ExceptionDayOverride {
  id                  String   @id @default(cuid())
  date                DateTime @db.Date // IMPORTANTE: Solo fecha, sin hora
  reason              String?  // "Navidad", "Cita médica", etc.
  exceptionType       ExceptionType // HOLIDAY, REDUCED_HOURS, SPECIAL_SCHEDULE, etc.

  // Puede aplicarse a:
  // - UNA plantilla (afecta a todos sus empleados)
  // - UN empleado específico
  // NUNCA ambos al mismo tiempo (uno debe ser null)
  employeeId          String?
  employee            Employee? @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  scheduleTemplateId  String?
  scheduleTemplate    ScheduleTemplate? @relation(fields: [scheduleTemplateId], references: [id], onDelete: Cascade)

  // Horarios override para ese día
  // Si está vacío = día no laborable
  overrideSlots       TimeSlot[]

  // Multi-tenancy
  orgId               String
  organization        Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@index([orgId])
  @@index([employeeId])
  @@index([scheduleTemplateId])
  @@index([date])
  @@map("exception_day_overrides")
}

enum ExceptionType {
  HOLIDAY           // Festivo (día completo sin trabajo)
  REDUCED_HOURS     // Jornada reducida
  SPECIAL_SCHEDULE  // Horario especial
  TRAINING          // Formación/Evento
  EARLY_CLOSURE     // Cierre anticipado
  CUSTOM            // Personalizado (usa campo 'reason' libre)
}
```

### Prioridad en el Motor de Cálculo

El `schedule-engine.ts` ya implementa esta prioridad:

```
🔴 MÁXIMA PRIORIDAD: Absence (PtoRequest - vacaciones, baja médica)
    ↓
🟠 ALTA PRIORIDAD: ExceptionDayOverride (excepciones de día)
    ↓
🟡 MEDIA PRIORIDAD: SchedulePeriod (INTENSIVE, SPECIAL)
    ↓
🟢 BAJA PRIORIDAD: ScheduleTemplate (horario base REGULAR)
```

**Lógica de resolución para una fecha:**

1. ¿Tiene ausencia (vacaciones/baja)? → Usar ausencia (0 minutos trabajados)
2. ¿Tiene excepción individual (employeeId)? → Usar excepción individual
3. ¿Tiene excepción de plantilla (scheduleTemplateId)? → Usar excepción de plantilla
4. ¿Tiene periodo especial activo? → Usar periodo
5. Si no, usar plantilla base (REGULAR)

---

## ⚠️ Validaciones Críticas - Solapamientos

### 1. Solapamiento de Excepciones en la Misma Fecha

**Regla:** NO puede haber **más de una excepción activa para la misma fecha y mismo objetivo**.

#### Casos VÁLIDOS ✅:

```typescript
// ✅ OK: Excepción de plantilla + excepción individual (DIFERENTES objetivos)
{
  date: "2025-12-24",
  scheduleTemplateId: "template-123",  // Plantilla: todos cierran a las 14:00
  exceptionType: "REDUCED_HOURS"
}
{
  date: "2025-12-24",
  employeeId: "emp-456",               // Juan: además tiene cita médica a las 10:00
  exceptionType: "CUSTOM"
}
// La excepción individual de Juan tiene prioridad sobre la de la plantilla
```

#### Casos INVÁLIDOS ❌:

```typescript
// ❌ ERROR: Dos excepciones de plantilla para la misma fecha
{
  date: "2025-12-25",
  scheduleTemplateId: "template-123",
  exceptionType: "HOLIDAY"
}
{
  date: "2025-12-25",
  scheduleTemplateId: "template-123",  // DUPLICADO!
  exceptionType: "REDUCED_HOURS"
}

// ❌ ERROR: Dos excepciones individuales para el mismo empleado y fecha
{
  date: "2025-12-10",
  employeeId: "emp-456",
  exceptionType: "CUSTOM"
}
{
  date: "2025-12-10",
  employeeId: "emp-456",              // DUPLICADO!
  exceptionType: "TRAINING"
}
```

### 2. Validación de Time Slots (si tiene horario override)

Si la excepción tiene `overrideSlots` (no es día no laborable):

**Validaciones:**

- ✅ No solapamientos entre time slots dentro del mismo día
- ✅ Orden cronológico (slot[1].start >= slot[0].end)
- ✅ Rango válido: 0-1439 minutos (00:00-23:59)
- ✅ Al menos un slot de tipo WORK si no es festivo

### 3. Validación de Fechas

- ❌ NO permitir crear excepciones en **fechas pasadas** (opcional: permitir con warning)
- ✅ Fecha debe ser válida (no 30 de febrero)
- ✅ Formato DateTime solo con fecha (sin hora)

### 4. Validación de Objetivo (Employee XOR Template)

**Regla XOR:** Una excepción debe tener **EXACTAMENTE UNO** de:

- `employeeId` (excepción individual)
- `scheduleTemplateId` (excepción de plantilla)

**NUNCA ambos ni ninguno.**

```typescript
// ✅ VÁLIDO
{ employeeId: "emp-123", scheduleTemplateId: null }
{ employeeId: null, scheduleTemplateId: "tpl-456" }

// ❌ INVÁLIDO
{ employeeId: "emp-123", scheduleTemplateId: "tpl-456" }  // AMBOS!
{ employeeId: null, scheduleTemplateId: null }           // NINGUNO!
```

---

## 🔧 Server Actions

Ubicación: `/src/server/actions/schedules-v2.ts`

### 1. `createExceptionDay()`

```typescript
export async function createExceptionDay(data: {
  date: Date;
  reason?: string;
  exceptionType: ExceptionType;
  employeeId?: string;
  scheduleTemplateId?: string;
  overrideSlots?: Array<{
    startTimeMinutes: number;
    endTimeMinutes: number;
    slotType: TimeSlotType;
    presenceType: PresenceType;
    description?: string;
  }>;
}): Promise<ActionResponse<ExceptionDayOverride>>;
```

**Validaciones:**

1. Verificar XOR: `employeeId` o `scheduleTemplateId` (no ambos, no ninguno)
2. Verificar que NO exista ya una excepción para esa fecha + objetivo
3. Si tiene `overrideSlots`:
   - Validar no solapamientos
   - Validar rangos 0-1439
   - Validar orden cronológico
4. Verificar permisos del usuario
5. Verificar que el empleado/plantilla pertenece a la organización

**Lógica:**

```typescript
// 1. Validar XOR
if ((employeeId && scheduleTemplateId) || (!employeeId && !scheduleTemplateId)) {
  return { success: false, error: "Debe especificar employeeId O scheduleTemplateId" };
}

// 2. Verificar duplicados
const existing = await prisma.exceptionDayOverride.findFirst({
  where: {
    orgId,
    date: startOfDay(data.date),
    ...(employeeId && { employeeId }),
    ...(scheduleTemplateId && { scheduleTemplateId }),
  },
});

if (existing) {
  return {
    success: false,
    error: `Ya existe una excepción para esta fecha`,
  };
}

// 3. Validar time slots (si existen)
if (overrideSlots && overrideSlots.length > 0) {
  const validation = validateTimeSlots(overrideSlots);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }
}

// 4. Crear excepción + time slots en transacción
const exception = await prisma.exceptionDayOverride.create({
  data: {
    date: startOfDay(data.date),
    reason: data.reason,
    exceptionType: data.exceptionType,
    employeeId: data.employeeId,
    scheduleTemplateId: data.scheduleTemplateId,
    orgId,
    overrideSlots: {
      create: overrideSlots?.map((slot) => ({
        startTimeMinutes: slot.startTimeMinutes,
        endTimeMinutes: slot.endTimeMinutes,
        slotType: slot.slotType,
        presenceType: slot.presenceType,
        description: slot.description,
        orgId,
      })),
    },
  },
  include: { overrideSlots: true },
});

return { success: true, data: exception };
```

### 2. `updateExceptionDay()`

```typescript
export async function updateExceptionDay(
  exceptionId: string,
  data: {
    reason?: string;
    exceptionType?: ExceptionType;
    overrideSlots?: Array<{
      startTimeMinutes: number;
      endTimeMinutes: number;
      slotType: TimeSlotType;
      presenceType: PresenceType;
      description?: string;
    }>;
  },
): Promise<ActionResponse<void>>;
```

**Validaciones:**

- NO se puede cambiar `date`, `employeeId`, `scheduleTemplateId` (inmutables)
- Validar time slots si se actualizan
- Verificar permisos

**Lógica:**

```typescript
// Si se actualizan slots, eliminar los antiguos y crear los nuevos
await prisma.$transaction([
  // 1. Eliminar slots antiguos
  prisma.timeSlot.deleteMany({
    where: { exceptionDayOverrideId: exceptionId },
  }),

  // 2. Actualizar excepción
  prisma.exceptionDayOverride.update({
    where: { id: exceptionId },
    data: {
      reason: data.reason,
      exceptionType: data.exceptionType,
      overrideSlots: data.overrideSlots
        ? {
            create: data.overrideSlots.map((slot) => ({
              startTimeMinutes: slot.startTimeMinutes,
              endTimeMinutes: slot.endTimeMinutes,
              slotType: slot.slotType,
              presenceType: slot.presenceType,
              description: slot.description,
              orgId,
            })),
          }
        : undefined,
    },
  }),
]);
```

### 3. `deleteExceptionDay()`

```typescript
export async function deleteExceptionDay(exceptionId: string): Promise<ActionResponse<void>>;
```

**Lógica:**

- Prisma Cascade eliminará automáticamente los `TimeSlot` relacionados
- Verificar permisos

### 4. `getExceptionDaysForTemplate()`

```typescript
export async function getExceptionDaysForTemplate(
  templateId: string,
  filters?: {
    fromDate?: Date;
    toDate?: Date;
    exceptionType?: ExceptionType;
  },
): Promise<ExceptionDayOverride[]>;
```

**Retorna:** Todas las excepciones de una plantilla, ordenadas por fecha.

### 5. `getExceptionDaysForEmployee()`

```typescript
export async function getExceptionDaysForEmployee(
  employeeId: string,
  filters?: {
    fromDate?: Date;
    toDate?: Date;
    exceptionType?: ExceptionType;
  },
): Promise<ExceptionDayOverride[]>;
```

**Retorna:** Todas las excepciones individuales de un empleado, ordenadas por fecha.

### 6. Función auxiliar: `validateTimeSlots()`

```typescript
function validateTimeSlots(
  slots: Array<{
    startTimeMinutes: number;
    endTimeMinutes: number;
  }>,
): { valid: boolean; error?: string } {
  // 1. Validar rangos
  for (const slot of slots) {
    if (slot.startTimeMinutes < 0 || slot.startTimeMinutes > 1439) {
      return { valid: false, error: "Hora inicio fuera de rango (0-1439)" };
    }
    if (slot.endTimeMinutes < 0 || slot.endTimeMinutes > 1439) {
      return { valid: false, error: "Hora fin fuera de rango (0-1439)" };
    }
    if (slot.startTimeMinutes >= slot.endTimeMinutes) {
      return { valid: false, error: "Hora inicio debe ser menor que hora fin" };
    }
  }

  // 2. Ordenar por hora inicio
  const sorted = [...slots].sort((a, b) => a.startTimeMinutes - b.startTimeMinutes);

  // 3. Verificar no solapamientos
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    if (current.endTimeMinutes > next.startTimeMinutes) {
      return {
        valid: false,
        error: `Solapamiento detectado entre tramos: ${minutesToTime(current.startTimeMinutes)}-${minutesToTime(current.endTimeMinutes)} y ${minutesToTime(next.startTimeMinutes)}-${minutesToTime(next.endTimeMinutes)}`,
      };
    }
  }

  return { valid: true };
}
```

---

## 🎨 Componentes UI

### 1. Tab "Excepciones" en `/dashboard/schedules/[id]/page.tsx`

**Modificar:**

```tsx
<Tabs defaultValue="schedule">
  <TabsList>
    <TabsTrigger value="schedule">Horarios</TabsTrigger>
    <TabsTrigger value="employees">Empleados ({employeeCount})</TabsTrigger>
    <TabsTrigger value="exceptions">Excepciones ({exceptionCount})</TabsTrigger> {/* NUEVO */}
  </TabsList>

  {/* ... tabs existentes ... */}

  <TabsContent value="exceptions">
    <ExceptionsTab templateId={template.id} />
  </TabsContent>
</Tabs>
```

### 2. Componente `ExceptionsTab`

**Archivo:** `/src/app/(main)/dashboard/schedules/[id]/_components/exceptions-tab.tsx`

```tsx
export function ExceptionsTab({ templateId }: { templateId: string }) {
  const [exceptions, setExceptions] = useState<ExceptionDayOverride[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Cargar excepciones
  useEffect(() => {
    loadExceptions();
  }, [templateId]);

  async function loadExceptions() {
    const data = await getExceptionDaysForTemplate(templateId);
    setExceptions(data);
  }

  return (
    <div className="space-y-4">
      {/* Header con botón crear */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Excepciones de Horario</h3>
        <CreateExceptionDialog templateId={templateId} onCreated={loadExceptions} />
      </div>

      {/* Calendario con excepciones marcadas */}
      <ExceptionsCalendar
        exceptions={exceptions}
        onExceptionClick={(exception) => {
          /* Mostrar dialog de edición */
        }}
      />

      {/* Lista de excepciones */}
      <Card>
        <CardHeader>
          <CardTitle>Próximas Excepciones</CardTitle>
        </CardHeader>
        <CardContent>
          {exceptions.length === 0 ? (
            <EmptyState
              icon={<Calendar className="h-12 w-12" />}
              title="Sin excepciones"
              description="No hay excepciones de horario configuradas"
              action={<Button onClick={() => setShowCreateDialog(true)}>Nueva Excepción</Button>}
            />
          ) : (
            <ExceptionsList
              exceptions={exceptions}
              onEdit={(id) => {
                /* Abrir dialog edición */
              }}
              onDelete={async (id) => {
                await deleteExceptionDay(id);
                loadExceptions();
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

### 3. Componente `ExceptionsCalendar`

**IMPORTANTE:** Reutilizar el calendario existente del sistema.

**Ubicación del calendario existente:** `/src/app/(main)/dashboard/me/clock/_components/calendar-view.tsx`

**Estrategia:**

1. Extraer la lógica del calendario a un componente genérico reutilizable
2. Crear `BaseCalendar` que acepte props para customizar:
   - `markedDates`: Fechas a marcar (con colores/estilos)
   - `onDateClick`: Callback al hacer click
   - `renderDateContent`: Custom render para cada celda
3. Usar `BaseCalendar` tanto en `/me/clock` como en excepciones

**Propuesta de refactor:**

```tsx
// /src/components/calendar/base-calendar.tsx
export function BaseCalendar({
  currentDate,
  markedDates,
  onDateClick,
  renderDateContent,
}: {
  currentDate: Date;
  markedDates?: Array<{
    date: Date;
    color?: string;
    label?: string;
  }>;
  onDateClick?: (date: Date) => void;
  renderDateContent?: (date: Date) => React.ReactNode;
}) {
  // Lógica del calendario reutilizable
}

// /src/app/(main)/dashboard/schedules/[id]/_components/exceptions-calendar.tsx
export function ExceptionsCalendar({ exceptions }: { exceptions: ExceptionDayOverride[] }) {
  const markedDates = exceptions.map((ex) => ({
    date: ex.date,
    color: getColorByType(ex.exceptionType),
    label: ex.reason || ex.exceptionType,
  }));

  return (
    <BaseCalendar
      currentDate={new Date()}
      markedDates={markedDates}
      onDateClick={(date) => {
        const exception = exceptions.find((ex) => isSameDay(ex.date, date));
        if (exception) {
          // Abrir dialog de edición
        }
      }}
      renderDateContent={(date) => {
        const exception = exceptions.find((ex) => isSameDay(ex.date, date));
        return exception ? (
          <Badge variant="destructive" className="text-xs">
            {exception.exceptionType}
          </Badge>
        ) : null;
      }}
    />
  );
}
```

### 4. Dialog `CreateExceptionDialog`

**Archivo:** `/src/app/(main)/dashboard/schedules/[id]/_components/create-exception-dialog.tsx`

```tsx
export function CreateExceptionDialog({
  templateId,
  employeeId,
  onCreated,
}: {
  templateId?: string;
  employeeId?: string;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"basic" | "slots">("basic");

  // State del formulario
  const [date, setDate] = useState<Date>();
  const [exceptionType, setExceptionType] = useState<ExceptionType>("HOLIDAY");
  const [reason, setReason] = useState("");
  const [isNonWorkingDay, setIsNonWorkingDay] = useState(true);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

  async function handleCreate() {
    const result = await createExceptionDay({
      date: date!,
      exceptionType,
      reason: reason || undefined,
      templateId,
      employeeId,
      overrideSlots: isNonWorkingDay ? [] : timeSlots,
    });

    if (result.success) {
      toast.success("Excepción creada correctamente");
      setOpen(false);
      onCreated();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Nueva Excepción
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[600px]">
        {step === "basic" ? (
          <>
            <DialogHeader>
              <DialogTitle>Nueva Excepción de Horario</DialogTitle>
              <DialogDescription>Define un horario especial para una fecha específica</DialogDescription>
            </DialogHeader>

            {/* Paso 1: Información básica */}
            <div className="space-y-4">
              {/* Selector de fecha (calendario) */}
              <div className="space-y-2">
                <Label>Fecha</Label>
                <DatePicker selected={date} onSelect={setDate} disabled={(date) => date < startOfDay(new Date())} />
              </div>

              {/* Selector de tipo (predefinido) */}
              <div className="space-y-2">
                <Label>Tipo de Excepción</Label>
                <Select value={exceptionType} onValueChange={setExceptionType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HOLIDAY">Festivo</SelectItem>
                    <SelectItem value="REDUCED_HOURS">Jornada Reducida</SelectItem>
                    <SelectItem value="SPECIAL_SCHEDULE">Horario Especial</SelectItem>
                    <SelectItem value="TRAINING">Formación/Evento</SelectItem>
                    <SelectItem value="EARLY_CLOSURE">Cierre Anticipado</SelectItem>
                    <SelectItem value="CUSTOM">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Campo razón (texto libre) */}
              <div className="space-y-2">
                <Label>Razón (opcional)</Label>
                <Input
                  placeholder="Ej: Navidad, Formación anual, etc."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              {/* Toggle: ¿Día no laborable? */}
              <div className="flex items-center space-x-2">
                <Checkbox id="non-working" checked={isNonWorkingDay} onCheckedChange={setIsNonWorkingDay} />
                <Label htmlFor="non-working">Día no laborable (sin horarios)</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              {isNonWorkingDay ? (
                <Button onClick={handleCreate}>Crear Excepción</Button>
              ) : (
                <Button onClick={() => setStep("slots")}>Siguiente: Horarios</Button>
              )}
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Horarios para {format(date, "dd/MM/yyyy")}</DialogTitle>
              <DialogDescription>Define los tramos horarios para este día excepcional</DialogDescription>
            </DialogHeader>

            {/* Paso 2: Editor de time slots (reutilizar componente existente) */}
            <TimeSlotEditor slots={timeSlots} onSlotsChange={setTimeSlots} />

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("basic")}>
                Atrás
              </Button>
              <Button onClick={handleCreate}>Crear Excepción</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

### 5. Componente `ExceptionsList`

```tsx
export function ExceptionsList({
  exceptions,
  onEdit,
  onDelete,
}: {
  exceptions: ExceptionDayOverride[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      {exceptions.map((exception) => (
        <div key={exception.id} className="hover:bg-muted/50 flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                getBackgroundByType(exception.exceptionType),
              )}
            >
              {getIconByType(exception.exceptionType)}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{format(exception.date, "dd MMM yyyy", { locale: es })}</p>
                <Badge variant={getVariantByType(exception.exceptionType)}>{exception.exceptionType}</Badge>
              </div>

              <p className="text-muted-foreground text-sm">{exception.reason || "Sin descripción"}</p>

              {exception.overrideSlots.length > 0 && (
                <div className="mt-1 flex gap-1">
                  {exception.overrideSlots.map((slot, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {minutesToTime(slot.startTimeMinutes)} - {minutesToTime(slot.endTimeMinutes)}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => onEdit(exception.id)}>
              Editar
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(exception.id)}>
              <Trash2 className="text-destructive h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## 📱 UI en Perfil de Empleado

**Ubicación:** `/src/app/(main)/dashboard/employees/[id]/schedules/page.tsx`

Añadir una sección similar al tab de excepciones, pero mostrando:

1. **Excepciones individuales** del empleado
2. **Excepciones de la plantilla asignada** (solo lectura, con indicador)

```tsx
<Card>
  <CardHeader>
    <CardTitle>Excepciones de Horario</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Excepciones individuales (editables) */}
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Excepciones Individuales</h4>
        <CreateExceptionDialog employeeId={employeeId} onCreated={loadExceptions} />
      </div>
      <ExceptionsList exceptions={individualExceptions} />
    </div>

    <Separator className="my-4" />

    {/* Excepciones de plantilla (solo lectura) */}
    <div className="space-y-2">
      <h4 className="text-muted-foreground text-sm font-medium">Excepciones de Plantilla (aplicables a todos)</h4>
      <ExceptionsList exceptions={templateExceptions} readOnly={true} />
    </div>
  </CardContent>
</Card>
```

---

## 🧪 Testing

### Casos de Prueba

1. **Crear excepción de plantilla - día festivo**
   - Sin horarios override
   - Verificar que afecta a todos los empleados

2. **Crear excepción de plantilla - horario especial**
   - Con horarios override (ej: solo hasta 14:00)
   - Verificar cálculo correcto de minutos esperados

3. **Crear excepción individual**
   - Para un empleado específico
   - Verificar que tiene prioridad sobre excepción de plantilla

4. **Validación de solapamientos**
   - Intentar crear dos excepciones para misma fecha + objetivo → ERROR
   - Crear excepción plantilla + excepción individual → OK

5. **Validación de time slots**
   - Slots con solapamiento → ERROR
   - Slots fuera de rango → ERROR
   - Slots en orden incorrecto → ERROR

6. **Integración con schedule-engine**
   - Verificar prioridad: Absence > Exception > Period > Template
   - Calcular `expectedMinutes` correctamente con excepción

---

## 📝 Checklist de Implementación

### Backend

- [ ] Verificar modelo `ExceptionDayOverride` en schema.prisma
- [ ] Añadir enum `ExceptionType` si no existe
- [ ] Implementar `createExceptionDay()` con todas las validaciones
- [ ] Implementar `updateExceptionDay()`
- [ ] Implementar `deleteExceptionDay()`
- [ ] Implementar `getExceptionDaysForTemplate()`
- [ ] Implementar `getExceptionDaysForEmployee()`
- [ ] Implementar función auxiliar `validateTimeSlots()`
- [ ] Verificar que `schedule-engine.ts` consulta excepciones correctamente

### Frontend - Plantilla (`/schedules/[id]`)

- [ ] Añadir tab "Excepciones" en página detalle
- [ ] Crear componente `ExceptionsTab`
- [ ] Refactorizar calendario existente a `BaseCalendar` reutilizable
- [ ] Crear componente `ExceptionsCalendar`
- [ ] Crear componente `CreateExceptionDialog` (wizard 2 pasos)
- [ ] Crear componente `ExceptionsList`
- [ ] Implementar dialog de edición de excepción
- [ ] Añadir contador de excepciones en tab

### Frontend - Empleado (`/employees/[id]/schedules`)

- [ ] Añadir sección de excepciones individuales
- [ ] Mostrar excepciones de plantilla (solo lectura)
- [ ] Integrar `CreateExceptionDialog` para empleado
- [ ] Vista combinada (individuales + plantilla)

### Testing

- [ ] Test de validación XOR (employee vs template)
- [ ] Test de solapamiento de excepciones
- [ ] Test de validación de time slots
- [ ] Test de prioridad en schedule-engine
- [ ] Test de creación/edición/eliminación

---

## 🚀 Orden de Implementación Propuesto

1. **Backend primero** (Server Actions + Validaciones)
2. **Refactor calendario** (extraer `BaseCalendar`)
3. **UI en Plantilla** (tab excepciones + dialogs)
4. **UI en Empleado** (sección excepciones)
5. **Testing manual** (crear excepciones, verificar prioridades)

---

## ✅ Decisiones Tomadas

1. **Fechas pasadas**: ✅ Permitir con warning + auditoría (createdBy, createdAt)
2. **Eliminación**: ✅ Soft delete (campo `deletedAt`) para mantener historial
3. **Rango de fechas**: ✅ Permitir crear excepción para múltiples fechas consecutivas
4. **Recurrencia anual**: ✅ Campo `isRecurring` para excepciones anuales (ej: Navidad cada año)

### Cambios al Modelo de Datos

```prisma
model ExceptionDayOverride {
  // ... campos existentes ...

  // NUEVO: Soft delete
  deletedAt           DateTime?
  deletedBy           String?
  deletedByUser       User? @relation("DeletedExceptions", fields: [deletedBy], references: [id])

  // NUEVO: Auditoría
  createdBy           String
  createdByUser       User @relation("CreatedExceptions", fields: [createdBy], references: [id])

  // NUEVO: Recurrencia anual
  isRecurring         Boolean @default(false) // Se repite cada año

  // NUEVO: Rango de fechas
  endDate             DateTime? @db.Date // Si es null, solo aplica a 'date'

  // ... resto de campos ...
}
```

**Comportamiento de rango de fechas:**

- Si `endDate` es `null` → Excepción de un solo día (`date`)
- Si `endDate` existe → Excepción aplica desde `date` hasta `endDate` (ambos inclusive)
- Ejemplo: `date: 2025-12-24, endDate: 2025-12-26` → 24, 25 y 26 de diciembre

**Comportamiento de recurrencia:**

- Si `isRecurring: true` → La excepción se aplica automáticamente cada año
- Ejemplo: `date: 2025-12-25, isRecurring: true` → Se aplicará el 25/12 de todos los años
- El motor de cálculo debe detectar excepciones recurrentes y aplicarlas a años futuros

---

## ✅ Sistema de Edición de Excepciones (2025-11-19)

**Estado:** ✅ IMPLEMENTADO Y FUNCIONAL

### Implementación Completada

Se ha completado la funcionalidad de edición para **todos los tipos** de excepciones: globales, de plantilla, de departamento, de centro de costes y de empleado.

### 1. Server Action de Actualización

✅ **`updateExceptionDay()`** en `/src/server/actions/schedules-v2.ts`

```typescript
export async function updateExceptionDay(
  input: Omit<CreateExceptionDayInput, "employeeId" | "scheduleTemplateId"> & { id: string },
): Promise<ActionResponse<void>>;
```

**Funcionalidad:**

- Acepta `id` de la excepción a actualizar
- Valida que la excepción pertenece a la organización del usuario
- Actualiza todos los campos: `date`, `endDate`, `exceptionType`, `reason`, `isRecurring`, `isGlobal`
- Soporta cambio de scope completo:
  - Global (`isGlobal: true`)
  - Departamento (`departmentId`)
  - Centro de costes (`costCenterId`)
  - Plantilla (`scheduleTemplateId`)
  - Empleado (`employeeId`)
- **Reemplazo completo de slots:** Elimina slots antiguos y crea los nuevos
- Transacción atómica para garantizar consistencia de datos

### 2. Edición de Excepciones GLOBALES

**Ubicación:** `/dashboard/schedules` (Pestaña "Excepciones Globales")

✅ **Componente:** `/src/app/(main)/dashboard/schedules/_components/global-exceptions-content.tsx`

- Botón "Editar" con icono `Pencil` en cada fila de la tabla
- Estado `editDialogOpen` y `exceptionToEdit` para gestionar el dialog
- Handler `handleEditClick()` que abre el dialog pre-cargado
- Handler `handleEditSuccess()` que recarga la lista tras actualizar

✅ **Dialog Modificado:** `/src/app/(main)/dashboard/schedules/_components/create-global-exception-dialog.tsx`

- Prop opcional `exceptionToEdit` para activar modo edición
- Constante `isEditMode` que detecta el modo actual
- `useEffect` que pre-carga todos los campos cuando `exceptionToEdit` cambia:
  - Fecha inicial (`date`) y fecha final (`endDate`)
  - Tipo de excepción (`exceptionType`)
  - Alcance (`scopeType`: global/department/costCenter)
  - Departamento o centro de costes según el alcance
  - Motivo (`reason`) y recurrencia anual (`isRecurring`)
  - **Franjas horarias:** Convertidas de minutos a formato HH:mm
- Títulos dinámicos: "Nueva Excepción Global" vs "Editar Excepción Global"
- Botón dinámico: "Crear Excepción" vs "Actualizar Excepción"
- Submit condicional: Llama a `updateExceptionDay()` o `createExceptionDay()` según el modo

### 3. Edición de Excepciones de PLANTILLA

**Ubicación:** `/dashboard/schedules/[id]` (Pestaña "Excepciones")

✅ **Componente:** `/src/app/(main)/dashboard/schedules/[id]/_components/exceptions-tab.tsx`

- Botón "Editar" con icono `Edit` en cada fila de la tabla
- Estado `editDialogOpen` y `exceptionToEdit` para gestionar el dialog
- Handler `handleEditClick()` que abre el dialog pre-cargado
- Handler `handleEditSuccess()` que recarga la lista tras actualizar
- Segunda instancia del `CreateExceptionDialog` en modo edición

✅ **Dialog Modificado:** `/src/app/(main)/dashboard/schedules/[id]/_components/create-exception-dialog.tsx`

- Prop opcional `exceptionToEdit` para activar modo edición
- Constante `isEditMode` que detecta el modo actual
- `useEffect` que pre-carga todos los campos cuando `exceptionToEdit` cambia:
  - Fecha inicial (`date`) y fecha final (`endDate`)
  - Tipo de excepción (`exceptionType`)
  - Motivo (`reason`) y recurrencia anual (`isRecurring`)
  - **Franjas horarias:** Convertidas de minutos a formato HH:mm
- Títulos dinámicos: "Nueva Excepción" vs "Editar Excepción"
- Botón dinámico: "Crear Excepción" vs "Actualizar Excepción"
- Submit condicional: Llama a `updateExceptionDay()` o `createExceptionDay()` según el modo

### 4. Patrón de Implementación Consistente

Ambos tipos de excepciones siguen el mismo patrón de código:

```typescript
// 1. Prop opcional en el interface del dialog
interface DialogProps {
  // ... otras props
  exceptionToEdit?: ExceptionData | null;
}

// 2. Detectar modo de edición
const isEditMode = !!exceptionToEdit;

// 3. Pre-cargar datos en useEffect
useEffect(() => {
  if (open && exceptionToEdit) {
    setDate(new Date(exceptionToEdit.date));
    setExceptionType(exceptionToEdit.exceptionType);
    setReason(exceptionToEdit.reason ?? "");
    setIsRecurring(exceptionToEdit.isRecurring);

    // Convertir time slots de minutos a HH:mm
    if (exceptionToEdit.overrideSlots && exceptionToEdit.overrideSlots.length > 0) {
      setTimeSlots(
        exceptionToEdit.overrideSlots.map((slot) => ({
          startTime: `${Math.floor(slot.startTimeMinutes / 60)}:${slot.startTimeMinutes % 60}`,
          endTime: `${Math.floor(slot.endTimeMinutes / 60)}:${slot.endTimeMinutes % 60}`,
          slotType: slot.slotType,
          presenceType: slot.presenceType,
        })),
      );
    }
  }
}, [open, exceptionToEdit]);

// 4. Submit condicional
async function handleSubmit() {
  const result =
    isEditMode && exceptionToEdit
      ? await updateExceptionDay({ id: exceptionToEdit.id, ...formData })
      : await createExceptionDay(formData);

  if (result.success) {
    toast.success(isEditMode ? "Excepción actualizada" : "Excepción creada");
    onSuccess();
  }
}
```

### 5. Experiencia de Usuario

**Flujo de Edición:**

1. Usuario navega a la lista de excepciones (globales o de plantilla)
2. Hace click en el botón "Editar" (icono de lápiz) junto a una excepción
3. Se abre el dialog con **todos los campos pre-cargados** con los datos actuales
4. Usuario modifica los campos que desea cambiar
5. Click en "Actualizar Excepción"
6. La excepción se actualiza en la base de datos
7. La lista se recarga automáticamente mostrando los cambios
8. Toast de confirmación: "Excepción actualizada correctamente"

**Campos Editables:**

- ✅ Fecha de inicio (`date`)
- ✅ Fecha de fin (`endDate`) - Opcional, para rangos de fechas
- ✅ Tipo de excepción (`exceptionType`): HOLIDAY, REDUCED_HOURS, SPECIAL_SCHEDULE, TRAINING, EARLY_CLOSURE, CUSTOM
- ✅ Motivo/descripción (`reason`) - Texto libre
- ✅ Recurrencia anual (`isRecurring`) - Checkbox
- ✅ Alcance (`scopeType`) - Solo en excepciones globales: global/departamento/centro de costes
- ✅ Departamento/Centro - Selector condicional según el alcance
- ✅ Franjas horarias personalizadas (`timeSlots`):
  - Añadir nuevas franjas
  - Editar franjas existentes (hora inicio/fin, tipo, presencia)
  - Eliminar franjas

### 6. Archivos Modificados

**Server Actions:**

- `/src/server/actions/schedules-v2.ts`
  - ✅ `updateExceptionDay()` - Actualiza excepción completa

**Excepciones Globales:**

- `/src/app/(main)/dashboard/schedules/_components/global-exceptions-content.tsx`
  - ✅ Botón Editar + estado + handlers
- `/src/app/(main)/dashboard/schedules/_components/create-global-exception-dialog.tsx`
  - ✅ Prop `exceptionToEdit` + modo edición + pre-carga de datos

**Excepciones de Plantilla:**

- `/src/app/(main)/dashboard/schedules/[id]/_components/exceptions-tab.tsx`
  - ✅ Botón Editar + estado + handlers + segunda instancia del dialog
- `/src/app/(main)/dashboard/schedules/[id]/_components/create-exception-dialog.tsx`
  - ✅ Prop `exceptionToEdit` + modo edición + pre-carga de datos

### 7. Validaciones Implementadas

**Server Action:**

- ✅ Valida que la excepción pertenece a la organización del usuario
- ✅ Valida que los IDs de departamento/centro existen y pertenecen a la org
- ✅ Valida que la fecha inicial es anterior o igual a la fecha final (si existe)
- ✅ Transacción atómica: Si falla la actualización de slots, se revierte todo

**UI:**

- ✅ Validación de fecha obligatoria
- ✅ Validación de tipo de excepción obligatorio
- ✅ Validación de alcance: Si se selecciona "departamento" o "centro", debe seleccionarse uno
- ✅ Validación de franjas horarias: Hora inicio < Hora fin
- ✅ Estados de loading durante la actualización
- ✅ Mensajes de error claros en caso de fallo

### 8. Próximas Mejoras Potenciales

⚠️ **Pendientes (NO implementadas aún):**

- Edición inline en la tabla (sin abrir dialog)
- Histórico de cambios de excepciones (auditoría)
- Confirmación antes de cambiar el alcance de una excepción
- Vista previa del impacto de la excepción (cuántos empleados afecta)

---

**Estado:** ✅ Sistema de Edición COMPLETADO Y FUNCIONAL

---

## ✅ Vista de Calendario Visual de Excepciones (2025-11-19)

### 1. Objetivo

Proporcionar una **visualización gráfica e intuitiva** de las excepciones de horarios mediante un calendario mensual, facilitando:

- Identificar rápidamente los días con excepciones configuradas
- Visualizar patrones y distribución temporal de excepciones
- Crear y editar excepciones de forma más natural mediante clicks en el calendario

### 2. Componente Principal

**Archivo:** `/src/app/(main)/dashboard/schedules/_components/exceptions-calendar.tsx`

**Características:**

- ✅ Calendario mensual completo con navegación entre meses
- ✅ Indicadores visuales de excepciones por día (puntos de colores)
- ✅ Código de colores por tipo de excepción
- ✅ Resaltado del día actual
- ✅ Lista de excepciones del mes debajo del calendario
- ✅ Leyenda de tipos de excepciones
- ✅ Click en excepciones para abrir el dialog de edición
- ✅ Botón para crear nuevas excepciones
- ✅ Completamente reutilizable (globales y plantillas)

**Tipos de Excepción y Colores:**

```typescript
const exceptionTypeColors: Record<string, string> = {
  HOLIDAY: "bg-red-500", // Festivo - Rojo
  REDUCED_HOURS: "bg-yellow-500", // Jornada Reducida - Amarillo
  SPECIAL_SCHEDULE: "bg-blue-500", // Horario Especial - Azul
  TRAINING: "bg-purple-500", // Formación - Morado
  EARLY_CLOSURE: "bg-orange-500", // Cierre Anticipado - Naranja
  CUSTOM: "bg-gray-500", // Personalizado - Gris
};
```

**Interface:**

```typescript
export interface ExceptionForCalendar {
  id: string;
  date: Date;
  endDate?: Date | null;
  exceptionType: string;
  reason?: string | null;
  isRecurring: boolean;
}

interface ExceptionsCalendarProps {
  exceptions: ExceptionForCalendar[];
  onDayClick?: (date: Date) => void;
  onExceptionClick?: (exception: ExceptionForCalendar) => void;
  onCreateException?: () => void;
  className?: string;
}
```

### 3. Integración en Excepciones Globales

**Archivo:** `/src/app/(main)/dashboard/schedules/_components/global-exceptions-content.tsx`

**Cambios Implementados:**

- ✅ Añadido toggle de vistas (Lista/Calendario) usando Tabs de shadcn/ui
- ✅ Estado `currentView` para controlar la vista activa
- ✅ Conversión de datos al formato `ExceptionForCalendar`
- ✅ Renderizado condicional: tabla o calendario según vista seleccionada
- ✅ Click en excepciones del calendario abre dialog de edición

**Código del Toggle:**

```tsx
<Tabs value={currentView} onValueChange={(value) => setCurrentView(value as "table" | "calendar")}>
  <TabsList>
    <TabsTrigger value="table" className="gap-2">
      <List className="h-4 w-4" />
      Lista
    </TabsTrigger>
    <TabsTrigger value="calendar" className="gap-2">
      <CalendarDays className="h-4 w-4" />
      Calendario
    </TabsTrigger>
  </TabsList>
</Tabs>
```

**Uso del Calendario:**

```tsx
<ExceptionsCalendar
  exceptions={exceptionsForCalendar}
  onExceptionClick={(exception) => {
    const fullException = exceptions.find((e) => e.id === exception.id);
    if (fullException) {
      handleEditClick(fullException);
    }
  }}
  onCreateException={() => setCreateDialogOpen(true)}
/>
```

### 4. Integración en Excepciones de Plantilla

**Archivo:** `/src/app/(main)/dashboard/schedules/[id]/_components/exceptions-tab.tsx`

**Cambios Implementados:**

- ✅ Idéntica implementación que excepciones globales
- ✅ Toggle Lista/Calendario con Tabs
- ✅ Estado y conversión de datos
- ✅ Mismo comportamiento: click para editar, botón para crear

### 5. Funcionalidades del Calendario

**Navegación:**

- ✅ Botones "◀" y "▶" para navegar entre meses
- ✅ Botón "Hoy" para volver al mes actual
- ✅ Título dinámico mostrando "Mes Año" actual

**Visualización:**

- ✅ Días de la semana (L, M, X, J, V, S, D)
- ✅ Grid de 7 columnas con todos los días del mes
- ✅ Día actual resaltado con borde azul
- ✅ Indicadores de excepciones (hasta 3 puntos visibles + indicador de "más")
- ✅ Hover states en días clickeables

**Interactividad:**

- ✅ Click en día con excepción → Abre dialog de edición con datos pre-cargados
- ✅ Click en día vacío → Puede crear nueva excepción (si se implementa `onDayClick`)
- ✅ Botón "Nueva" en header → Crea nueva excepción

**Lista de Excepciones del Mes:**

- ✅ Card debajo del calendario con todas las excepciones
- ✅ Ordenadas por fecha (más cercanas primero)
- ✅ Badge "Anual" para excepciones recurrentes
- ✅ Click en cualquier excepción abre dialog de edición

### 6. Archivos Creados/Modificados

**Nuevo Componente:**

- `/src/app/(main)/dashboard/schedules/_components/exceptions-calendar.tsx` (Nuevo)

**Excepciones Globales:**

- `/src/app/(main)/dashboard/schedules/_components/global-exceptions-content.tsx`
  - ✅ Imports: `List`, `CalendarDays`, `Tabs`, `TabsList`, `TabsTrigger`, `ExceptionsCalendar`
  - ✅ Estado: `currentView`
  - ✅ Conversión: `exceptionsForCalendar`
  - ✅ JSX: Toggle de vistas + renderizado condicional

**Excepciones de Plantilla:**

- `/src/app/(main)/dashboard/schedules/[id]/_components/exceptions-tab.tsx`
  - ✅ Imports: `List`, `CalendarDays`, `Tabs`, `TabsList`, `TabsTrigger`, `ExceptionsCalendar`
  - ✅ Estado: `currentView`
  - ✅ Conversión: `exceptionsForCalendar`
  - ✅ JSX: Toggle de vistas + renderizado condicional

### 7. Flujo de Usuario

**Escenario 1: Visualizar Excepciones en Calendario**

1. Usuario navega a `/dashboard/schedules` (excepciones globales) o `/dashboard/schedules/[id]` (excepciones de plantilla)
2. Click en tab "Calendario" en el toggle superior
3. Se muestra el calendario mensual con todas las excepciones del mes
4. Puntos de colores indican días con excepciones
5. Lista debajo del calendario muestra detalles de cada excepción

**Escenario 2: Editar Excepción desde Calendario**

1. Usuario está en vista de calendario
2. Click en un día que tiene excepciones (marcado con puntos de colores)
3. Se abre automáticamente el dialog de edición con todos los datos pre-cargados
4. Usuario modifica los campos necesarios
5. Click en "Actualizar Excepción"
6. El calendario se recarga mostrando los cambios actualizados

**Escenario 3: Crear Nueva Excepción desde Calendario**

1. Usuario está en vista de calendario
2. Click en botón "Nueva" en el header del calendario
3. Se abre el dialog de creación de excepción
4. Usuario completa los datos
5. Click en "Crear Excepción"
6. El calendario se actualiza mostrando la nueva excepción

**Escenario 4: Navegar entre Meses**

1. Usuario está en vista de calendario
2. Click en botones "◀" o "▶" para cambiar de mes
3. El calendario actualiza mostrando las excepciones del nuevo mes
4. Click en "Hoy" para volver al mes actual

### 8. Responsive y UX

**Desktop:**

- ✅ Calendario ocupa ancho completo con buen espaciado
- ✅ Grid de 7 columnas visible completo
- ✅ Lista de excepciones muestra todas las columnas

**Mobile:**

- ✅ Calendario responsive con células que ajustan su tamaño
- ✅ Días de la semana abreviados (L, M, X, J, V, S, D)
- ✅ Lista de excepciones se adapta verticalmente

**Accesibilidad:**

- ✅ Botones con labels descriptivos
- ✅ Colores con suficiente contraste
- ✅ Tooltips en indicadores de excepciones
- ✅ Estados hover claramente visibles

### 9. Ventajas de la Vista de Calendario

**Para Administradores:**

- 📅 **Visión global**: Ver todas las excepciones del mes de un vistazo
- 🎨 **Identificación rápida**: Colores diferenciados por tipo de excepción
- 📊 **Patrones**: Detectar fácilmente patrones (ej: muchos festivos en diciembre)
- ⚡ **Edición rápida**: Click directo en excepciones para editarlas

**Para Planificación:**

- 🗓️ **Context temporal**: Ver excepciones en contexto de días de la semana
- 📌 **Conflictos**: Identificar días con múltiples excepciones
- 🔄 **Recurrencia**: Excepciones anuales claramente marcadas
- 📈 **Tendencias**: Análisis visual de distribución de excepciones

---

**Estado:** ✅ Vista de Calendario Visual COMPLETADA Y FUNCIONAL

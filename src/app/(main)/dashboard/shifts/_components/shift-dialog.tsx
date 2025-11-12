/**
 * Modal para Crear/Editar Turno
 *
 * Formulario completo con validaciones en tiempo real y warnings visuales.
 */

'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Clock, Loader2 } from 'lucide-react'
import { useShiftsStore } from '../_store/shifts-store'
import type { Shift, ShiftInput } from '../_lib/types'
import { formatDateISO, calculateDuration, formatDuration } from '../_lib/shift-utils'

// Schema de validación con Zod
const shiftFormSchema = z.object({
  employeeId: z.string().min(1, 'Selecciona un empleado'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido (HH:mm)'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido (HH:mm)'),
  costCenterId: z.string().min(1, 'Selecciona un lugar'),
  zoneId: z.string().min(1, 'Selecciona una zona'),
  role: z.string().optional(),
  notes: z.string().optional(),
}).refine(
  (data) => {
    // Validar que endTime sea posterior a startTime (excepto si cruza medianoche)
    const [startH, startM] = data.startTime.split(':').map(Number)
    const [endH, endM] = data.endTime.split(':').map(Number)
    const startMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM

    // Permitir turnos que cruzan medianoche (ej: 22:00-06:00)
    return endMinutes !== startMinutes
  },
  {
    message: 'La hora de fin debe ser diferente a la de inicio',
    path: ['endTime'],
  }
)

type ShiftFormValues = z.infer<typeof shiftFormSchema>

export function ShiftDialog() {
  const {
    isShiftDialogOpen,
    selectedShift,
    shiftDialogPrefill,
    employees,
    costCenters,
    zones,
    closeShiftDialog,
    createShift,
    updateShift,
  } = useShiftsStore()

  const isEditing = !!selectedShift

  const form = useForm<ShiftFormValues>({
    resolver: zodResolver(shiftFormSchema),
    defaultValues: {
      employeeId: '',
      date: formatDateISO(new Date()),
      startTime: '08:00',
      endTime: '16:00',
      costCenterId: '',
      zoneId: '',
      role: '',
      notes: '',
    },
  })

  // Actualizar formulario cuando cambie selectedShift o shiftDialogPrefill
  useEffect(() => {
    if (selectedShift) {
      // Modo edición: cargar datos del turno existente
      form.reset({
        employeeId: selectedShift.employeeId,
        date: selectedShift.date,
        startTime: selectedShift.startTime,
        endTime: selectedShift.endTime,
        costCenterId: selectedShift.costCenterId,
        zoneId: selectedShift.zoneId,
        role: selectedShift.role ?? '',
        notes: selectedShift.notes ?? '',
      })
    } else if (shiftDialogPrefill) {
      // Modo creación con datos pre-rellenados
      form.reset({
        employeeId: shiftDialogPrefill.employeeId ?? '',
        date: shiftDialogPrefill.date ?? formatDateISO(new Date()),
        startTime: shiftDialogPrefill.startTime ?? '08:00',
        endTime: shiftDialogPrefill.endTime ?? '16:00',
        costCenterId: shiftDialogPrefill.costCenterId ?? '',
        zoneId: shiftDialogPrefill.zoneId ?? '',
        role: shiftDialogPrefill.role ?? '',
        notes: shiftDialogPrefill.notes ?? '',
      })
    } else {
      // Modo creación limpio
      form.reset({
        employeeId: '',
        date: formatDateISO(new Date()),
        startTime: '08:00',
        endTime: '16:00',
        costCenterId: '',
        zoneId: '',
        role: '',
        notes: '',
      })
    }
  }, [selectedShift, shiftDialogPrefill, form])

  // Filtrar zonas por lugar seleccionado
  const selectedCostCenterId = form.watch('costCenterId')
  const filteredZones = selectedCostCenterId
    ? zones.filter((z) => z.costCenterId === selectedCostCenterId && z.active)
    : []

  // Calcular duración del turno en tiempo real
  const startTime = form.watch('startTime')
  const endTime = form.watch('endTime')
  const duration = startTime && endTime ? calculateDuration(startTime, endTime) : 0

  // Manejar cambio de lugar (resetear zona si no es válida)
  const handleCostCenterChange = (value: string) => {
    form.setValue('costCenterId', value)
    const currentZoneId = form.getValues('zoneId')
    const isZoneValid = filteredZones.some((z) => z.id === currentZoneId)
    if (!isZoneValid) {
      form.setValue('zoneId', '')
    }
  }

  // Submit del formulario
  const onSubmit = async (data: ShiftFormValues) => {
    const shiftInput: ShiftInput = {
      employeeId: data.employeeId,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      costCenterId: data.costCenterId,
      zoneId: data.zoneId,
      role: data.role || undefined,
      notes: data.notes || undefined,
    }

    if (isEditing) {
      await updateShift(selectedShift.id, shiftInput)
    } else {
      await createShift(shiftInput)
    }

    // El store cierra el diálogo automáticamente después de crear/actualizar
  }

  // Obtener empleado seleccionado para mostrar info
  const selectedEmployeeId = form.watch('employeeId')
  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId)

  return (
    <Dialog open={isShiftDialogOpen} onOpenChange={closeShiftDialog}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Turno' : 'Nuevo Turno'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifica los datos del turno. Los cambios se guardarán al hacer clic en "Actualizar".'
              : 'Completa los datos para crear un nuevo turno. Se guardará como borrador.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Empleado */}
            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Empleado</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un empleado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {employees
                        .filter((e) => e.usesShiftSystem)
                        .map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.firstName} {employee.lastName}
                            {employee.contractHours && (
                              <span className="text-muted-foreground ml-2 text-xs">
                                ({employee.contractHours}h/semana)
                              </span>
                            )}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fecha */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Horarios (Start Time + End Time) */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora inicio</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora fin</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Duración calculada */}
            {duration > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  Duración: {formatDuration(duration)}
                </span>
              </div>
            )}

            {/* Lugar */}
            <FormField
              control={form.control}
              name="costCenterId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lugar de trabajo</FormLabel>
                  <Select onValueChange={handleCostCenterChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un lugar" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {costCenters
                        .filter((cc) => cc.active)
                        .map((costCenter) => (
                          <SelectItem key={costCenter.id} value={costCenter.id}>
                            {costCenter.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Zona */}
            <FormField
              control={form.control}
              name="zoneId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Zona</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={filteredZones.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una zona" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredZones.map((zone) => (
                        <SelectItem key={zone.id} value={zone.id}>
                          {zone.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {filteredZones.length === 0 && (
                    <FormDescription>
                      Selecciona primero un lugar de trabajo
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Rol/Descripción */}
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol o descripción (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Supervisor, Turno mañana..." {...field} />
                  </FormControl>
                  <FormDescription>
                    Descripción breve del tipo de turno o rol
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notas */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Información adicional sobre este turno..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Warnings mock (simulación de conflictos) */}
            {selectedEmployee && (
              <Alert variant="default" className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                <AlertDescription className="text-sm text-amber-800 dark:text-amber-300">
                  ⚠️ <strong>Validación mock:</strong> En el sistema real, aquí se mostrarían conflictos como:
                  solapamientos con otros turnos, descansos insuficientes, exceso de horas semanales, etc.
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeShiftDialog}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? 'Actualizar' : 'Crear Turno'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

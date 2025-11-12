/**
 * Vista Calendario Semanal por Áreas/Zonas
 *
 * Muestra un heatmap de cobertura por zona y día.
 * Visualiza cuántos empleados están asignados vs requeridos en cada zona.
 */

'use client'

import { useMemo } from 'react'
import { Plus, Users, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useShiftsStore } from '../_store/shifts-store'
import { getWeekDays, formatDateShort, formatDateISO, getTimeSlot } from '../_lib/shift-utils'
import type { Zone, Shift } from '../_lib/types'
import { cn } from '@/lib/utils'

export function CalendarWeekArea() {
  const {
    shifts,
    zones,
    employees,
    costCenters,
    currentWeekStart,
    filters,
    openShiftDialog,
  } = useShiftsStore()

  // Obtener días de la semana actual
  const weekDays = useMemo(() => getWeekDays(currentWeekStart), [currentWeekStart])

  // Filtrar zonas por lugar seleccionado
  const filteredZones = useMemo(() => {
    return zones.filter((zone) => {
      if (!zone.active) return false
      if (filters.costCenterId && zone.costCenterId !== filters.costCenterId) {
        return false
      }
      return true
    })
  }, [zones, filters.costCenterId])

  // Calcular estadísticas de cobertura por zona y día
  const coverageGrid = useMemo(() => {
    const grid: Record<string, Record<string, { assigned: number; required: number; shifts: Shift[] }>> = {}

    filteredZones.forEach((zone) => {
      grid[zone.id] = {}
      weekDays.forEach((day) => {
        const dateISO = formatDateISO(day)

        // Turnos asignados en esta zona y día
        const dayShifts = shifts.filter(
          (s) =>
            s.zoneId === zone.id &&
            s.date === dateISO &&
            // Aplicar filtros adicionales
            (!filters.role || s.role?.toLowerCase().includes(filters.role.toLowerCase())) &&
            (!filters.status || s.status === filters.status)
        )

        // Calcular empleados únicos asignados
        const uniqueEmployees = new Set(dayShifts.map(s => s.employeeId))
        const assigned = uniqueEmployees.size

        // Calcular requeridos según franja horaria
        // Para simplificar, usamos la franja "afternoon" como referencia
        const required = zone.requiredCoverage.afternoon

        grid[zone.id][dateISO] = { assigned, required, shifts: dayShifts }
      })
    })

    return grid
  }, [filteredZones, weekDays, shifts, filters])

  // Obtener nombre del empleado
  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find((e) => e.id === employeeId)
    return employee ? `${employee.firstName} ${employee.lastName.charAt(0)}.` : 'Desconocido'
  }

  // Obtener nombre del lugar
  const getCostCenterName = (costCenterId: string) => {
    const cc = costCenters.find((c) => c.id === costCenterId)
    return cc?.name ?? 'Sin lugar'
  }

  // Handler para crear turno en zona/día específico
  const handleCreateShift = (zoneId: string, date: string) => {
    const zone = filteredZones.find((z) => z.id === zoneId)
    if (!zone) return

    openShiftDialog(undefined, {
      date,
      costCenterId: zone.costCenterId,
      zoneId: zone.id,
    })
  }

  if (filteredZones.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-8 text-center">
        <AlertTriangle className="text-muted-foreground h-12 w-12" />
        <div>
          <h3 className="text-lg font-semibold">No hay zonas configuradas</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            {filters.costCenterId
              ? 'No hay zonas activas en el lugar seleccionado.'
              : 'Configura zonas de trabajo para visualizar la cobertura por áreas.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[900px]">
        {/* Header: Días de la semana */}
        <div className="sticky top-0 z-10 grid grid-cols-8 gap-2 bg-background pb-2">
          {/* Columna de zonas */}
          <div className="flex items-center px-3 py-2">
            <span className="text-sm font-semibold">Zona / Día</span>
          </div>

          {/* Columnas de días */}
          {weekDays.map((day) => {
            const isToday = formatDateISO(day) === formatDateISO(new Date())
            return (
              <div
                key={day.toString()}
                className={cn(
                  'flex flex-col items-center justify-center rounded-lg border p-2 text-center',
                  isToday && 'border-primary bg-primary/5'
                )}
              >
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {formatDateShort(day).split(' ')[0]}
                </span>
                <span className={cn('text-lg font-bold', isToday && 'text-primary')}>
                  {formatDateShort(day).split(' ')[1]}
                </span>
              </div>
            )
          })}
        </div>

        {/* Agrupar zonas por lugar */}
        {Array.from(new Set(filteredZones.map(z => z.costCenterId))).map((costCenterId) => {
          const zonesInCenter = filteredZones.filter(z => z.costCenterId === costCenterId)
          const centerName = getCostCenterName(costCenterId)

          return (
            <div key={costCenterId} className="mb-6">
              {/* Header del lugar */}
              {!filters.costCenterId && (
                <div className="mb-2 rounded-lg bg-muted/50 px-4 py-2">
                  <h3 className="text-sm font-semibold">{centerName}</h3>
                </div>
              )}

              {/* Filas: Zonas del lugar */}
              <div className="space-y-2">
                {zonesInCenter.map((zone) => (
                  <div key={zone.id} className="grid grid-cols-8 gap-2">
                    {/* Columna: Nombre de la zona */}
                    <div className="flex flex-col justify-center rounded-lg border bg-card p-3">
                      <p className="text-sm font-semibold">{zone.name}</p>
                      <p className="text-muted-foreground text-xs">
                        Requiere: {zone.requiredCoverage.morning}/{zone.requiredCoverage.afternoon}/
                        {zone.requiredCoverage.night}
                      </p>
                    </div>

                    {/* Columnas: Días (celdas de cobertura) */}
                    {weekDays.map((day) => {
                      const dateISO = formatDateISO(day)
                      const coverage = coverageGrid[zone.id]?.[dateISO]

                      return (
                        <CoverageCell
                          key={`${zone.id}-${dateISO}`}
                          zone={zone}
                          date={dateISO}
                          assigned={coverage?.assigned ?? 0}
                          required={coverage?.required ?? 0}
                          shifts={coverage?.shifts ?? []}
                          getEmployeeName={getEmployeeName}
                          onCreateShift={() => handleCreateShift(zone.id, dateISO)}
                          onEditShift={(shift) => openShiftDialog(shift)}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {/* Leyenda de colores */}
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-lg border bg-card p-4">
          <span className="text-sm font-semibold">Leyenda:</span>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-emerald-500" />
            <span className="text-xs">Cobertura completa</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-amber-500" />
            <span className="text-xs">Cobertura insuficiente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-red-500" />
            <span className="text-xs">Sin cobertura</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-blue-500" />
            <span className="text-xs">Sobrecobertura</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Celda individual de cobertura (una zona en un día)
 */
interface CoverageCellProps {
  zone: Zone
  date: string
  assigned: number
  required: number
  shifts: Shift[]
  getEmployeeName: (id: string) => string
  onCreateShift: () => void
  onEditShift: (shift: Shift) => void
}

function CoverageCell({
  zone,
  date,
  assigned,
  required,
  shifts,
  getEmployeeName,
  onCreateShift,
  onEditShift,
}: CoverageCellProps) {
  // Calcular color según cobertura
  const getCoverageColor = () => {
    if (assigned === 0) return 'bg-red-50 border-red-300 dark:bg-red-950/20 dark:border-red-800'
    if (assigned < required) return 'bg-amber-50 border-amber-300 dark:bg-amber-950/20 dark:border-amber-800'
    if (assigned > required) return 'bg-blue-50 border-blue-300 dark:bg-blue-950/20 dark:border-blue-800'
    return 'bg-emerald-50 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-800'
  }

  const getBadgeVariant = () => {
    if (assigned === 0) return 'destructive'
    if (assigned < required) return 'secondary'
    if (assigned > required) return 'default'
    return 'default'
  }

  // Obtener empleados únicos
  const uniqueEmployeeIds = Array.from(new Set(shifts.map(s => s.employeeId)))

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'group relative min-h-[100px] rounded-lg border-2 p-3 transition-all',
              getCoverageColor(),
              'hover:shadow-md'
            )}
          >
            {/* Header: Ratio de cobertura */}
            <div className="mb-2 flex items-center justify-between">
              <Badge variant={getBadgeVariant()} className="text-xs font-bold">
                {assigned}/{required}
              </Badge>

              {/* Botón para crear turno */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onCreateShift}
                className="h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            {/* Lista de empleados asignados */}
            {uniqueEmployeeIds.length > 0 ? (
              <div className="space-y-1">
                {uniqueEmployeeIds.slice(0, 3).map((empId) => {
                  const empShift = shifts.find(s => s.employeeId === empId)
                  return (
                    <div
                      key={empId}
                      onClick={() => empShift && onEditShift(empShift)}
                      className="cursor-pointer rounded bg-white/50 px-2 py-1 text-xs font-medium transition-colors hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40"
                    >
                      {getEmployeeName(empId)}
                    </div>
                  )
                })}
                {uniqueEmployeeIds.length > 3 && (
                  <div className="text-muted-foreground px-2 text-xs">
                    +{uniqueEmployeeIds.length - 3} más
                  </div>
                )}
              </div>
            ) : (
              <div className="text-muted-foreground flex h-full min-h-[40px] items-center justify-center text-xs">
                Sin asignar
              </div>
            )}

            {/* Indicador de conflictos */}
            {shifts.some(s => s.status === 'conflict') && (
              <div className="absolute top-1 right-1">
                <AlertTriangle className="h-3 w-3 text-destructive" />
              </div>
            )}
          </div>
        </TooltipTrigger>

        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1 text-xs">
            <p className="font-semibold">{zone.name} - {date}</p>
            <p>
              <strong>Asignados:</strong> {assigned} / <strong>Requeridos:</strong> {required}
            </p>
            {uniqueEmployeeIds.length > 0 && (
              <div>
                <strong>Empleados:</strong>
                <ul className="mt-1 list-inside list-disc">
                  {uniqueEmployeeIds.map((empId) => (
                    <li key={empId}>{getEmployeeName(empId)}</li>
                  ))}
                </ul>
              </div>
            )}
            {shifts.length > 0 && (
              <p className="text-muted-foreground italic">
                {shifts.length} {shifts.length === 1 ? 'turno' : 'turnos'} asignado{shifts.length === 1 ? '' : 's'}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Componente Bloque de Turno
 *
 * Representa visualmente un turno en el calendario.
 * Soporta drag & drop y muestra información relevante.
 */

'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AlertTriangle, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { Shift } from '../_lib/types'
import { formatShiftTime, formatDuration, calculateDuration, getShiftStatusColor, getShiftStatusBadgeVariant, getShiftStatusText } from '../_lib/shift-utils'
import { cn } from '@/lib/utils'

interface ShiftBlockProps {
  shift: Shift
  onClick: () => void
  isDraggable?: boolean
  showEmployeeName?: boolean // Para vista por áreas
  employeeName?: string
}

export function ShiftBlock({ shift, onClick, isDraggable = true, showEmployeeName = false, employeeName }: ShiftBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: shift.id,
    disabled: !isDraggable,
    data: {
      type: 'shift',
      shift,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const duration = calculateDuration(shift.startTime, shift.endTime)
  const isConflict = shift.status === 'conflict'

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={(e) => {
              e.stopPropagation()
              onClick()
            }}
            className={cn(
              'group relative cursor-pointer rounded-md border-l-4 p-2 shadow-sm transition-all hover:shadow-md',
              getShiftStatusColor(shift.status),
              isDragging && 'opacity-50 ring-2 ring-primary',
              !isDraggable && 'cursor-default',
            )}
          >
            {/* Header: Tiempo + Badge estado */}
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 text-sm font-medium">
                <Clock className="h-3 w-3" />
                <span>{formatShiftTime(shift.startTime, shift.endTime)}</span>
              </div>

              {isConflict && (
                <AlertTriangle className="text-destructive h-4 w-4" />
              )}
            </div>

            {/* Nombre empleado (si aplica) */}
            {showEmployeeName && employeeName && (
              <p className="text-muted-foreground mb-1 text-xs font-medium">{employeeName}</p>
            )}

            {/* Rol o zona */}
            {shift.role && (
              <p className="text-muted-foreground line-clamp-1 text-xs">{shift.role}</p>
            )}

            {/* Duración */}
            <p className="text-muted-foreground mt-1 text-xs">{formatDuration(duration)}</p>

            {/* Badge de estado (solo si no es published) */}
            {shift.status !== 'published' && (
              <Badge
                variant={getShiftStatusBadgeVariant(shift.status)}
                className="absolute top-1 right-1 text-xs"
              >
                {getShiftStatusText(shift.status)}
              </Badge>
            )}
          </div>
        </TooltipTrigger>

        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1 text-sm">
            <p className="font-semibold">
              {formatShiftTime(shift.startTime, shift.endTime)} ({formatDuration(duration)})
            </p>
            {shift.role && <p className="text-muted-foreground">{shift.role}</p>}
            {shift.notes && <p className="text-muted-foreground italic">{shift.notes}</p>}
            {isConflict && (
              <p className="text-destructive flex items-center gap-1 font-medium">
                <AlertTriangle className="h-3 w-3" />
                Turno con conflictos
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Placeholder para celda vacía (donde se puede soltar un turno)
 */
interface ShiftDropZoneProps {
  isOver: boolean
  canDrop: boolean
}

export function ShiftDropZone({ isOver, canDrop }: ShiftDropZoneProps) {
  return (
    <div
      className={cn(
        'flex h-full min-h-[60px] items-center justify-center rounded-md border-2 border-dashed transition-colors',
        isOver && canDrop && 'border-primary bg-primary/10',
        isOver && !canDrop && 'border-destructive bg-destructive/10',
        !isOver && 'border-transparent',
      )}
    >
      {isOver && (
        <p className="text-muted-foreground text-xs">
          {canDrop ? 'Soltar aquí' : 'No permitido'}
        </p>
      )}
    </div>
  )
}

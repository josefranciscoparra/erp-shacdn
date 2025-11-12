/**
 * Utilidades y Helpers para el Módulo de Turnos
 *
 * Funciones auxiliares para:
 * - Manejo de fechas y semanas
 * - Cálculos de horas y duraciones
 * - Formateo y presentación
 * - Colores y estilos
 */

import type { ShiftStatus, TimeSlot, DayOfWeek, EmployeeWeekStats, ZoneCoverageStats } from './types'
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, eachDayOfInterval, parseISO, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'

// ==================== FECHA Y SEMANA ====================

/**
 * Obtener inicio de semana (Lunes) para una fecha
 * @param date - Fecha a procesar
 * @returns Fecha del lunes de esa semana
 */
export function getWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 }) // 1 = Lunes
}

/**
 * Obtener fin de semana (Domingo) para una fecha
 * @param date - Fecha a procesar
 * @returns Fecha del domingo de esa semana
 */
export function getWeekEnd(date: Date): Date {
  return endOfWeek(date, { weekStartsOn: 1 })
}

/**
 * Obtener todos los días de una semana
 * @param weekStart - Fecha de inicio de semana (Lunes)
 * @returns Array de 7 fechas (Lun-Dom)
 */
export function getWeekDays(weekStart: Date): Date[] {
  const weekEnd = getWeekEnd(weekStart)
  return eachDayOfInterval({ start: weekStart, end: weekEnd })
}

/**
 * Formatear fecha para mostrar (ej: "Lun 18 Nov")
 * @param date - Fecha a formatear
 * @returns String formateado
 */
export function formatDateShort(date: Date): string {
  return format(date, 'EEE d MMM', { locale: es })
}

/**
 * Formatear fecha para input (YYYY-MM-DD)
 * @param date - Fecha a formatear
 * @returns String formato ISO
 */
export function formatDateISO(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/**
 * Formatear rango de semana (ej: "18-24 Nov 2025")
 * @param weekStart - Inicio de semana
 * @returns String formateado
 */
export function formatWeekRange(weekStart: Date): string {
  const weekEnd = getWeekEnd(weekStart)
  const startDay = format(weekStart, 'd')
  const endDay = format(weekEnd, 'd')
  const month = format(weekEnd, 'MMM', { locale: es })
  const year = format(weekEnd, 'yyyy')

  return `${startDay}-${endDay} ${month} ${year}`
}

/**
 * Navegar a semana anterior
 * @param currentWeekStart - Semana actual
 * @returns Nueva fecha de inicio de semana
 */
export function getPreviousWeek(currentWeekStart: Date): Date {
  return subWeeks(currentWeekStart, 1)
}

/**
 * Navegar a semana siguiente
 * @param currentWeekStart - Semana actual
 * @returns Nueva fecha de inicio de semana
 */
export function getNextWeek(currentWeekStart: Date): Date {
  return addWeeks(currentWeekStart, 1)
}

/**
 * Parsear fecha string a Date
 * @param dateString - Formato YYYY-MM-DD
 * @returns Objeto Date
 */
export function parseDate(dateString: string): Date {
  return parseISO(dateString)
}

/**
 * Obtener nombre completo del día de la semana
 * @param date - Fecha
 * @returns Nombre del día (ej: "Lunes")
 */
export function getDayName(date: Date): string {
  return format(date, 'EEEE', { locale: es })
}

/**
 * Obtener día de la semana como tipo DayOfWeek
 * @param date - Fecha
 * @returns DayOfWeek type-safe
 */
export function getDayOfWeek(date: Date): DayOfWeek {
  const dayIndex = date.getDay()
  const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  return days[dayIndex]
}

// ==================== TIEMPO Y DURACIÓN ====================

/**
 * Convertir tiempo HH:mm a minutos desde medianoche
 * @param time - Formato "HH:mm"
 * @returns Minutos (0-1440)
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Convertir minutos a formato HH:mm
 * @param minutes - Minutos desde medianoche
 * @returns Formato "HH:mm"
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24
  const mins = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

/**
 * Calcular duración en horas entre dos tiempos
 * @param startTime - Hora inicio "HH:mm"
 * @param endTime - Hora fin "HH:mm"
 * @returns Horas (decimal)
 */
export function calculateDuration(startTime: string, endTime: string): number {
  let start = timeToMinutes(startTime)
  let end = timeToMinutes(endTime)

  // Si el turno cruza medianoche (ej: 22:00-06:00)
  if (end <= start) {
    end += 24 * 60
  }

  return (end - start) / 60
}

/**
 * Formatear duración para mostrar (ej: "8h", "8.5h")
 * @param hours - Horas (decimal)
 * @returns String formateado
 */
export function formatDuration(hours: number): string {
  if (hours % 1 === 0) {
    return `${hours}h`
  }
  return `${hours.toFixed(1)}h`
}

/**
 * Validar formato de tiempo HH:mm
 * @param time - String a validar
 * @returns True si válido
 */
export function isValidTimeFormat(time: string): boolean {
  const regex = /^([01]\d|2[0-3]):([0-5]\d)$/
  return regex.test(time)
}

/**
 * Determinar franja horaria de un turno
 * @param startTime - Hora inicio "HH:mm"
 * @returns TimeSlot
 */
export function getTimeSlot(startTime: string): TimeSlot {
  const minutes = timeToMinutes(startTime)

  if (minutes >= 0 && minutes < 8 * 60) return 'night' // 00:00-08:00
  if (minutes >= 8 * 60 && minutes < 16 * 60) return 'morning' // 08:00-16:00
  return 'afternoon' // 16:00-00:00
}

// ==================== COLORES Y ESTILOS ====================

/**
 * Obtener color de estado de turno (Tailwind CSS classes)
 * @param status - Estado del turno
 * @returns Clases CSS
 */
export function getShiftStatusColor(status: ShiftStatus): string {
  const colors = {
    draft: 'bg-muted border-muted-foreground/20',
    published: 'bg-primary/10 border-primary',
    conflict: 'bg-destructive/10 border-destructive',
  }
  return colors[status]
}

/**
 * Obtener color de badge de estado
 * @param status - Estado del turno
 * @returns Variant de Badge
 */
export function getShiftStatusBadgeVariant(status: ShiftStatus): 'default' | 'secondary' | 'destructive' {
  const variants = {
    draft: 'secondary' as const,
    published: 'default' as const,
    conflict: 'destructive' as const,
  }
  return variants[status]
}

/**
 * Obtener texto de estado
 * @param status - Estado del turno
 * @returns Texto en español
 */
export function getShiftStatusText(status: ShiftStatus): string {
  const texts = {
    draft: 'Borrador',
    published: 'Publicado',
    conflict: 'Conflicto',
  }
  return texts[status]
}

/**
 * Obtener color de semáforo para horas asignadas
 * @param stats - Estadísticas de empleado
 * @returns Clases CSS de Tailwind
 */
export function getEmployeeStatsColor(stats: EmployeeWeekStats): string {
  const colors = {
    under: 'text-red-600 dark:text-red-400',
    ok: 'text-emerald-600 dark:text-emerald-400',
    over: 'text-amber-600 dark:text-amber-400',
  }
  return colors[stats.status]
}

/**
 * Obtener icono de semáforo para horas asignadas
 * @param stats - Estadísticas de empleado
 * @returns Emoji
 */
export function getEmployeeStatsIcon(stats: EmployeeWeekStats): string {
  const icons = {
    under: '🔴',
    ok: '🟢',
    over: '🟡',
  }
  return icons[stats.status]
}

/**
 * Obtener color de cobertura de zona (heatmap)
 * @param stats - Estadísticas de zona
 * @returns Clases CSS de fondo
 */
export function getZoneCoverageColor(stats: ZoneCoverageStats): string {
  const colors = {
    danger: 'bg-red-100 dark:bg-red-950/30 border-red-300 dark:border-red-700',
    warning: 'bg-amber-100 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700',
    ok: 'bg-emerald-100 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700',
  }
  return colors[stats.status]
}

/**
 * Obtener texto de cobertura de zona
 * @param stats - Estadísticas de zona
 * @returns Texto formateado "3/5"
 */
export function getZoneCoverageText(stats: ZoneCoverageStats): string {
  return `${stats.assigned}/${stats.required}`
}

// ==================== VALIDACIONES ====================

/**
 * Verificar si dos rangos de tiempo solapan
 * @param start1 - Inicio del rango 1 "HH:mm"
 * @param end1 - Fin del rango 1 "HH:mm"
 * @param start2 - Inicio del rango 2 "HH:mm"
 * @param end2 - Fin del rango 2 "HH:mm"
 * @returns True si solapan
 */
export function doTimesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  const s1 = timeToMinutes(start1)
  let e1 = timeToMinutes(end1)
  const s2 = timeToMinutes(start2)
  let e2 = timeToMinutes(end2)

  // Manejar turnos que cruzan medianoche
  if (e1 <= s1) e1 += 24 * 60
  if (e2 <= s2) e2 += 24 * 60

  return (s1 >= s2 && s1 < e2) || (e1 > s2 && e1 <= e2) || (s1 <= s2 && e1 >= e2)
}

/**
 * Verificar si una fecha está dentro de un rango
 * @param date - Fecha a verificar "YYYY-MM-DD"
 * @param start - Fecha inicio "YYYY-MM-DD"
 * @param end - Fecha fin "YYYY-MM-DD"
 * @returns True si está dentro
 */
export function isDateInRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end
}

// ==================== FORMATEO Y PRESENTACIÓN ====================

/**
 * Formatear nombre completo de empleado
 * @param firstName - Nombre
 * @param lastName - Apellido
 * @returns Nombre completo
 */
export function formatEmployeeName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`
}

/**
 * Formatear turno para mostrar (ej: "08:00-16:00")
 * @param startTime - Hora inicio
 * @param endTime - Hora fin
 * @returns String formateado
 */
export function formatShiftTime(startTime: string, endTime: string): string {
  return `${startTime}-${endTime}`
}

/**
 * Formatear turno completo con duración (ej: "08:00-16:00 (8h)")
 * @param startTime - Hora inicio
 * @param endTime - Hora fin
 * @returns String formateado
 */
export function formatShiftWithDuration(startTime: string, endTime: string): string {
  const duration = calculateDuration(startTime, endTime)
  return `${formatShiftTime(startTime, endTime)} (${formatDuration(duration)})`
}

/**
 * Generar ID único temporal para elementos de UI
 * @param prefix - Prefijo del ID
 * @returns ID único
 */
export function generateTempId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Agrupar elementos por clave
 * @param array - Array de elementos
 * @param keyFn - Función para obtener clave
 * @returns Objeto agrupado
 */
export function groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return array.reduce(
    (groups, item) => {
      const key = keyFn(item)
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(item)
      return groups
    },
    {} as Record<string, T[]>,
  )
}

/**
 * Ordenar array por múltiples criterios
 * @param array - Array a ordenar
 * @param compareFns - Funciones de comparación
 * @returns Array ordenado
 */
export function sortBy<T>(array: T[], ...compareFns: Array<(a: T, b: T) => number>): T[] {
  return [...array].sort((a, b) => {
    for (const fn of compareFns) {
      const result = fn(a, b)
      if (result !== 0) return result
    }
    return 0
  })
}

/**
 * Verificar si es fin de semana
 * @param date - Fecha a verificar
 * @returns True si es sábado o domingo
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6 // Domingo = 0, Sábado = 6
}

/**
 * Obtener número de semana del año
 * @param date - Fecha
 * @returns Número de semana (1-53)
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

// ==================== FECHA Y MES ====================

/**
 * Obtener inicio de mes para una fecha
 * @param date - Fecha a procesar
 * @returns Fecha del primer día del mes
 */
export function getMonthStart(date: Date): Date {
  return startOfMonth(date)
}

/**
 * Obtener fin de mes para una fecha
 * @param date - Fecha a procesar
 * @returns Fecha del último día del mes
 */
export function getMonthEnd(date: Date): Date {
  return endOfMonth(date)
}

/**
 * Obtener todos los días de un mes
 * @param monthStart - Fecha de inicio de mes
 * @returns Array de fechas del mes (28-31 días)
 */
export function getMonthDays(monthStart: Date): Date[] {
  const monthEnd = getMonthEnd(monthStart)
  return eachDayOfInterval({ start: monthStart, end: monthEnd })
}

/**
 * Formatear rango de mes (ej: "Noviembre 2025")
 * @param monthStart - Inicio de mes
 * @returns String formateado
 */
export function formatMonthRange(monthStart: Date): string {
  return format(monthStart, 'MMMM yyyy', { locale: es })
}

/**
 * Navegar a mes anterior
 * @param currentMonthStart - Mes actual
 * @returns Nueva fecha de inicio de mes
 */
export function getPreviousMonth(currentMonthStart: Date): Date {
  return subMonths(currentMonthStart, 1)
}

/**
 * Navegar a mes siguiente
 * @param currentMonthStart - Mes actual
 * @returns Nueva fecha de inicio de mes
 */
export function getNextMonth(currentMonthStart: Date): Date {
  return addMonths(currentMonthStart, 1)
}

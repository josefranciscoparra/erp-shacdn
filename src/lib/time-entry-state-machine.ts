/**
 * Máquina de Estados para Fichajes
 *
 * Garantiza transiciones válidas entre estados de fichaje:
 * - CLOCKED_OUT → CLOCK_IN
 * - CLOCKED_IN → CLOCK_OUT, BREAK_START
 * - ON_BREAK → BREAK_END
 *
 * Previene estados inválidos como:
 * - Múltiples CLOCK_IN consecutivos
 * - BREAK_END sin BREAK_START previo
 * - CLOCK_OUT sin CLOCK_IN previo
 */

// Tipos de entrada de fichaje (debe coincidir con TimeEntryType del schema)
export type TimeEntryAction = "CLOCK_IN" | "CLOCK_OUT" | "BREAK_START" | "BREAK_END";

// Estados posibles del empleado
export type TimeEntryState = "CLOCKED_OUT" | "CLOCKED_IN" | "ON_BREAK";

// Mapa de transiciones válidas: desde cada estado, qué acciones son permitidas
const VALID_TRANSITIONS: Record<TimeEntryState, TimeEntryAction[]> = {
  CLOCKED_OUT: ["CLOCK_IN"],
  CLOCKED_IN: ["CLOCK_OUT", "BREAK_START"],
  ON_BREAK: ["BREAK_END"],
};

// Mapa de siguiente estado después de cada acción
const NEXT_STATE: Record<TimeEntryAction, TimeEntryState> = {
  CLOCK_IN: "CLOCKED_IN",
  CLOCK_OUT: "CLOCKED_OUT",
  BREAK_START: "ON_BREAK",
  BREAK_END: "CLOCKED_IN",
};

// Mensajes de error descriptivos para el usuario
const ERROR_MESSAGES: Record<string, string> = {
  "CLOCKED_OUT→CLOCK_OUT": "No puedes fichar salida sin haber fichado entrada",
  "CLOCKED_OUT→BREAK_START": "No puedes iniciar una pausa sin haber fichado entrada",
  "CLOCKED_OUT→BREAK_END": "No puedes finalizar una pausa sin haber fichado entrada",
  "CLOCKED_IN→CLOCK_IN": "Ya has fichado entrada. Debes fichar salida primero",
  "CLOCKED_IN→BREAK_END": "No puedes finalizar una pausa sin haberla iniciado",
  "ON_BREAK→CLOCK_IN": "Estás en pausa. Debes finalizar la pausa primero",
  "ON_BREAK→CLOCK_OUT": "Estás en pausa. Debes finalizar la pausa primero",
  "ON_BREAK→BREAK_START": "Ya estás en pausa",
};

/**
 * Valida si una transición de estado es válida
 */
export function validateTransition(currentState: TimeEntryState, action: TimeEntryAction): boolean {
  const validActions = VALID_TRANSITIONS[currentState];
  return validActions?.includes(action) ?? false;
}

/**
 * Obtiene el siguiente estado después de una acción
 */
export function getNextState(action: TimeEntryAction): TimeEntryState {
  return NEXT_STATE[action];
}

/**
 * Obtiene un mensaje de error descriptivo para una transición inválida
 */
export function getTransitionError(currentState: TimeEntryState, action: TimeEntryAction): string {
  const key = `${currentState}→${action}`;
  return ERROR_MESSAGES[key] ?? `Transición no permitida: ${currentState} → ${action}`;
}

/**
 * Deriva el estado actual a partir del último tipo de entrada
 * Útil para determinar el estado inicial cuando se consulta el último fichaje
 */
export function deriveStateFromEntryType(entryType: TimeEntryAction | null): TimeEntryState {
  if (!entryType) {
    return "CLOCKED_OUT";
  }

  switch (entryType) {
    case "CLOCK_IN":
      return "CLOCKED_IN";
    case "CLOCK_OUT":
      return "CLOCKED_OUT";
    case "BREAK_START":
      return "ON_BREAK";
    case "BREAK_END":
      return "CLOCKED_IN";
    default:
      return "CLOCKED_OUT";
  }
}

/**
 * Resultado de validación con información detallada
 */
export interface TransitionValidationResult {
  isValid: boolean;
  currentState: TimeEntryState;
  requestedAction: TimeEntryAction;
  nextState?: TimeEntryState;
  errorMessage?: string;
}

/**
 * Valida una transición y devuelve información detallada
 */
export function validateTransitionDetailed(
  currentState: TimeEntryState,
  action: TimeEntryAction
): TransitionValidationResult {
  const isValid = validateTransition(currentState, action);

  if (isValid) {
    return {
      isValid: true,
      currentState,
      requestedAction: action,
      nextState: getNextState(action),
    };
  }

  return {
    isValid: false,
    currentState,
    requestedAction: action,
    errorMessage: getTransitionError(currentState, action),
  };
}

/**
 * Obtiene las acciones permitidas desde un estado dado
 */
export function getAllowedActions(currentState: TimeEntryState): TimeEntryAction[] {
  return VALID_TRANSITIONS[currentState] ?? [];
}

/**
 * Mapea el status string del sistema actual al TimeEntryState
 * Compatible con getCurrentStatus() de time-tracking.ts
 */
export function mapStatusToState(
  status: "CLOCKED_OUT" | "CLOCKED_IN" | "ON_BREAK" | string
): TimeEntryState {
  switch (status) {
    case "CLOCKED_OUT":
      return "CLOCKED_OUT";
    case "CLOCKED_IN":
      return "CLOCKED_IN";
    case "ON_BREAK":
      return "ON_BREAK";
    default:
      return "CLOCKED_OUT";
  }
}

/**
 * Mapea el tipo de entrada del schema a TimeEntryAction
 */
export function mapEntryTypeToAction(
  entryType: "CLOCK_IN" | "CLOCK_OUT" | "BREAK_START" | "BREAK_END" | string
): TimeEntryAction | null {
  switch (entryType) {
    case "CLOCK_IN":
      return "CLOCK_IN";
    case "CLOCK_OUT":
      return "CLOCK_OUT";
    case "BREAK_START":
      return "BREAK_START";
    case "BREAK_END":
      return "BREAK_END";
    default:
      return null;
  }
}

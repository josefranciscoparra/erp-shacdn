/**
 * Store Zustand para "Mis Turnos" (Empleados)
 *
 * Gestiona:
 * - Solicitudes de cambio de turno
 * - Filtros y preferencias de vista
 * - Exportación de turnos
 */

import { create } from "zustand";

import type { ShiftChangeRequest, ShiftChangeRequestInput } from "../_lib/my-shifts-types";

interface MyShiftsState {
  // Solicitudes de cambio
  changeRequests: ShiftChangeRequest[];
  isLoadingRequests: boolean;

  // Dialogs
  isChangeRequestDialogOpen: boolean;
  selectedShiftIdForChange: string | null;

  // Vista
  calendarView: "week" | "month";

  // Actions - Solicitudes
  fetchChangeRequests: () => Promise<void>;
  createChangeRequest: (input: ShiftChangeRequestInput) => Promise<void>;
  cancelChangeRequest: (requestId: string) => Promise<void>;

  // Actions - Dialogs
  openChangeRequestDialog: (shiftId: string) => void;
  closeChangeRequestDialog: () => void;

  // Actions - Vista
  setCalendarView: (view: "week" | "month") => void;
}

// MOCK: ID del empleado actual (en producción vendría del auth)
const CURRENT_EMPLOYEE_ID = "emp_001"; // Francesc Costa

/**
 * MOCK DATA: Solicitudes de cambio de turno
 */
const MOCK_CHANGE_REQUESTS: ShiftChangeRequest[] = [
  {
    id: "req_001",
    shiftId: "shift_001", // Turno del lunes 10
    requesterId: CURRENT_EMPLOYEE_ID,
    requesterName: "Francesc Costa",
    reason: "Cita médica urgente por la mañana",
    status: "pending",
    suggestedEmployeeId: "emp_002",
    suggestedEmployeeName: "Maria García",
    createdAt: new Date("2025-11-11T10:00:00"),
  },
  {
    id: "req_002",
    shiftId: "shift_015", // Turno anterior
    requesterId: CURRENT_EMPLOYEE_ID,
    requesterName: "Francesc Costa",
    reason: "Evento familiar",
    status: "approved",
    reviewerId: "emp_999",
    reviewerName: "Carlos Manager",
    reviewNotes: "Aprobado. Maria García cubrirá el turno.",
    createdAt: new Date("2025-11-05T14:30:00"),
    reviewedAt: new Date("2025-11-06T09:15:00"),
  },
  {
    id: "req_003",
    shiftId: "shift_020",
    requesterId: CURRENT_EMPLOYEE_ID,
    requesterName: "Francesc Costa",
    reason: "Conflicto con otro trabajo",
    status: "rejected",
    reviewerId: "emp_999",
    reviewerName: "Carlos Manager",
    reviewNotes: "No hay cobertura disponible para ese día. Lo siento.",
    createdAt: new Date("2025-10-28T16:00:00"),
    reviewedAt: new Date("2025-10-29T10:00:00"),
  },
];

/**
 * Store de Mis Turnos
 */
export const useMyShiftsStore = create<MyShiftsState>((set) => ({
  // State inicial
  changeRequests: [],
  isLoadingRequests: false,
  isChangeRequestDialogOpen: false,
  selectedShiftIdForChange: null,
  calendarView: "week",

  // Fetch solicitudes
  fetchChangeRequests: async () => {
    set({ isLoadingRequests: true });

    // Simular API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    set({
      changeRequests: MOCK_CHANGE_REQUESTS,
      isLoadingRequests: false,
    });
  },

  // Crear solicitud de cambio
  createChangeRequest: async (input: ShiftChangeRequestInput) => {
    set({ isLoadingRequests: true });

    // Simular API delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    const newRequest: ShiftChangeRequest = {
      id: `req_${Date.now()}`,
      shiftId: input.shiftId,
      requesterId: CURRENT_EMPLOYEE_ID,
      requesterName: "Francesc Costa",
      reason: input.reason,
      status: "pending",
      suggestedEmployeeId: input.suggestedEmployeeId,
      suggestedDate: input.suggestedDate,
      createdAt: new Date(),
    };

    set((state) => ({
      changeRequests: [newRequest, ...state.changeRequests],
      isLoadingRequests: false,
      isChangeRequestDialogOpen: false,
      selectedShiftIdForChange: null,
    }));
  },

  // Cancelar solicitud (solo si está pendiente)
  cancelChangeRequest: async (requestId: string) => {
    set({ isLoadingRequests: true });

    await new Promise((resolve) => setTimeout(resolve, 500));

    set((state) => ({
      changeRequests: state.changeRequests.filter((r) => r.id !== requestId),
      isLoadingRequests: false,
    }));
  },

  // Dialogs
  openChangeRequestDialog: (shiftId: string) => {
    set({
      isChangeRequestDialogOpen: true,
      selectedShiftIdForChange: shiftId,
    });
  },

  closeChangeRequestDialog: () => {
    set({
      isChangeRequestDialogOpen: false,
      selectedShiftIdForChange: null,
    });
  },

  // Vista
  setCalendarView: (view: "week" | "month") => {
    set({ calendarView: view });
  },
}));

/**
 * Hook para obtener el empleado actual (MOCK)
 * En producción, esto vendría del contexto de autenticación
 */
export function useCurrentEmployee() {
  return {
    id: CURRENT_EMPLOYEE_ID,
    firstName: "Francesc",
    lastName: "Costa",
    contractHours: 40,
  };
}

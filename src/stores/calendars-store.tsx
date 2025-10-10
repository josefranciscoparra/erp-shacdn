"use client";

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export type CalendarEventData = {
  id: string;
  name: string;
  description: string | null;
  date: Date;
  endDate: Date | null;
  eventType: string;
  isRecurring: boolean;
  calendarId: string;
};

export type CalendarData = {
  id: string;
  name: string;
  description: string | null;
  year: number;
  calendarType: string;
  color: string;
  active: boolean;
  costCenter?: {
    id: string;
    name: string;
  } | null;
  _count?: {
    events: number;
  };
  events?: CalendarEventData[];
  createdAt: Date;
  updatedAt: Date;
};

type CalendarsState = {
  calendars: CalendarData[];
  selectedCalendar: CalendarData | null;
  isLoading: boolean;
  error: string | null;
};

type CalendarsActions = {
  fetchCalendars: () => Promise<void>;
  fetchCalendarById: (id: string) => Promise<void>;
  createCalendar: (data: Partial<CalendarData>) => Promise<CalendarData | null>;
  updateCalendar: (id: string, data: Partial<CalendarData>) => Promise<void>;
  deleteCalendar: (id: string) => Promise<void>;
  setSelectedCalendar: (calendar: CalendarData | null) => void;
  createEvent: (calendarId: string, data: Partial<CalendarEventData>) => Promise<CalendarEventData | null>;
  updateEvent: (calendarId: string, eventId: string, data: Partial<CalendarEventData>) => Promise<void>;
  deleteEvent: (calendarId: string, eventId: string) => Promise<void>;
  reset: () => void;
};

const initialState: CalendarsState = {
  calendars: [],
  selectedCalendar: null,
  isLoading: false,
  error: null,
};

export const useCalendarsStore = create<CalendarsState & CalendarsActions>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    fetchCalendars: async () => {
      set({ isLoading: true, error: null });
      try {
        const response = await fetch("/api/calendars", {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error("Error al cargar calendarios");
        }
        const calendars = await response.json();
        set({ calendars, isLoading: false });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : "Error desconocido",
          isLoading: false,
        });
      }
    },

    fetchCalendarById: async (id: string) => {
      set({ isLoading: true, error: null });
      try {
        const response = await fetch(`/api/calendars/${id}`, {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error("Error al cargar calendario");
        }
        const calendar = await response.json();
        set({ selectedCalendar: calendar, isLoading: false });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : "Error desconocido",
          isLoading: false,
        });
      }
    },

    createCalendar: async (data: Partial<CalendarData>) => {
      set({ isLoading: true, error: null });
      try {
        const normalizeId = (value?: string | null) => {
          if (!value) return null;
          const trimmed = String(value).trim();
          if (!trimmed || trimmed === "__none__") {
            return null;
          }
          return trimmed;
        };

        const payload = {
          ...data,
          costCenterId: normalizeId(data.costCenterId as string | null | undefined) ?? null,
        };

        const response = await fetch("/api/calendars", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          throw new Error("Error al crear calendario");
        }
        const newCalendar = await response.json();
        set((state) => ({
          calendars: [...state.calendars, newCalendar],
          isLoading: false,
        }));
        return newCalendar;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : "Error desconocido",
          isLoading: false,
        });
        return null;
      }
    },

    updateCalendar: async (id: string, data: Partial<CalendarData>) => {
      set({ isLoading: true, error: null });
      try {
        const normalizeId = (value?: string | null) => {
          if (!value) return null;
          const trimmed = String(value).trim();
          if (!trimmed || trimmed === "__none__") {
            return null;
          }
          return trimmed;
        };

        const payload = {
          ...data,
          costCenterId: normalizeId(data.costCenterId as string | null | undefined),
        };

        const response = await fetch(`/api/calendars/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          throw new Error("Error al actualizar calendario");
        }
        const updatedCalendar = await response.json();
        set((state) => ({
          calendars: state.calendars.map((cal) => (cal.id === id ? updatedCalendar : cal)),
          selectedCalendar: state.selectedCalendar?.id === id ? updatedCalendar : state.selectedCalendar,
          isLoading: false,
        }));
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : "Error desconocido",
          isLoading: false,
        });
      }
    },

    deleteCalendar: async (id: string) => {
      set({ isLoading: true, error: null });
      try {
        const response = await fetch(`/api/calendars/${id}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error("Error al eliminar calendario");
        }
        set((state) => ({
          calendars: state.calendars.filter((cal) => cal.id !== id),
          selectedCalendar: state.selectedCalendar?.id === id ? null : state.selectedCalendar,
          isLoading: false,
        }));
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : "Error desconocido",
          isLoading: false,
        });
      }
    },

    createEvent: async (calendarId: string, data: Partial<CalendarEventData>) => {
      set({ isLoading: true, error: null });
      try {
        const response = await fetch(`/api/calendars/${calendarId}/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          throw new Error("Error al crear evento");
        }
        const newEvent = await response.json();

        // Actualizar el calendario seleccionado con el nuevo evento
        const state = get();
        if (state.selectedCalendar && state.selectedCalendar.id === calendarId) {
          set({
            selectedCalendar: {
              ...state.selectedCalendar,
              events: [...(state.selectedCalendar.events ?? []), newEvent],
            },
            isLoading: false,
          });
        } else {
          set({ isLoading: false });
        }

        return newEvent;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : "Error desconocido",
          isLoading: false,
        });
        return null;
      }
    },

    updateEvent: async (calendarId: string, eventId: string, data: Partial<CalendarEventData>) => {
      set({ isLoading: true, error: null });
      try {
        const response = await fetch(`/api/calendars/${calendarId}/events/${eventId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          throw new Error("Error al actualizar evento");
        }
        const updatedEvent = await response.json();

        // Actualizar el evento en el calendario seleccionado
        const state = get();
        if (state.selectedCalendar && state.selectedCalendar.id === calendarId) {
          set({
            selectedCalendar: {
              ...state.selectedCalendar,
              events: (state.selectedCalendar.events ?? []).map((event) =>
                event.id === eventId ? updatedEvent : event,
              ),
            },
            isLoading: false,
          });
        } else {
          set({ isLoading: false });
        }
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : "Error desconocido",
          isLoading: false,
        });
      }
    },

    deleteEvent: async (calendarId: string, eventId: string) => {
      set({ isLoading: true, error: null });
      try {
        const response = await fetch(`/api/calendars/${calendarId}/events/${eventId}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error("Error al eliminar evento");
        }

        // Eliminar el evento del calendario seleccionado
        const state = get();
        if (state.selectedCalendar && state.selectedCalendar.id === calendarId) {
          set({
            selectedCalendar: {
              ...state.selectedCalendar,
              events: (state.selectedCalendar.events ?? []).filter((event) => event.id !== eventId),
            },
            isLoading: false,
          });
        } else {
          set({ isLoading: false });
        }
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : "Error desconocido",
          isLoading: false,
        });
      }
    },

    setSelectedCalendar: (calendar: CalendarData | null) => {
      set({ selectedCalendar: calendar });
    },

    reset: () => {
      set(initialState);
    },
  })),
);

"use client";

import { create } from "zustand";

export interface TemporaryPassword {
  id: string;
  password: string;
  createdAt: string;
  expiresAt: string;
  reason: string | null;
  usedAt: string | null;
  active: boolean;
  invalidatedAt: string | null;
  invalidatedReason: string | null;
  createdBy: {
    name: string;
  };
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  secondLastName: string | null;
  employeeNumber: string | null;
  employmentStatus: string;
}

export interface Session {
  expires: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  mustChangePassword: boolean;
  emailVerified: string | null;
  createdAt: string;
  updatedAt: string;
  employee: Employee | null;
  temporaryPasswords: TemporaryPassword[];
  sessions: Session[];
}

export interface UsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ResetPasswordData {
  reason?: string;
}

interface AdminUsersState {
  // Data
  users: AdminUser[];
  selectedUser: AdminUser | null;

  // UI State
  isLoading: boolean;
  isActionLoading: boolean;
  error: string | null;

  // Pagination
  page: number;
  limit: number;
  total: number;
  totalPages: number;

  // Filters
  status: "all" | "active" | "inactive" | "with-temp-password";

  // Actions
  fetchUsers: (params?: { page?: number; limit?: number; status?: string }) => Promise<void>;
  resetPassword: (userId: string, data: ResetPasswordData) => Promise<{ temporaryPassword: string; expiresAt: string }>;
  changeRole: (userId: string, role: string) => Promise<void>;
  toggleActive: (userId: string) => Promise<void>;
  setSelectedUser: (user: AdminUser | null) => void;
  setStatus: (status: "all" | "active" | "inactive" | "with-temp-password") => void;
  setPage: (page: number) => void;
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  users: [],
  selectedUser: null,
  isLoading: false,
  isActionLoading: false,
  error: null,
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
  status: "all" as const,
};

export const useAdminUsersStore = create<AdminUsersState>((set, get) => ({
  ...initialState,

  fetchUsers: async (params = {}) => {
    const { page = 1, limit = 10, status = "all" } = params;

    set({ isLoading: true, error: null });

    try {
      const searchParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (status !== "all") {
        searchParams.append("status", status);
      }

      const response = await fetch(`/api/admin/users?${searchParams}`, {
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error ?? "Error al cargar usuarios");
      }

      const data: UsersResponse = await response.json();

      set({
        users: data.users,
        total: data.total,
        page: data.page,
        limit: data.limit,
        totalPages: data.totalPages,
        status: status as any,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message,
        isLoading: false,
      });
      throw error;
    }
  },

  resetPassword: async (userId: string, data: ResetPasswordData) => {
    set({ isActionLoading: true, error: null });

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          action: "reset-password",
          userId,
          ...data,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error ?? "Error al resetear contraseña");
      }

      const result = await response.json();

      // Actualizar la lista de usuarios para reflejar los cambios
      await get().fetchUsers({
        page: get().page,
        limit: get().limit,
        status: get().status,
      });

      set({ isActionLoading: false });

      return {
        temporaryPassword: result.temporaryPassword,
        expiresAt: result.expiresAt,
      };
    } catch (error: any) {
      set({
        error: error.message,
        isActionLoading: false,
      });
      throw error;
    }
  },

  changeRole: async (userId: string, role: string) => {
    set({ isActionLoading: true, error: null });

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          action: "change-role",
          userId,
          role,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error ?? "Error al cambiar rol");
      }

      // Actualizar la lista de usuarios
      const { users } = get();
      set({
        users: users.map((user) => (user.id === userId ? { ...user, role } : user)),
        selectedUser: get().selectedUser?.id === userId ? { ...get().selectedUser!, role } : get().selectedUser,
        isActionLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message,
        isActionLoading: false,
      });
      throw error;
    }
  },

  toggleActive: async (userId: string) => {
    set({ isActionLoading: true, error: null });

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          action: "toggle-active",
          userId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error ?? "Error al cambiar estado");
      }

      const result = await response.json();

      // Actualizar la lista de usuarios
      const { users } = get();
      set({
        users: users.map((user) => (user.id === userId ? { ...user, active: result.active } : user)),
        selectedUser:
          get().selectedUser?.id === userId ? { ...get().selectedUser!, active: result.active } : get().selectedUser,
        isActionLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message,
        isActionLoading: false,
      });
      throw error;
    }
  },

  setSelectedUser: (user: AdminUser | null) => {
    set({ selectedUser: user });
  },

  setStatus: (status: "all" | "active" | "inactive" | "with-temp-password") => {
    set({ status, page: 1 }); // Reset page when changing status
  },

  setPage: (page: number) => {
    set({ page });
  },

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set(initialState);
  },
}));

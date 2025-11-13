import { create } from "zustand";

// Tipos base
export type ExpenseStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "REIMBURSED";
export type ExpenseCategory = "FUEL" | "MILEAGE" | "MEAL" | "TOLL" | "PARKING" | "LODGING" | "OTHER";
export type ApprovalDecision = "PENDING" | "APPROVED" | "REJECTED";

export interface ExpenseAttachment {
  id: string;
  url: string;
  fileName: string;
  mimeType: string | null;
  fileSize: number;
  createdAt: Date;
  expenseId: string;
}

export interface ExpenseApproval {
  id: string;
  decision: ApprovalDecision;
  comment: string | null;
  decidedAt: Date | null;
  level: number;
  approverId: string;
  approver: {
    id: string;
    name: string | null;
    email: string;
  };
  expenseId: string;
}

export interface Expense {
  id: string;
  date: Date;
  currency: string;
  amount: number;
  vatPercent: number | null;
  totalAmount: number;
  category: ExpenseCategory;
  mileageKm: number | null;
  mileageRate: number | null;
  costCenterId: string | null;
  notes: string | null;
  merchantName: string | null;
  merchantVat: string | null;
  ocrRawData: any;
  status: ExpenseStatus;
  createdAt: Date;
  updatedAt: Date;
  orgId: string;
  employeeId: string;
  attachments?: ExpenseAttachment[];
  approvals?: ExpenseApproval[];
  costCenter?: {
    id: string;
    name: string;
    code: string;
  } | null;
}

export interface ExpenseFilters {
  status?: ExpenseStatus;
  category?: ExpenseCategory;
  dateFrom?: Date;
  dateTo?: Date;
  costCenterId?: string;
}

export interface ExpenseFormData {
  date: Date;
  currency?: string;
  amount: number;
  vatPercent?: number | null;
  category: ExpenseCategory;
  mileageKm?: number | null;
  costCenterId?: string | null;
  notes?: string | null;
  merchantName?: string | null;
  merchantVat?: string | null;
  ocrRawData?: any;
}

interface ExpensesState {
  expenses: Expense[];
  selectedExpense: Expense | null;
  filters: ExpenseFilters;
  isLoading: boolean;
  error: string | null;

  // Sync actions
  setExpenses: (expenses: Expense[]) => void;
  addExpense: (expense: Expense) => void;
  updateExpenseInList: (id: string, expense: Partial<Expense>) => void;
  removeExpense: (id: string) => void;
  setSelectedExpense: (expense: Expense | null) => void;
  setFilters: (filters: ExpenseFilters) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Async actions - Expenses
  fetchMyExpenses: (filters?: ExpenseFilters) => Promise<void>;
  fetchExpenseById: (id: string) => Promise<void>;
  createExpense: (data: ExpenseFormData) => Promise<Expense | null>;
  updateExpense: (id: string, data: Partial<ExpenseFormData>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  submitExpense: (id: string) => Promise<void>;

  // Async actions - Attachments
  uploadAttachment: (expenseId: string, file: File) => Promise<void>;
  fetchAttachments: (expenseId: string) => Promise<ExpenseAttachment[]>;

  // Stats
  getExpensesByStatus: (status: ExpenseStatus) => Expense[];
  getTotalByStatus: (status: ExpenseStatus) => number;
}

export const useExpensesStore = create<ExpensesState>()((set, get) => ({
  expenses: [],
  selectedExpense: null,
  filters: {},
  isLoading: false,
  error: null,

  // Sync actions
  setExpenses: (expenses) => set({ expenses }),

  addExpense: (expense) =>
    set((state) => ({
      expenses: [expense, ...state.expenses],
    })),

  updateExpenseInList: (id, expenseData) =>
    set((state) => ({
      expenses: state.expenses.map((exp) => (exp.id === id ? { ...exp, ...expenseData } : exp)),
      selectedExpense:
        state.selectedExpense?.id === id ? { ...state.selectedExpense, ...expenseData } : state.selectedExpense,
    })),

  removeExpense: (id) =>
    set((state) => ({
      expenses: state.expenses.filter((exp) => exp.id !== id),
      selectedExpense: state.selectedExpense?.id === id ? null : state.selectedExpense,
    })),

  setSelectedExpense: (expense) => set({ selectedExpense: expense }),
  setFilters: (filters) => set({ filters }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Async actions - Expenses
  fetchMyExpenses: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      // Construir query params
      const params = new URLSearchParams();
      if (filters?.status) params.append("status", filters.status);
      if (filters?.category) params.append("category", filters.category);
      if (filters?.dateFrom) params.append("dateFrom", filters.dateFrom.toISOString());
      if (filters?.dateTo) params.append("dateTo", filters.dateTo.toISOString());
      if (filters?.costCenterId) params.append("costCenterId", filters.costCenterId);

      const response = await fetch(`/api/expenses?${params.toString()}`, {
        credentials: "include",
      });

      if (!response.ok) throw new Error("Error al cargar gastos");

      const expenses = await response.json();

      // Convertir fechas string a Date
      const parsedExpenses = expenses.map((exp: any) => ({
        ...exp,
        date: new Date(exp.date),
        createdAt: new Date(exp.createdAt),
        updatedAt: new Date(exp.updatedAt),
        amount: Number(exp.amount),
        vatPercent: exp.vatPercent ? Number(exp.vatPercent) : null,
        totalAmount: Number(exp.totalAmount),
        mileageKm: exp.mileageKm ? Number(exp.mileageKm) : null,
        mileageRate: exp.mileageRate ? Number(exp.mileageRate) : null,
        attachments: exp.attachments?.map((att: any) => ({
          ...att,
          createdAt: new Date(att.createdAt),
        })),
        approvals: exp.approvals?.map((app: any) => ({
          ...app,
          decidedAt: app.decidedAt ? new Date(app.decidedAt) : null,
        })),
      }));

      set({ expenses: parsedExpenses, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error desconocido",
        isLoading: false,
      });
    }
  },

  fetchExpenseById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        credentials: "include",
      });

      if (!response.ok) throw new Error("Error al cargar gasto");

      const expense = await response.json();

      // Convertir fechas
      const parsedExpense = {
        ...expense,
        date: new Date(expense.date),
        createdAt: new Date(expense.createdAt),
        updatedAt: new Date(expense.updatedAt),
        amount: Number(expense.amount),
        vatPercent: expense.vatPercent ? Number(expense.vatPercent) : null,
        totalAmount: Number(expense.totalAmount),
        mileageKm: expense.mileageKm ? Number(expense.mileageKm) : null,
        mileageRate: expense.mileageRate ? Number(expense.mileageRate) : null,
        attachments: expense.attachments?.map((att: any) => ({
          ...att,
          createdAt: new Date(att.createdAt),
        })),
        approvals: expense.approvals?.map((app: any) => ({
          ...app,
          decidedAt: app.decidedAt ? new Date(app.decidedAt) : null,
        })),
      };

      set({ selectedExpense: parsedExpense, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error desconocido",
        isLoading: false,
      });
    }
  },

  createExpense: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...data,
          date: data.date.toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error ?? "Error al crear gasto");
      }

      const newExpense = await response.json();

      // Convertir fechas
      const parsedExpense = {
        ...newExpense,
        date: new Date(newExpense.date),
        createdAt: new Date(newExpense.createdAt),
        updatedAt: new Date(newExpense.updatedAt),
        amount: Number(newExpense.amount),
        vatPercent: newExpense.vatPercent ? Number(newExpense.vatPercent) : null,
        totalAmount: Number(newExpense.totalAmount),
        mileageKm: newExpense.mileageKm ? Number(newExpense.mileageKm) : null,
        mileageRate: newExpense.mileageRate ? Number(newExpense.mileageRate) : null,
      };

      get().addExpense(parsedExpense);
      set({ isLoading: false });

      return parsedExpense;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error desconocido",
        isLoading: false,
      });
      return null;
    }
  },

  updateExpense: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...data,
          ...(data.date && { date: data.date.toISOString() }),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error ?? "Error al actualizar gasto");
      }

      const updatedExpense = await response.json();

      // Convertir fechas
      const parsedExpense = {
        ...updatedExpense,
        date: new Date(updatedExpense.date),
        createdAt: new Date(updatedExpense.createdAt),
        updatedAt: new Date(updatedExpense.updatedAt),
        amount: Number(updatedExpense.amount),
        vatPercent: updatedExpense.vatPercent ? Number(updatedExpense.vatPercent) : null,
        totalAmount: Number(updatedExpense.totalAmount),
        mileageKm: updatedExpense.mileageKm ? Number(updatedExpense.mileageKm) : null,
        mileageRate: updatedExpense.mileageRate ? Number(updatedExpense.mileageRate) : null,
      };

      get().updateExpenseInList(id, parsedExpense);
      set({ isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error desconocido",
        isLoading: false,
      });
    }
  },

  deleteExpense: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error ?? "Error al eliminar gasto");
      }

      get().removeExpense(id);
      set({ isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error desconocido",
        isLoading: false,
      });
    }
  },

  submitExpense: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/expenses/${id}/submit`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error ?? "Error al enviar gasto");
      }

      const updatedExpense = await response.json();

      // Convertir fechas
      const parsedExpense = {
        ...updatedExpense,
        date: new Date(updatedExpense.date),
        createdAt: new Date(updatedExpense.createdAt),
        updatedAt: new Date(updatedExpense.updatedAt),
        amount: Number(updatedExpense.amount),
        vatPercent: updatedExpense.vatPercent ? Number(updatedExpense.vatPercent) : null,
        totalAmount: Number(updatedExpense.totalAmount),
        mileageKm: updatedExpense.mileageKm ? Number(updatedExpense.mileageKm) : null,
        mileageRate: updatedExpense.mileageRate ? Number(updatedExpense.mileageRate) : null,
      };

      get().updateExpenseInList(id, parsedExpense);
      set({ isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error desconocido",
        isLoading: false,
      });
      throw error;
    }
  },

  // Async actions - Attachments
  uploadAttachment: async (expenseId, file) => {
    set({ isLoading: true, error: null });
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/expenses/${expenseId}/attachments`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error ?? "Error al subir archivo");
      }

      const attachment = await response.json();

      // Actualizar el expense con el nuevo attachment
      const expense = get().expenses.find((exp) => exp.id === expenseId);
      if (expense) {
        get().updateExpenseInList(expenseId, {
          attachments: [...(expense.attachments ?? []), attachment],
        });
      }

      set({ isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error desconocido",
        isLoading: false,
      });
      throw error;
    }
  },

  fetchAttachments: async (expenseId) => {
    try {
      const response = await fetch(`/api/expenses/${expenseId}/attachments`, {
        credentials: "include",
      });

      if (!response.ok) throw new Error("Error al cargar adjuntos");

      const attachments = await response.json();

      return attachments.map((att: any) => ({
        ...att,
        createdAt: new Date(att.createdAt),
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error desconocido",
      });
      return [];
    }
  },

  // Stats helpers
  getExpensesByStatus: (status) => {
    return get().expenses.filter((exp) => exp.status === status);
  },

  getTotalByStatus: (status) => {
    return get()
      .expenses.filter((exp) => exp.status === status)
      .reduce((sum, exp) => sum + Number(exp.totalAmount), 0);
  },
}));

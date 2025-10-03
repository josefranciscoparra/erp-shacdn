import { create } from "zustand";

export interface CostCenter {
  id: string;
  name: string;
  code?: string;
  address?: string;
  timezone: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  orgId: string;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  orgId: string;
  costCenterId?: string;
  costCenter?: CostCenter;
}

export interface PositionLevel {
  id: string;
  name: string;
  code?: string;
  order: number;
  description?: string;
  minSalary?: number;
  maxSalary?: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  orgId: string;
  _count?: {
    positions: number;
  };
}

export interface Position {
  id: string;
  title: string;
  description?: string;
  levelId?: string;
  level?: PositionLevel;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  orgId: string;
}

export interface CostCenterFormData {
  name: string;
  code?: string;
  address?: string;
  timezone?: string;
}

export interface DepartmentFormData {
  name: string;
  description?: string;
  costCenterId?: string;
}

export interface PositionFormData {
  title: string;
  description?: string;
  levelId?: string;
}

export interface PositionLevelFormData {
  name: string;
  code?: string;
  order?: number;
  description?: string;
  minSalary?: number;
  maxSalary?: number;
}

interface OrganizationState {
  // Cost Centers
  costCenters: CostCenter[];
  selectedCostCenter: CostCenter | null;

  // Departments
  departments: Department[];
  selectedDepartment: Department | null;

  // Positions
  positions: Position[];
  selectedPosition: Position | null;

  // Position Levels
  positionLevels: PositionLevel[];
  selectedPositionLevel: PositionLevel | null;

  // UI State
  isLoading: boolean;
  error: string | null;

  // Cost Center Actions
  setCostCenters: (costCenters: CostCenter[]) => void;
  addCostCenter: (costCenter: CostCenter) => void;
  updateCostCenter: (id: string, costCenter: Partial<CostCenter>) => void;
  deleteCostCenter: (id: string) => void;
  setSelectedCostCenter: (costCenter: CostCenter | null) => void;

  // Department Actions
  setDepartments: (departments: Department[]) => void;
  addDepartment: (department: Department) => void;
  updateDepartment: (id: string, department: Partial<Department>) => void;
  deleteDepartment: (id: string) => void;
  setSelectedDepartment: (department: Department | null) => void;

  // Position Actions
  setPositions: (positions: Position[]) => void;
  addPosition: (position: Position) => void;
  updatePosition: (id: string, position: Partial<Position>) => void;
  deletePosition: (id: string) => void;
  setSelectedPosition: (position: Position | null) => void;

  // Shared Actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Async Actions
  fetchCostCenters: () => Promise<void>;
  createCostCenter: (data: CostCenterFormData) => Promise<void>;
  updateCostCenterById: (id: string, data: Partial<CostCenterFormData>) => Promise<void>;
  deleteCostCenterById: (id: string) => Promise<void>;

  fetchDepartments: () => Promise<void>;
  createDepartment: (data: DepartmentFormData) => Promise<void>;
  updateDepartmentById: (id: string, data: Partial<DepartmentFormData>) => Promise<void>;
  deleteDepartmentById: (id: string) => Promise<void>;

  fetchPositions: () => Promise<void>;
  createPosition: (data: PositionFormData) => Promise<void>;
  updatePositionById: (id: string, data: Partial<PositionFormData>) => Promise<void>;
  deletePositionById: (id: string) => Promise<void>;

  // Position Level Actions
  setPositionLevels: (levels: PositionLevel[]) => void;
  addPositionLevel: (level: PositionLevel) => void;
  updatePositionLevel: (id: string, level: Partial<PositionLevel>) => void;
  deletePositionLevel: (id: string) => void;
  setSelectedPositionLevel: (level: PositionLevel | null) => void;

  fetchPositionLevels: () => Promise<void>;
  createPositionLevel: (data: PositionLevelFormData) => Promise<void>;
  updatePositionLevelById: (id: string, data: Partial<PositionLevelFormData>) => Promise<void>;
  deletePositionLevelById: (id: string) => Promise<void>;
}

export const useOrganizationStore = create<OrganizationState>()((set, get) => ({
  // Initial state
  costCenters: [],
  selectedCostCenter: null,
  departments: [],
  selectedDepartment: null,
  positions: [],
  selectedPosition: null,
  positionLevels: [],
  selectedPositionLevel: null,
  isLoading: false,
  error: null,

  // Cost Center sync actions
  setCostCenters: (costCenters) => set({ costCenters }),
  addCostCenter: (costCenter) =>
    set((state) => ({
      costCenters: [...state.costCenters, costCenter],
    })),
  updateCostCenter: (id, costCenterData) =>
    set((state) => ({
      costCenters: state.costCenters.map((cc) => (cc.id === id ? { ...cc, ...costCenterData } : cc)),
    })),
  deleteCostCenter: (id) =>
    set((state) => ({
      costCenters: state.costCenters.filter((cc) => cc.id !== id),
    })),
  setSelectedCostCenter: (costCenter) => set({ selectedCostCenter: costCenter }),

  // Department sync actions
  setDepartments: (departments) => set({ departments }),
  addDepartment: (department) =>
    set((state) => ({
      departments: [...state.departments, department],
    })),
  updateDepartment: (id, departmentData) =>
    set((state) => ({
      departments: state.departments.map((dept) => (dept.id === id ? { ...dept, ...departmentData } : dept)),
    })),
  deleteDepartment: (id) =>
    set((state) => ({
      departments: state.departments.filter((dept) => dept.id !== id),
    })),
  setSelectedDepartment: (department) => set({ selectedDepartment: department }),

  // Position sync actions
  setPositions: (positions) => set({ positions }),
  addPosition: (position) =>
    set((state) => ({
      positions: [...state.positions, position],
    })),
  updatePosition: (id, positionData) =>
    set((state) => ({
      positions: state.positions.map((pos) => (pos.id === id ? { ...pos, ...positionData } : pos)),
    })),
  deletePosition: (id) =>
    set((state) => ({
      positions: state.positions.filter((pos) => pos.id !== id),
    })),
  setSelectedPosition: (position) => set({ selectedPosition: position }),

  // Shared actions
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Cost Center async actions
  fetchCostCenters: async () => {
    set({ isLoading: true, error: null });
    try {
      // TODO: Implementar API call
      const response = await fetch("/api/cost-centers");
      if (!response.ok) throw new Error("Error al cargar centros de coste");

      const costCenters = await response.json();
      set({ costCenters, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error desconocido",
        isLoading: false,
      });
    }
  },

  createCostCenter: async (data) => {
    set({ isLoading: true, error: null });
    try {
      // TODO: Implementar API call
      const response = await fetch("/api/cost-centers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Error al crear centro de coste");

      const newCostCenter = await response.json();
      get().addCostCenter(newCostCenter);
      set({ isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error desconocido",
        isLoading: false,
      });
    }
  },

  updateCostCenterById: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      // TODO: Implementar API call
      const response = await fetch(`/api/cost-centers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Error al actualizar centro de coste");

      const updatedCostCenter = await response.json();
      get().updateCostCenter(id, updatedCostCenter);
      set({ isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error desconocido",
        isLoading: false,
      });
    }
  },

  deleteCostCenterById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      // TODO: Implementar API call
      const response = await fetch(`/api/cost-centers/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Error al eliminar centro de coste");

      get().deleteCostCenter(id);
      set({ isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error desconocido",
        isLoading: false,
      });
    }
  },

  // Department async actions
  fetchDepartments: async () => {
    set({ isLoading: true, error: null });
    try {
      // TODO: Implementar API call
      const response = await fetch("/api/departments");
      if (!response.ok) throw new Error("Error al cargar departamentos");

      const departments = await response.json();
      set({ departments, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error desconocido",
        isLoading: false,
      });
    }
  },

  createDepartment: async (data) => {
    set({ isLoading: true, error: null });
    try {
      // TODO: Implementar API call
      const response = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Error al crear departamento");

      const newDepartment = await response.json();
      get().addDepartment(newDepartment);
      set({ isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error desconocido",
        isLoading: false,
      });
    }
  },

  updateDepartmentById: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      // TODO: Implementar API call
      const response = await fetch(`/api/departments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Error al actualizar departamento");

      const updatedDepartment = await response.json();
      get().updateDepartment(id, updatedDepartment);
      set({ isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error desconocido",
        isLoading: false,
      });
    }
  },

  deleteDepartmentById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      // TODO: Implementar API call
      const response = await fetch(`/api/departments/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Error al eliminar departamento");

      get().deleteDepartment(id);
      set({ isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error desconocido",
        isLoading: false,
      });
    }
  },

  // Position async actions
  fetchPositions: async () => {
    set({ isLoading: true, error: null });
    try {
      // TODO: Implementar API call
      const response = await fetch("/api/positions");
      if (!response.ok) throw new Error("Error al cargar puestos");

      const positions = await response.json();
      set({ positions, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error desconocido",
        isLoading: false,
      });
    }
  },

  createPosition: async (data) => {
    try {
      const response = await fetch("/api/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al crear puesto");
      }

      const newPosition = await response.json();
      get().addPosition(newPosition);
    } catch (error) {
      console.error("Error al crear puesto:", error);
      throw error;
    }
  },

  updatePositionById: async (id, data) => {
    try {
      const response = await fetch(`/api/positions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al actualizar puesto");
      }

      const updatedPosition = await response.json();
      get().updatePosition(id, updatedPosition);
    } catch (error) {
      console.error("Error al actualizar puesto:", error);
      throw error;
    }
  },

  deletePositionById: async (id) => {
    try {
      const response = await fetch(`/api/positions/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al eliminar puesto");
      }

      get().deletePosition(id);
    } catch (error) {
      console.error("Error al eliminar puesto:", error);
      throw error;
    }
  },

  // Position Level sync actions
  setPositionLevels: (positionLevels) => set({ positionLevels }),
  addPositionLevel: (level) =>
    set((state) => ({
      positionLevels: [...state.positionLevels, level],
    })),
  updatePositionLevel: (id, levelData) =>
    set((state) => ({
      positionLevels: state.positionLevels.map((level) => (level.id === id ? { ...level, ...levelData } : level)),
    })),
  deletePositionLevel: (id) =>
    set((state) => ({
      positionLevels: state.positionLevels.filter((level) => level.id !== id),
    })),
  setSelectedPositionLevel: (level) => set({ selectedPositionLevel: level }),

  // Position Level async actions
  fetchPositionLevels: async () => {
    try {
      const response = await fetch("/api/position-levels");
      if (!response.ok) throw new Error("Error al cargar niveles de puesto");

      const levels = await response.json();
      set({ positionLevels: levels });
    } catch (error) {
      console.error("Error al cargar niveles de puesto:", error);
    }
  },

  createPositionLevel: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch("/api/position-levels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Error al crear nivel de puesto");

      const newLevel = await response.json();
      get().addPositionLevel(newLevel);
      set({ isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error desconocido",
        isLoading: false,
      });
    }
  },

  updatePositionLevelById: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/position-levels/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Error al actualizar nivel de puesto");

      const updatedLevel = await response.json();
      get().updatePositionLevel(id, updatedLevel);
      set({ isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error desconocido",
        isLoading: false,
      });
    }
  },

  deletePositionLevelById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/position-levels/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Error al eliminar nivel de puesto");

      get().deletePositionLevel(id);
      set({ isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error desconocido",
        isLoading: false,
      });
    }
  },
}));

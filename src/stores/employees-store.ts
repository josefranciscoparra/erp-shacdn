import { create } from 'zustand';

export interface Employee {
  id: string;
  employeeNumber?: string;
  firstName: string;
  lastName: string;
  secondLastName?: string;
  nifNie: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  province?: string;
  country: string;
  birthDate?: Date;
  nationality?: string;
  iban?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyRelationship?: string;
  photoUrl?: string;
  notes?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  orgId: string;
  userId?: string;
}

export interface EmployeeFormData {
  employeeNumber?: string;
  firstName: string;
  lastName: string;
  secondLastName?: string;
  nifNie: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  province?: string;
  country?: string;
  birthDate?: string;
  nationality?: string;
  iban?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyRelationship?: string;
  notes?: string;
}

interface EmployeesState {
  employees: Employee[];
  selectedEmployee: Employee | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setEmployees: (employees: Employee[]) => void;
  addEmployee: (employee: Employee) => void;
  updateEmployee: (id: string, employee: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
  setSelectedEmployee: (employee: Employee | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Async actions
  fetchEmployees: () => Promise<void>;
  createEmployee: (data: EmployeeFormData) => Promise<void>;
  updateEmployeeById: (id: string, data: Partial<EmployeeFormData>) => Promise<void>;
  deleteEmployeeById: (id: string) => Promise<void>;
}

export const useEmployeesStore = create<EmployeesState>()((set, get) => ({
  employees: [],
  selectedEmployee: null,
  isLoading: false,
  error: null,

  // Sync actions
  setEmployees: (employees) => set({ employees }),
  
  addEmployee: (employee) => set((state) => ({
    employees: [...state.employees, employee]
  })),
  
  updateEmployee: (id, employeeData) => set((state) => ({
    employees: state.employees.map(emp => 
      emp.id === id ? { ...emp, ...employeeData } : emp
    )
  })),
  
  deleteEmployee: (id) => set((state) => ({
    employees: state.employees.filter(emp => emp.id !== id)
  })),
  
  setSelectedEmployee: (employee) => set({ selectedEmployee: employee }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Async actions
  fetchEmployees: async () => {
    set({ isLoading: true, error: null });
    try {
      // TODO: Implementar API call
      const response = await fetch('/api/employees');
      if (!response.ok) throw new Error('Error al cargar empleados');
      
      const employees = await response.json();
      set({ employees, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Error desconocido',
        isLoading: false 
      });
    }
  },

  createEmployee: async (data) => {
    set({ isLoading: true, error: null });
    try {
      // TODO: Implementar API call
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) throw new Error('Error al crear empleado');
      
      const newEmployee = await response.json();
      get().addEmployee(newEmployee);
      set({ isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Error desconocido',
        isLoading: false 
      });
    }
  },

  updateEmployeeById: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      // TODO: Implementar API call
      const response = await fetch(`/api/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) throw new Error('Error al actualizar empleado');
      
      const updatedEmployee = await response.json();
      get().updateEmployee(id, updatedEmployee);
      set({ isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Error desconocido',
        isLoading: false 
      });
    }
  },

  deleteEmployeeById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      // TODO: Implementar API call
      const response = await fetch(`/api/employees/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Error al eliminar empleado');
      
      get().deleteEmployee(id);
      set({ isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Error desconocido',
        isLoading: false 
      });
    }
  }
}));
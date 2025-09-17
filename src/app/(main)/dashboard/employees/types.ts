export type Employee = {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  status: "Activo" | "Baja" | "Pendiente";
  startDate: string;
};
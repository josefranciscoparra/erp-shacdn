export type Employee = {
  id: string;
  employeeNumber: string | null;
  firstName: string;
  lastName: string;
  secondLastName: string | null;
  email: string | null;
  active: boolean;
  photoUrl?: string | null;
  department?: {
    name: string;
  } | null;
  position?: {
    title: string;
  } | null;
  employmentContracts: {
    contractType: string;
    startDate: Date;
    endDate: Date | null;
    active: boolean;
  }[];
  user?: {
    id?: string;
    email: string;
    role: string;
  } | null;
};

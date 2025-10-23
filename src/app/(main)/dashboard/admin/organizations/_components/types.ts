export interface OrganizationItem {
  id: string;
  name: string;
  vat: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    users: number;
    employees: number;
  };
}

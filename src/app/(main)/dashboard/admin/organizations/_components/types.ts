export interface OrganizationItem {
  id: string;
  name: string;
  vat: string | null;
  active: boolean;
  chatEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    users: number;
    employees: number;
  };
}

import type { HierarchyType } from "@prisma/client";

export interface OrganizationItem {
  id: string;
  name: string;
  vat: string | null;
  active: boolean;
  chatEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  hierarchyType: HierarchyType;
  employeeNumberPrefix: string | null;
  allowedEmailDomains: string[];
  annualPtoDays: number;
  _count?: {
    users: number;
    employees: number;
    departments: number;
    costCenters: number;
    scheduleTemplates: number;
  };
}

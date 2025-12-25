export type OrganizationGroupRow = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  organizationsCount: number;
  membersCount: number;
  createdAt: string;
};

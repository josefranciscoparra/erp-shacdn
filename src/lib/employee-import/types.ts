import type { EmployeeImportVacationMode } from "./constants";

export interface EmployeeImportOptions {
  vacationMode: EmployeeImportVacationMode;
  sendInvites: boolean;
  departmentPolicy: "REQUIRE_EXISTING" | "ALLOW_MISSING_WARNING";
  managerPolicy: "ALLOW_MISSING_WARNING" | "ERROR_IF_MISSING";
}

export interface EmployeeImportRowData {
  firstName: string;
  lastName: string;
  secondLastName?: string;
  nifNie: string;
  email: string;
  phone?: string;
  mobilePhone?: string;
  startDate: string;
  scheduleTemplateId: string;
  departmentId?: string;
  costCenterId?: string;
  managerEmail?: string;
  role?: string;
  contractType?: string;
  weeklyHours?: number;
  notes?: string;
  ptoBalanceDays?: number;
  ptoBalanceMinutes?: number;
  ptoAnnualDays?: number;
  ptoAnnualMinutes?: number;
  ptoUsedDays?: number;
  ptoUsedMinutes?: number;
}

export interface ParsedEmployeeImportRow {
  rowIndex: number;
  data: EmployeeImportRowData;
  raw: Record<string, string | undefined>;
}

export interface RowMessage {
  type: "ERROR" | "WARNING";
  field?: string;
  message: string;
}

export interface RowValidationResult extends ParsedEmployeeImportRow {
  status: "READY" | "ERROR";
  messages: RowMessage[];
}

export const EMPLOYEE_IMPORT_MAX_ROWS = 500;

interface EmployeeImportColumn {
  key: string;
  label: string;
  required?: boolean;
  hint?: string;
}

export const EMPLOYEE_IMPORT_COLUMNS: EmployeeImportColumn[] = [
  { key: "first_name", label: "Nombre", required: true, hint: "Obligatorio" },
  { key: "last_name", label: "Primer apellido", required: true, hint: "Obligatorio" },
  { key: "second_last_name", label: "Segundo apellido" },
  { key: "nif_nie", label: "NIF/NIE", required: true, hint: "Formato español (DNI/NIE)" },
  { key: "email", label: "Email", required: true, hint: "Correo corporativo permitido" },
  { key: "phone", label: "Teléfono" },
  { key: "mobile_phone", label: "Móvil" },
  { key: "start_date", label: "Fecha de inicio", required: true, hint: "YYYY-MM-DD" },
  {
    key: "schedule_template_id",
    label: "Horario (scheduleTemplateId)",
    required: true,
    hint: "ID del horario existente",
  },
  { key: "department_id", label: "Departamento" },
  { key: "cost_center_id", label: "Centro de coste" },
  { key: "manager_email", label: "Email manager", hint: "Opcional, debe existir en la org" },
  { key: "role", label: "Rol de usuario", hint: "EMPLOYEE/ MANAGER / HR_ADMIN / HR_ASSISTANT / ORG_ADMIN" },
  { key: "contract_type", label: "Tipo de contrato", hint: "Ej. INDEFINIDO, TEMPORAL" },
  { key: "weekly_hours", label: "Horas semanales", hint: "Horas pactadas (40, 20...)" },
  { key: "notes", label: "Notas" },
  { key: "pto_balance_days", label: "Saldo PTO (días)", hint: "Modo Saldo: introducir días disponibles" },
  { key: "pto_balance_minutes", label: "Saldo PTO (minutos)", hint: "Modo Saldo: alternativa en minutos" },
  { key: "pto_annual_days", label: "PTO anual (días)", hint: "Modo Anual: total concedido" },
  { key: "pto_annual_minutes", label: "PTO anual (minutos)", hint: "Modo Anual: equivalente en minutos" },
  { key: "pto_used_days", label: "PTO consumidos (días)", hint: "Modo Anual: días ya disfrutados" },
  { key: "pto_used_minutes", label: "PTO consumidos (minutos)", hint: "Modo Anual: minutos ya usados" },
];

export const EMPLOYEE_IMPORT_SAMPLE_ROW = {
  first_name: "Laura",
  last_name: "García",
  second_last_name: "Pérez",
  nif_nie: "12345678Z",
  email: "laura.garcia@empresa.com",
  phone: "+34 600 123 123",
  mobile_phone: "+34 600 456 456",
  start_date: "2025-01-15",
  schedule_template_id: "sched_ABC123",
  department_id: "dept_marketing",
  cost_center_id: "cc_madrid",
  manager_email: "manager@empresa.com",
  role: "EMPLOYEE",
  contract_type: "INDEFINIDO",
  weekly_hours: "40",
  notes: "Equipo onboarding Madrid",
  pto_balance_days: "22",
  pto_balance_minutes: "",
  pto_annual_days: "23",
  pto_annual_minutes: "",
  pto_used_days: "1",
  pto_used_minutes: "",
};

export const EMPLOYEE_IMPORT_HEADER_MAP: Record<string, string> = {
  first_name: "firstName",
  nombre: "firstName",
  last_name: "lastName",
  primer_apellido: "lastName",
  second_last_name: "secondLastName",
  segundo_apellido: "secondLastName",
  nif: "nifNie",
  dni: "nifNie",
  nif_nie: "nifNie",
  national_id: "nifNie",
  email: "email",
  correo: "email",
  phone: "phone",
  telefono: "phone",
  mobile_phone: "mobilePhone",
  movil: "mobilePhone",
  start_date: "startDate",
  fecha_alta: "startDate",
  schedule_id: "scheduleTemplateId",
  schedule_template_id: "scheduleTemplateId",
  department_id: "departmentId",
  departamento_id: "departmentId",
  cost_center_id: "costCenterId",
  centro_id: "costCenterId",
  manager_email: "managerEmail",
  manager: "managerEmail",
  role: "role",
  contract_type: "contractType",
  weekly_hours: "weeklyHours",
  notes: "notes",
  pto_balance_days: "ptoBalanceDays",
  pto_balance_minutes: "ptoBalanceMinutes",
  pto_annual_days: "ptoAnnualDays",
  pto_annual_minutes: "ptoAnnualMinutes",
  pto_used_days: "ptoUsedDays",
  pto_used_minutes: "ptoUsedMinutes",
};

export const EMPLOYEE_IMPORT_ALLOWED_ROLES = ["EMPLOYEE", "MANAGER", "HR_ADMIN", "HR_ASSISTANT", "ORG_ADMIN"] as const;

export const EMPLOYEE_IMPORT_VACATION_MODES = ["BALANCE", "ANNUAL"] as const;

export type EmployeeImportRole = (typeof EMPLOYEE_IMPORT_ALLOWED_ROLES)[number];
export type EmployeeImportVacationMode = (typeof EMPLOYEE_IMPORT_VACATION_MODES)[number];

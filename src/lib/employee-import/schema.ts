import { z } from "zod";

import { EMPLOYEE_IMPORT_VACATION_MODES } from "./constants";

export const employeeImportOptionsSchema = z.object({
  vacationMode: z.enum(EMPLOYEE_IMPORT_VACATION_MODES).default("BALANCE"),
  sendInvites: z.boolean().default(false),
  departmentPolicy: z.enum(["REQUIRE_EXISTING", "ALLOW_MISSING_WARNING"]).default("REQUIRE_EXISTING"),
  managerPolicy: z.enum(["ALLOW_MISSING_WARNING", "ERROR_IF_MISSING"]).default("ALLOW_MISSING_WARNING"),
});

export type EmployeeImportOptionsInput = z.infer<typeof employeeImportOptionsSchema>;

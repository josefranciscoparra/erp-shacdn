import { PersonalSpaceNoEmployeeNotice, PersonalSpaceWrongOrgNotice } from "@/components/hr/personal-space-access";
import { getEmployeeOrgAccessState } from "@/server/actions/shared/get-employee-org-access";

import MyPayslipsClientPage from "./my-payslips-client";

export default async function MyPayslipsPage() {
  const access = await getEmployeeOrgAccessState();

  if (!access.canAccess) {
    if (access.reason === "WRONG_ORG" && access.employeeOrg) {
      return (
        <PersonalSpaceWrongOrgNotice
          employeeOrgId={access.employeeOrg.id}
          employeeOrgName={access.employeeOrg.name}
          viewingOrgName={access.activeOrg?.name ?? "otra empresa"}
        />
      );
    }
    return <PersonalSpaceNoEmployeeNotice userRole={access.userRole ?? undefined} />;
  }

  return <MyPayslipsClientPage />;
}

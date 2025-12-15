import { notFound } from "next/navigation";

import { PersonalSpaceNoEmployeeNotice, PersonalSpaceWrongOrgNotice } from "@/components/hr/personal-space-access";
import { features } from "@/config/features";
import { getEmployeeOrgAccessState } from "@/server/actions/shared/get-employee-org-access";

import { MyDocuments } from "./_components/my-documents";

export default async function DocumentsPage() {
  if (!features.documents) {
    notFound();
  }

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

  return <MyDocuments />;
}

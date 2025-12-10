import { Suspense } from "react";

import { OrganizationIndicator } from "../_components/organization-indicator";

import { ClockIn } from "./_components/clock-in";

export default function ClockPage() {
  return (
    <>
      <Suspense fallback={null}>
        <OrganizationIndicator />
      </Suspense>
      <ClockIn />
    </>
  );
}

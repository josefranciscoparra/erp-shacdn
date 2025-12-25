"use client";

import { useParams } from "next/navigation";

import UsersManagementPage from "@/app/(main)/dashboard/admin/users/page";

export default function GroupUsersPage() {
  const params = useParams<{ groupId?: string }>();
  const rawGroupId = params?.groupId;
  const groupId = Array.isArray(rawGroupId) ? rawGroupId[0] : rawGroupId;

  return <UsersManagementPage groupId={groupId} />;
}

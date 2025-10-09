import { redirect } from "next/navigation";

import { getProfileData } from "@/server/actions/profile";

import { MyProfile } from "./_components/my-profile";

export default async function ProfilePage() {
  const profileData = await getProfileData();

  if (!profileData) {
    redirect("/auth/login");
  }

  return <MyProfile initialData={profileData} />;
}

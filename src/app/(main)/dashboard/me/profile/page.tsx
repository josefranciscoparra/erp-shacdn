import { MyProfile } from "./_components/my-profile";
import { getProfileData } from "@/server/actions/profile";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const profileData = await getProfileData();

  if (!profileData) {
    redirect("/auth/login");
  }

  return <MyProfile initialData={profileData} />;
}

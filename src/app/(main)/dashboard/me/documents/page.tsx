import { notFound } from "next/navigation";
import { features } from "@/config/features";
import { MyDocuments } from "./_components/my-documents";

export default function DocumentsPage() {
  if (!features.documents) {
    notFound();
  }

  return <MyDocuments />;
}

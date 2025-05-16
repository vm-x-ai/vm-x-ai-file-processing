import { fileClassifierApi } from "@/api";
import { redirect } from "next/navigation";

export default async function Page() {
  const projects = await fileClassifierApi.getProjects();
  redirect(`/project/${projects.data[0].id}`);
}

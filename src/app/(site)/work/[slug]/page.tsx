import { redirect } from "next/navigation";
import { projects } from "@/content/projects";

export function generateStaticParams() {
  return projects.map(({ slug }) => ({ slug }));
}

/**
 * Los case studies desaparecen: cada proyecto enlaza directamente a su repo
 * desde el índice de Work. Cualquier URL antigua vuelve a esa sección.
 */
export default function CaseStudyPage(): never {
  redirect("/#work");
}

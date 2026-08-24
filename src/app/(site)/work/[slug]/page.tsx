import { redirect } from "next/navigation";

/**
 * Los case studies desaparecen: cada proyecto enlaza directamente a su repo
 * desde el índice de Work. Cualquier URL antigua vuelve a esa sección.
 */
export default function CaseStudyPage(): never {
  redirect("/#work");
}

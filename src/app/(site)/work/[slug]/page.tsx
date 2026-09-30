import { redirect } from "next/navigation";
import { projects } from "@/content/projects";

export function generateStaticParams() {
  return projects.map(({ slug }) => ({ slug }));
}

/** Old case-study URLs open the same project on the work board. */
export default async function CaseStudyPage({ params }: { params: Promise<{ slug: string }> }): Promise<never> {
  const { slug } = await params;
  redirect(`/work#${encodeURIComponent(slug)}`);
}

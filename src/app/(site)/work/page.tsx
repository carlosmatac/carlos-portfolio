import type { Metadata } from "next";
import WorkBoard from "@/components/work/WorkBoard";

export const metadata: Metadata = {
  title: "My work",
  description: "Data platforms, integrations and side projects by Carlos Mata, laid out on an explorable board.",
};

export default function WorkPage() {
  return <WorkBoard />;
}

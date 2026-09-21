import type { Metadata } from "next";
import MonitorHero from "@/components/monitor/MonitorHero";

export const metadata: Metadata = {
  title: "Carlos Mata — Monitor",
  description: "La portada del portfolio de Carlos Mata dentro de un monitor CRT.",
};

export default function MonitorPage() {
  return <MonitorHero />;
}

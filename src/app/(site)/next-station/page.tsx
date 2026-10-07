import type { Metadata } from "next";
import NextStation from "@/components/next-station/NextStation";

export const metadata: Metadata = {
  title: "Next station",
  description: "St. Louis, Granada, Brno, Munich, Madrid. The journey so far, and the stop that is not on the map yet.",
};

export default function NextStationPage() {
  return <NextStation />;
}

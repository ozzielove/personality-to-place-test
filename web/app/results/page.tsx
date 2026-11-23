import type { Metadata } from "next";
import ResultsView from "@/components/ResultsView";

export const metadata: Metadata = { title: "Your results | Personality-to-Place" };

export default function Page() {
  return <ResultsView />;
}

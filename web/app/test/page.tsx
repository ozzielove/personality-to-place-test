import type { Metadata } from "next";
import TestRunner from "@/components/TestRunner";

export const metadata: Metadata = { title: "Take the test | Personality-to-Place" };

export default function Page() {
  return <TestRunner />;
}

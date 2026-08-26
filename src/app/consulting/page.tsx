import type { Metadata } from "next";
import { ConsultingClient } from "./consulting-client";

export const metadata: Metadata = {
  title: "Consulting. Custom Software, AI & Automation",
  description:
    "Three formats, depending on what you need. A Focused Diagnostic is a fixed-scope look at one workflow, system or automation opportunity, in 2–6 business days. A Delivery Sprint is the hands-on build, in 2–8 weeks. A Technical Partnership keeps development, support or technical leadership going, scoped phase by phase. Small, well-defined projects are welcome.",
  alternates: { canonical: "/consulting" },
};

export default function ConsultingPage() {
  return <ConsultingClient />;
}

import type { Metadata } from "next";
import { ConsultingClient } from "./consulting-client";

export const metadata: Metadata = {
  title: "Consulting. AI-Powered Software Engineering",
  description:
    "Three formats, depending on what you need. A Tech Audit is a fixed-scope architecture review. A Delivery Sprint is the hands-on build. A Fractional CTO engagement means we own the roadmap, architecture governance, and delivery leadership over a longer period.",
  alternates: { canonical: "/consulting" },
};

export default function ConsultingPage() {
  return <ConsultingClient />;
}

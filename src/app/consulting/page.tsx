import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { ConsultingClient } from "./consulting-client";

export const metadata: Metadata = pageMetadata({
  title: "Consulting. Custom Software, AI & Automation",
  description:
    "Three ways to work together: a focused diagnostic, a delivery sprint, or an ongoing technical partnership. Scoped before we build. Small projects stay small.",
  path: "/consulting",
});

export default function ConsultingPage() {
  return <ConsultingClient />;
}

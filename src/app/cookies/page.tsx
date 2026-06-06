import type { Metadata } from "next";
import { CookiesClient } from "./cookies-client";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "How SERSAN uses cookies and similar tracking technologies on its website.",
  alternates: { canonical: "/cookies" },
  robots: { index: false, follow: true },
};

export default function CookiesPage() {
  return <CookiesClient />;
}

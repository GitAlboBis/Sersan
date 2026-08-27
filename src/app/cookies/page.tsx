import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { CookiesClient } from "./cookies-client";

export const metadata: Metadata = pageMetadata({
  title: "Cookie Policy",
  description:
    "How SerSan uses cookies and similar tracking technologies on its website.",
  path: "/cookies",
  index: false,
});

export default function CookiesPage() {
  return <CookiesClient />;
}

import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { TermsClient } from "./terms-client";

export const metadata: Metadata = pageMetadata({
  title: "Terms of Service",
  description:
    "Terms and conditions governing the use of SerSan services and website.",
  path: "/terms",
  index: false,
});

export default function TermsPage() {
  return <TermsClient />;
}

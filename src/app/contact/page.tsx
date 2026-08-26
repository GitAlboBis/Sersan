import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { ContactClient } from "./contact-client";

export const metadata: Metadata = pageMetadata({
  title: "Contact",
  description:
    "Tell us what you're trying to build, automate or fix. Two or three sentences is enough, and a founder reads it and replies within one business day.",
  path: "/contact",
});

export default function ContactPage() {
  return <ContactClient />;
}

import { NOINDEX } from "@/lib/seo";

export const metadata = NOINDEX;

export default function ApiDocsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

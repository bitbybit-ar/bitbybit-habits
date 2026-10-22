import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { NOINDEX } from "@/lib/seo";

export const metadata = NOINDEX;

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return <>{children}</>;
}

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/navbar";

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <>
      <Navbar
        user={{
          user_id: session.user_id,
          display_name: session.display_name,
          role: session.role,
        }}
      />
      {children}
    </>
  );
}

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-screen" style={{ background: "#0c0f1a" }}>
      <Sidebar userName={session.user.name ?? ""} userRole={session.user.role} />
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}

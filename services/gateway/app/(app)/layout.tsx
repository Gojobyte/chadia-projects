import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div style={{ display: "grid", gridTemplateColumns: "var(--sidebar-w) 1fr", minHeight: "100vh" }}>
      <Sidebar userName={session.user.name ?? ""} userRole={session.user.role} />
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Topbar />
        <div style={{ padding: 20, flex: 1 }} className="fade-in">{children}</div>
      </div>
    </div>
  );
}

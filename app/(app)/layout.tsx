import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { NotificationBadge } from "@/components/notification-badge";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div style={{ display: "grid", gridTemplateColumns: "var(--sidebar-w) 1fr", minHeight: "100vh" }}>
      <Sidebar userName={session.user.name ?? ""} userRole={session.user.role} />
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header className="topbar">
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <NotificationBadge />
            <div className="avatar" style={{ background: "var(--primary)" }}>
              {(session.user.name ?? "?").charAt(0)}
            </div>
          </div>
        </header>
        <div className="content fade-in">{children}</div>
      </div>
    </div>
  );
}

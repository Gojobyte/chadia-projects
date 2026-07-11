import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import "./private-design.css";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="app-shell">
      <Sidebar userName={session.user.name ?? ""} userRole={session.user.role} />
      <div className="app-main">
        <Topbar />
        <div className="app-content fade-in">{children}</div>
      </div>
    </div>
  );
}

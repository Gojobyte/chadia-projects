import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { NotificationBadge } from "@/components/notification-badge";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-screen bg-[#f5f7fa]">
      <Sidebar userName={session.user.name ?? ""} userRole={session.user.role} />
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="h-12 bg-white border-b border-[#e2e8f0] px-6 flex items-center justify-end gap-3">
          <NotificationBadge />
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: "#0468b1" }}>
            {(session.user.name ?? "?").charAt(0)}
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { headers } from "next/headers";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const starred = await prisma.projet.findMany({
    where: { starred: true },
    select: { id: true, titre: true, bailleur: { select: { sigle: true } } },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });

  const pathname = (await headers()).get("x-pathname") ?? "";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "var(--sidebar-w) 1fr", minHeight: "100vh" }}>
      <Sidebar userName={session.user.name ?? ""} userRole={session.user.role} starred={starred} />
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Topbar pathname={pathname} />
        <div className="content fade-in">{children}</div>
      </div>
    </div>
  );
}

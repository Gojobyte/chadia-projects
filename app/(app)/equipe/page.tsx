import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

const roleColors: Record<string, string> = {
  DIRECTEUR: "var(--primary)", ADMIN: "var(--info)", FINANCIER: "var(--warning)", MEMBRE: "var(--text-3)",
};
const roleLabels: Record<string, string> = {
  DIRECTEUR: "Directeur", ADMIN: "Administrateur", FINANCIER: "Financier", MEMBRE: "Membre",
};

export default async function EquipePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Equipe</div>
          <div className="page-subtitle">{users.length} membres</div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="t">
            <thead>
              <tr>
                <th>Membre</th>
                <th>Email</th>
                <th>Role</th>
                <th>Membre depuis</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const initials = u.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <tr key={u.id}>
                    <td>
                      <div className="row" style={{ gap: 10 }}>
                        <div className="avatar" style={{ background: roleColors[u.role] ?? "var(--text-3)" }}>{initials}</div>
                        <span style={{ fontWeight: 600, color: "var(--text)" }}>{u.name}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 12.5 }}>{u.email}</td>
                    <td>
                      <span className="pill" style={{ background: `color-mix(in oklch, ${roleColors[u.role] ?? "var(--text-3)"} 12%, transparent)`, color: roleColors[u.role] }}>
                        <span className="dot" style={{ background: roleColors[u.role] }} />
                        {roleLabels[u.role] ?? u.role}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: "var(--text-3)" }}>
                      {new Date(u.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

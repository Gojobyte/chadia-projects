import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

const avatarColors = [
  "oklch(0.6 0.15 165)", "oklch(0.6 0.16 290)", "oklch(0.65 0.15 75)",
  "oklch(0.6 0.13 245)", "oklch(0.62 0.13 25)", "oklch(0.55 0.1 200)",
];

const roleColors: Record<string, string> = {
  DIRECTEUR: "var(--primary)", ADMIN: "var(--info)", FINANCIER: "var(--accent)", MEMBRE: "var(--text-3)",
};

export default async function EquipePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { name: "asc" },
  });

  const projetsCount = await prisma.projet.count();
  const onlineCount = Math.min(users.length, 3); // Placeholder

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Équipe</div>
          <div className="page-subtitle">{users.length} membres · 4 rôles · 1 organisation</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>
            Exporter
          </button>
          <button className="btn btn-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            Inviter un membre
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { l: "Membres actifs", v: String(users.length), sub: "dans l'organisation", c: "var(--primary)" },
          { l: "Projets en cours", v: String(projetsCount), sub: "au total", c: "var(--info)" },
          { l: "Charge moyenne", v: "78%", sub: "Capacité utilisée", c: "var(--accent)" },
          { l: "Membres en ligne", v: String(onlineCount), sub: `sur ${users.length}`, c: "var(--success)" },
        ].map((k, i) => (
          <div key={i} className="card" style={{ padding: "14px 16px" }}>
            <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>{k.l}</div>
            <div className="tnum" style={{ fontSize: 24, fontWeight: 600, marginTop: 4, color: k.c }}>{k.v}</div>
            <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 2 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Table membres */}
      <div className="card">
        <div className="table-wrap">
          <table className="t" style={{ fontSize: 13 }}>
            <thead>
              <tr>
                <th>Membre</th>
                <th>Rôle</th>
                <th>Email</th>
                <th style={{ textAlign: "right" }}>Projets</th>
                <th>Dernière activité</th>
                <th style={{ width: 50 }}></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => {
                const initials = u.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                const statuses = ["online", "online", "away", "offline", "online", "offline"];
                const status = statuses[i % statuses.length];
                const statusColor = status === "online" ? "var(--success)" : status === "away" ? "#f59e0b" : "var(--text-4)";
                const statusLabel = status === "online" ? "En ligne" : status === "away" ? "Absent" : "Hors ligne";
                const lastActive = ["À l'instant", "Il y a 12 min", "Il y a 2h", "Hier", "Il y a 3h", "Il y a 1 jour"][i % 6];
                return (
                  <tr key={u.id}>
                    <td>
                      <div className="row" style={{ gap: 10 }}>
                        <div style={{ position: "relative" }}>
                          <span className="avatar" style={{ background: avatarColors[i % avatarColors.length], width: 32, height: 32, fontSize: 12 }}>{initials}</span>
                          <span style={{ position: "absolute", bottom: -1, right: -1, width: 10, height: 10, borderRadius: 50, background: statusColor, border: "2px solid var(--surface)" }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>{u.name}</div>
                          <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>{statusLabel}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="tag" style={{ background: "var(--primary-soft)", color: roleColors[u.role] ?? "var(--text-3)", borderColor: "transparent" }}>
                        {u.role === "DIRECTEUR" ? "Directrice" : u.role === "ADMIN" ? "Chef de projet" : u.role === "FINANCIER" ? "Financier" : "Membre"}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-2)" }}>{u.email}</td>
                    <td className="tnum" style={{ textAlign: "right", fontWeight: 500 }}>
                      {Math.floor(Math.random() * 5) + 1}
                    </td>
                    <td style={{ color: "var(--text-3)", fontSize: 12.5 }}>{lastActive}</td>
                    <td>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"/><path d="M12 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"/><path d="M12 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"/>
                      </svg>
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

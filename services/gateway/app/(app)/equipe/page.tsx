import { auth } from "@/lib/auth";
import { AuthAPI } from "@/lib/api";
import { redirect } from "next/navigation";

const avatarColors = [
  "oklch(0.6 0.15 165)", "oklch(0.6 0.16 290)", "oklch(0.65 0.15 75)",
  "oklch(0.6 0.13 245)", "oklch(0.62 0.13 25)", "oklch(0.55 0.1 200)",
];

const roleColors: Record<string, string> = {
  DIRECTEUR: "var(--primary)", ADMIN: "var(--info)", FINANCIER: "var(--accent)", MEMBRE: "var(--text-3)",
};

interface User {
  id: string;
  name: string;
  email: string;
  role: "DIRECTEUR" | "ADMIN" | "FINANCIER" | "MEMBRE";
  isActive: boolean;
  createdAt: string;
}

export default async function EquipePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const token = (session as { authServiceToken?: string }).authServiceToken;
  if (!token) redirect("/login");

  let users: User[] = [];
  let errorMsg: string | null = null;
  try {
    const data = await AuthAPI.listUsers(token);
    users = data.users ?? [];
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : "Erreur de chargement";
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Équipe</div>
          <div className="page-subtitle">{users.length} membre{users.length > 1 ? "s" : ""} · service auth</div>
        </div>
      </div>

      {errorMsg && (
        <div className="card" style={{ padding: 16, marginBottom: 16, background: "var(--danger-soft, #fee)", color: "var(--danger)" }}>
          Service auth : {errorMsg}
        </div>
      )}

      {users.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--text-3)" }}>
          {errorMsg ? "Impossible de charger l'équipe." : "Aucun membre."}
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="t" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Membre</th><th>Rôle</th><th>Email</th><th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => {
                  const initials = (u.name || u.email).split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="row" style={{ gap: 10 }}>
                          <span className="avatar" style={{ background: avatarColors[i % avatarColors.length], width: 32, height: 32, fontSize: 12 }}>{initials}</span>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>{u.name}</div>
                        </div>
                      </td>
                      <td>
                        <span className="tag" style={{ background: "var(--primary-soft)", color: roleColors[u.role] ?? "var(--text-3)", borderColor: "transparent" }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-2)" }}>{u.email}</td>
                      <td>
                        <span style={{ fontSize: 11, fontWeight: 600, color: u.isActive ? "var(--success)" : "var(--text-3)" }}>
                          {u.isActive ? "Actif" : "Inactif"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

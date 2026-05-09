import { auth } from "@/lib/auth";
import { AuthAPI } from "@/lib/api";
import { redirect } from "next/navigation";

const ROLE_LABEL: Record<string, string> = {
  DIRECTEUR: "Direction",
  ADMIN: "Administration",
  FINANCIER: "Finance",
  MEMBRE: "Membre",
};

const AVATAR_VARIANTS = ["avatar--terracotta", "avatar--ink", "avatar--info", "avatar--success", "avatar--mineral"] as const;

interface User {
  id: string;
  name: string;
  email: string;
  role: "DIRECTEUR" | "ADMIN" | "FINANCIER" | "MEMBRE";
  isActive: boolean;
  createdAt: string;
}

function initialsOf(name: string, email: string): string {
  const source = name?.trim() ? name : email;
  return source.split(/\s+|@/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function fmtRelative(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
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
          <div className="page-eyebrow">Membres autorisés</div>
          <h1 className="page-title">Équi<em>pe</em></h1>
          <p className="page-subtitle">
            <span className="tabular-nums">{users.length}</span> membre{users.length > 1 ? "s" : ""} dans l&apos;organisation.
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn--secondary">
            <i className="ph ph-export" aria-hidden="true"></i>
            Exporter
          </button>
          <button className="btn btn--primary">
            <i className="ph ph-user-plus" aria-hidden="true"></i>
            Inviter un membre
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="card" style={{ padding: 16, marginBottom: 16, background: "var(--color-danger-soft)", color: "var(--color-danger)", borderColor: "rgba(163,45,45,0.18)" }}>
          Service auth : {errorMsg}
        </div>
      )}

      {users.length === 0 ? (
        <div className="empty">
          <div className="ic"><i className="ph ph-users-three" aria-hidden="true"></i></div>
          <h3 className="t">Aucun <em>membre</em> pour le moment</h3>
          <p className="s">Invitez les premiers membres de votre organisation pour qu&apos;ils accèdent à la plateforme.</p>
        </div>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>Membre</th>
              <th>Rôle</th>
              <th>Email</th>
              <th>Inscription</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div className={`avatar avatar--sm ${AVATAR_VARIANTS[i % AVATAR_VARIANTS.length]}`}>
                      {initialsOf(u.name, u.email)}
                    </div>
                    <div style={{ fontWeight: 600, color: "var(--color-ink)" }}>{u.name || u.email}</div>
                  </div>
                </td>
                <td>
                  <span className="badge badge--outline" style={{ color: "var(--color-shale)" }}>
                    {ROLE_LABEL[u.role] ?? u.role}
                  </span>
                </td>
                <td style={{ color: "var(--color-shale)", fontSize: "var(--text-xs)" }}>{u.email}</td>
                <td style={{ color: "var(--color-stone)", fontSize: "var(--text-xs)" }}>{fmtRelative(u.createdAt)}</td>
                <td>
                  {u.isActive ? (
                    <span className="badge badge--published">
                      <span className="dot"></span>
                      Actif
                    </span>
                  ) : (
                    <span className="badge badge--closed">
                      <span className="dot"></span>
                      Inactif
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

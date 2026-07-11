import { auth } from "@/lib/auth";
import { AuthAPI } from "@/lib/api";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { InviteUserButton } from "./InviteUserButton";
import { UserRowActions } from "./UserRowActions";

// ---------------------------------------------------------------------
// Server Actions — CRUD utilisateurs (admin / directeur)
// ---------------------------------------------------------------------
async function createUserAction(
  formData: FormData,
): Promise<{ ok: boolean; generatedPassword?: string | null; error?: string }> {
  "use server";
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non authentifié" };
  if (session.user.role !== "ADMIN" && session.user.role !== "DIRECTEUR") {
    return { ok: false, error: "Vous n'avez pas le droit de créer un membre" };
  }
  const token = (session as { authServiceToken?: string }).authServiceToken;
  if (!token) return { ok: false, error: "Token de session manquant" };

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const name = String(formData.get("name") || "").trim();
  const role = (String(formData.get("role") || "MEMBRE")) as "ADMIN" | "DIRECTEUR" | "FINANCIER" | "MEMBRE";
  const password = String(formData.get("password") || "").trim() || undefined;
  const fonction = String(formData.get("fonction") || "").trim() || undefined;
  const zone = String(formData.get("zone") || "").trim() || undefined;
  const telephone = String(formData.get("telephone") || "").trim() || undefined;
  const instance = String(formData.get("instance") || "").trim() || undefined;

  if (!email || !name) return { ok: false, error: "Email et nom obligatoires" };

  try {
    const result = await AuthAPI.createUser(token, {
      email, name, role, password, fonction, zone, telephone, instance,
    });
    revalidatePath("/equipe");
    return { ok: true, generatedPassword: result.generatedPassword ?? null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur de création" };
  }
}

async function patchUserAction(
  userId: string,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  "use server";
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non authentifié" };
  if (session.user.role !== "ADMIN" && session.user.role !== "DIRECTEUR") {
    return { ok: false, error: "Vous n'avez pas le droit de modifier un membre" };
  }
  const token = (session as { authServiceToken?: string }).authServiceToken;
  if (!token) return { ok: false, error: "Token de session manquant" };

  const body: Record<string, unknown> = {};
  if (formData.has("role")) body.role = String(formData.get("role"));
  if (formData.has("name")) body.name = String(formData.get("name"));
  if (formData.has("isActive")) body.isActive = formData.get("isActive") === "true";

  try {
    await AuthAPI.patchUser(userId, token, body);
    revalidatePath("/equipe");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur de modification" };
  }
}

async function deleteUserAction(userId: string): Promise<{ ok: boolean; error?: string }> {
  "use server";
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Non authentifié" };
  // Seul le DIRECTEUR peut supprimer (cf. politique auth-service)
  if (session.user.role !== "DIRECTEUR") {
    return { ok: false, error: "Seul le directeur peut supprimer un membre" };
  }
  const token = (session as { authServiceToken?: string }).authServiceToken;
  if (!token) return { ok: false, error: "Token de session manquant" };

  try {
    await AuthAPI.deleteUser(userId, token);
    revalidatePath("/equipe");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur de suppression" };
  }
}

interface DbUser {
  id: string;
  email: string;
  name: string;
  role: "DIRECTEUR" | "ADMIN" | "FINANCIER" | "MEMBRE";
  isActive: boolean;
  fonction?: string | null;
  zone?: string | null;
  telephone?: string | null;
  instance: "CA" | "BUREAU" | "PROGRAMMES" | "VOLONTAIRE" | "EXTERNE";
  bio?: string | null;
  image?: string | null;
  dateEmbauche?: string | null;
  createdAt: string;
}

const INSTANCE_LABEL: Record<string, string> = {
  CA: "Conseil d'administration",
  BUREAU: "Bureau Exécutif",
  PROGRAMMES: "Programmes",
  VOLONTAIRE: "Volontaires & stagiaires",
  EXTERNE: "Externe / Plateforme",
};

const ROLE_LABEL: Record<string, string> = {
  DIRECTEUR: "Admin",
  ADMIN: "Admin",
  FINANCIER: "Finance",
  MEMBRE: "Membre",
};

const ROLE_PERMS_CLASS: Record<string, string> = {
  DIRECTEUR: "admin",
  ADMIN: "coord",
  FINANCIER: "member",
  MEMBRE: "view",
};

function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function avatarTone(seed: string): "ink" | "t1" | "t2" | "t3" | "t4" | "t5" {
  const tones = ["ink", "t1", "t2", "t3", "t4", "t5"] as const;
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return tones[h % tones.length];
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  const dt = new Date(d);
  const now = Date.now();
  const diff = now - dt.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 30) return `il y a ${days} j`;
  return dt.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export default async function EquipePage({
  searchParams,
}: {
  searchParams: Promise<{ instance?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const token = (session as { authServiceToken?: string }).authServiceToken;
  if (!token) redirect("/login");

  const { instance } = await searchParams;
  const params: Record<string, string> = { active: "true" };
  if (instance) params.instance = instance;

  // Pour gérer les membres on inclut les inactifs (sinon impossible de les
  // réactiver depuis l'UI) — sauf si un filtre instance est posé.
  const role = session.user.role as "ADMIN" | "DIRECTEUR" | "FINANCIER" | "MEMBRE";
  const canManage = role === "ADMIN" || role === "DIRECTEUR";
  if (canManage) delete (params as Record<string, string>).active;

  let users: DbUser[] = [];
  let errorMsg: string | null = null;
  try {
    const data = await AuthAPI.listUsers(token, params);
    users = data.users ?? [];
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : "Erreur de chargement";
  }

  const byInstance = {
    CA: users.filter((u) => u.instance === "CA"),
    BUREAU: users.filter((u) => u.instance === "BUREAU"),
    PROGRAMMES: users.filter((u) => u.instance === "PROGRAMMES"),
    VOLONTAIRE: users.filter((u) => u.instance === "VOLONTAIRE"),
  };
  const adminCount = users.filter((u) => u.role === "DIRECTEUR" || u.role === "ADMIN").length;
  const financierCount = users.filter((u) => u.role === "FINANCIER").length;
  const membreCount = users.filter((u) => u.role === "MEMBRE").length;

  return (
    <div className="pg">
      <header className="pg-h">
        <div>
          <div className="pg-eyebrow">Conseil d&apos;administration · Bureau Exécutif · Programmes</div>
          <h1 className="pg-title">L&apos;équipe <em>de CHADIA.</em></h1>
          <p className="pg-sub">
            {users.length} membre{users.length > 1 ? "s" : ""} actif{users.length > 1 ? "s" : ""} dans la plateforme. Composition officielle actée le 15 octobre 2022. Données chargées en temps réel depuis le service auth.
          </p>
        </div>
        <div className="pg-actions">
          <button className="btn btn--ghost btn--sm" disabled aria-disabled="true">
            <i className="ph ph-export" aria-hidden="true"></i> Exporter
          </button>
          <button className="btn btn--secondary btn--sm" disabled aria-disabled="true">
            <i className="ph ph-shield-check" aria-hidden="true"></i> Rôles &amp; permissions
          </button>
          {canManage ? <InviteUserButton createAction={createUserAction} /> : null}
        </div>
      </header>

      {errorMsg && (
        <div className="card" style={{ padding: 16, marginTop: 16, background: "var(--color-danger-soft)", color: "var(--color-danger)", borderColor: "rgba(163,45,45,0.18)" }}>
          Service auth : {errorMsg}
        </div>
      )}

      <div className="tm-stats">
        <div className="st">
          <div className="l">Total</div>
          <div className="v">{users.length}</div>
          <div className="d">Membres actifs</div>
        </div>
        <div className="st">
          <div className="l">Conseil d&apos;administration</div>
          <div className="v">{byInstance.CA.length}</div>
          <div className="d">élu en AG</div>
        </div>
        <div className="st">
          <div className="l">Bureau Exécutif</div>
          <div className="v">{byInstance.BUREAU.length}</div>
          <div className="d">acte du 15 oct. 2022</div>
        </div>
        <div className="st">
          <div className="l">Programmes & terrain</div>
          <div className="v">{byInstance.PROGRAMMES.length + byInstance.VOLONTAIRE.length}</div>
          <div className="d">opérations</div>
        </div>
      </div>

      <div className="tm-layout">
        <div>
          <div className="tm-tabs">
            <a href="/equipe" className={!instance ? "on" : ""}>
              Tous les membres <span className="c">{users.length}</span>
            </a>
            <a href="/equipe?instance=CA" className={instance === "CA" ? "on" : ""}>
              Conseil d&apos;administration <span className="c">{byInstance.CA.length}</span>
            </a>
            <a href="/equipe?instance=BUREAU" className={instance === "BUREAU" ? "on" : ""}>
              Bureau Exécutif <span className="c">{byInstance.BUREAU.length}</span>
            </a>
            <a href="/equipe?instance=PROGRAMMES" className={instance === "PROGRAMMES" ? "on" : ""}>
              Programmes <span className="c">{byInstance.PROGRAMMES.length}</span>
            </a>
          </div>

          {users.length === 0 ? (
            <div className="empty" style={{ marginTop: 32 }}>
              <div className="ic"><i className="ph ph-users-three"></i></div>
              <h3 className="t">Aucun <em>membre</em> trouvé</h3>
              <p className="s">{instance ? "Aucun membre dans cette instance." : "Lance le seed auth pour créer les 7 membres officiels."}</p>
            </div>
          ) : (
            <div className="members">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "30%" }}>Membre</th>
                    <th>Fonction</th>
                    <th>Zone</th>
                    <th>Accès</th>
                    <th>Inscription</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((m) => {
                    const tone = avatarTone(m.id);
                    const initials = initialsOf(m.name);
                    return (
                      <tr key={m.id}>
                        <td>
                          <div className="person">
                            <span className={`av ${tone}`}>{initials}</span>
                            <div className="nm">{m.name}<small>{m.email}</small></div>
                          </div>
                        </td>
                        <td>
                          <div className="role">
                            {m.fonction ?? "—"}
                            {m.bio && <small>{m.bio}</small>}
                          </div>
                        </td>
                        <td>
                          {m.zone ? (
                            <span className="zone-tag"><i className="ph-fill ph-map-pin"></i> {m.zone}</span>
                          ) : "—"}
                        </td>
                        <td>
                          <span className={`perms ${ROLE_PERMS_CLASS[m.role]}`}>{ROLE_LABEL[m.role]}</span>
                        </td>
                        <td><span className="last-seen">{fmtDate(m.createdAt)}</span></td>
                        <td style={{ textAlign: "right" }}>
                          <UserRowActions
                            userId={m.id}
                            userName={m.name}
                            userEmail={m.email}
                            currentRole={m.role}
                            isActive={m.isActive}
                            currentUserRole={role}
                            isSelf={m.id === (session.user as { id?: string }).id}
                            patchAction={patchUserAction}
                            deleteAction={deleteUserAction}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside>
          <div className="rail-card">
            <h4>Organi<em>gramme</em></h4>
            <p className="sub">Structure officielle ONG CHADIA</p>
            <div className="org-tree">
              {byInstance.CA.length > 0 && (
                <>
                  <div className="branch">
                    <span className="avatar avatar--sm avatar--ink">CA</span>
                    <div className="body"><strong>Conseil d&apos;administration</strong><small>{byInstance.CA.length} membres élus</small></div>
                  </div>
                  {byInstance.CA.map((u) => (
                    <div key={u.id} className="branch indent">
                      <span className={`avatar avatar--sm avatar--${avatarTone(u.id) === "ink" ? "terracotta" : "info"}`}>{initialsOf(u.name)}</span>
                      <div className="body"><strong>{u.fonction ?? u.name}</strong><small>{u.name}</small></div>
                    </div>
                  ))}
                </>
              )}
              {byInstance.BUREAU.length > 0 && (
                <>
                  <div className="branch" style={{ marginTop: 12 }}>
                    <span className="avatar avatar--sm avatar--terracotta">BE</span>
                    <div className="body"><strong>Bureau Exécutif</strong><small>{byInstance.BUREAU.length} membres</small></div>
                  </div>
                  {byInstance.BUREAU.map((u) => (
                    <div key={u.id} className="branch indent">
                      <span className={`avatar avatar--sm avatar--success`}>{initialsOf(u.name)}</span>
                      <div className="body"><strong>{u.fonction ?? u.name}</strong><small>{u.name}</small></div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          <div className="rail-card">
            <h4>Permissions <em>en vigueur</em></h4>
            <p className="sub">Modèle 4 rôles</p>
            <div style={{ fontSize: 12, color: "var(--color-sepia)", lineHeight: 1.6 }}>
              {[
                { tone: "admin", label: "Directeur / Admin", count: adminCount },
                { tone: "member", label: "Financier", count: financierCount },
                { tone: "view", label: "Membre", count: membreCount },
              ].map((p, i, arr) => (
                <div
                  key={p.tone}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 0",
                    borderBottom: i === arr.length - 1 ? "none" : "1px solid var(--color-line)",
                  }}
                >
                  <span><span className={`perms ${p.tone}`}>{p.label}</span></span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-stone)" }}>
                    {p.count} personne{p.count > 1 ? "s" : ""}
                  </span>
                </div>
              ))}
            </div>
            <button className="btn btn--ghost btn--sm" style={{ marginTop: 8, width: "100%" }}>
              Modifier la matrice <i className="ph ph-arrow-right"></i>
            </button>
          </div>

          <div className="invite-card">
            <h4>Inviter un membre</h4>
            <p>Envoyez un lien d&apos;invitation par e-mail. Le rôle peut être ajusté plus tard.</p>
            <form className="field-row">
              <input type="email" placeholder="prenom@ong-chadia.com" />
              <button type="submit">Inviter</button>
            </form>
            <small>L&apos;invitation expire après 7 jours.</small>
          </div>
        </aside>
      </div>
    </div>
  );
}

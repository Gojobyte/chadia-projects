import { auth } from "@/lib/auth";
import { NotifAPI } from "@/lib/api";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  titre: string;
  message: string;
  lien?: string | null;
  lu: boolean;
  createdAt: string;
}

const TYPE_ICON: Record<string, string> = {
  "projet.created": "ph-folder-plus",
  "tender.created": "ph-megaphone",
  "tender.published": "ph-broadcast",
  "tender.attributed": "ph-medal",
  "submission.received": "ph-tray-arrow-down",
  "document.uploaded": "ph-upload",
  "deadline.reminder": "ph-clock-countdown",
  default: "ph-bell",
};

const TYPE_LABEL: Record<string, string> = {
  "projet.created": "Projet",
  "tender.created": "Marché",
  "tender.published": "Publication",
  "tender.attributed": "Attribution",
  "submission.received": "Soumission",
  "document.uploaded": "Document",
  "deadline.reminder": "Échéance",
};

function iconFor(type: string): string {
  return TYPE_ICON[type] ?? TYPE_ICON.default;
}

function labelFor(type: string): string {
  return TYPE_LABEL[type] ?? type;
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------
async function markAllReadAction() {
  "use server";
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const token = (session as { authServiceToken?: string } | null)?.authServiceToken;
  if (!userId || !token) redirect("/login");
  await NotifAPI.markAllRead(userId, token);
  revalidatePath("/notifications");
}

async function markReadAction(id: string) {
  "use server";
  const session = await auth();
  const token = (session as { authServiceToken?: string } | null)?.authServiceToken;
  if (!token) redirect("/login");
  await NotifAPI.markRead(id, token);
  revalidatePath("/notifications");
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ lu?: string; type?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = (session.user as { id?: string }).id;
  const token = (session as { authServiceToken?: string }).authServiceToken;
  if (!userId || !token) redirect("/login");

  const { lu, type } = await searchParams;

  let notifs: Notification[] = [];
  let errorMsg: string | null = null;
  try {
    const data = await NotifAPI.listNotifications(userId, token);
    notifs = data.notifications ?? [];
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : "Erreur de chargement";
  }

  // Filtres côté client (lu / type)
  let filtered = notifs;
  if (lu === "false") filtered = filtered.filter((n) => !n.lu);
  if (lu === "true") filtered = filtered.filter((n) => n.lu);
  if (type) filtered = filtered.filter((n) => n.type === type);

  const unread = notifs.filter((n) => !n.lu).length;
  const typesPresents = Array.from(new Set(notifs.map((n) => n.type)));

  return (
    <div className="pg">
      <header className="pg-h">
        <div>
          <div className="pg-eyebrow">
            {notifs.length} notification{notifs.length > 1 ? "s" : ""} · {unread} non lue{unread > 1 ? "s" : ""}
          </div>
          <h1 className="pg-title">Centre de <em>notifications.</em></h1>
          <p className="pg-sub">
            Tous les événements liés à vos projets, appels d&apos;offres, soumissions et documents.
            Les notifications non lues apparaissent surlignées et leur compteur s&apos;affiche dans la cloche.
          </p>
        </div>
        <div className="pg-actions">
          {unread > 0 && (
            <form action={markAllReadAction}>
              <button type="submit" className="btn btn--secondary btn--sm">
                <i className="ph ph-check-circle"></i> Tout marquer comme lu
              </button>
            </form>
          )}
        </div>
      </header>

      {errorMsg && (
        <div className="card" style={{ padding: 16, marginTop: 16, background: "var(--color-danger-soft)", color: "var(--color-danger)", borderColor: "rgba(163,45,45,0.18)" }}>
          Service notification : {errorMsg}
        </div>
      )}

      <div className="pj-bar" style={{ marginTop: 24 }}>
        <Link href="/notifications" className={`pill ${!lu && !type ? "on" : ""}`}>
          Toutes <span className="ct">{notifs.length}</span>
        </Link>
        <Link href="/notifications?lu=false" className={`pill ${lu === "false" ? "on" : ""}`}>
          Non lues <span className="ct">{unread}</span>
        </Link>
        <Link href="/notifications?lu=true" className={`pill ${lu === "true" ? "on" : ""}`}>
          Lues <span className="ct">{notifs.length - unread}</span>
        </Link>
        <span className="sep"></span>
        {typesPresents.slice(0, 6).map((t) => (
          <Link
            key={t}
            href={`/notifications?type=${t}`}
            className={`pill ${type === t ? "on" : ""}`}
          >
            <i className={`ph ${iconFor(t)}`}></i> {labelFor(t)}
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty" style={{ marginTop: 32 }}>
          <div className="ic"><i className="ph ph-bell-slash"></i></div>
          <h3 className="t">Aucune <em>notification</em></h3>
          <p className="s">
            {lu === "false"
              ? "Toutes vos notifications ont été lues."
              : type
                ? "Aucune notification de ce type."
                : "Vous n'avez pas encore reçu de notifications. Elles apparaîtront ici lors de la création de projets, AO, soumissions, etc."}
          </p>
        </div>
      ) : (
        <div style={{ marginTop: 24, display: "grid", gap: 8 }}>
          {filtered.map((n) => {
            const action = markReadAction.bind(null, n.id);
            return (
              <article
                key={n.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "44px 1fr auto",
                  gap: 16,
                  alignItems: "start",
                  padding: 16,
                  background: n.lu ? "var(--color-surface)" : "var(--color-terracotta-soft)",
                  border: "1px solid var(--color-line)",
                  borderRadius: 6,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 6,
                    background: n.lu ? "var(--color-canvas)" : "rgba(255,255,255,0.7)",
                    color: "var(--color-terracotta)",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 20,
                  }}
                >
                  <i className={`ph ${iconFor(n.type)}`}></i>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
                    <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 20, fontWeight: n.lu ? 400 : 500, lineHeight: 1.2 }}>
                      {n.titre}
                    </h3>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        padding: "2px 8px",
                        borderRadius: 3,
                        background: "var(--color-canvas)",
                        color: "var(--color-stone)",
                      }}
                    >
                      {labelFor(n.type)}
                    </span>
                    {!n.lu && (
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-terracotta)", fontWeight: 600 }}>
                        ● NOUVEAU
                      </span>
                    )}
                  </div>
                  <p style={{ margin: "6px 0 0", color: "var(--color-sepia)", fontSize: 14, lineHeight: 1.5 }}>
                    {n.message}
                  </p>
                  <div style={{ marginTop: 10, display: "flex", gap: 12, alignItems: "center", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-stone)" }}>
                    <span><i className="ph ph-clock"></i> {fmtDate(n.createdAt)}</span>
                    {n.lien && (
                      <>
                        <span>·</span>
                        <Link href={n.lien} style={{ color: "var(--color-terracotta)", textDecoration: "underline" }}>
                          <i className="ph ph-arrow-right"></i> Ouvrir
                        </Link>
                      </>
                    )}
                  </div>
                </div>
                {!n.lu && (
                  <form action={action}>
                    <button
                      type="submit"
                      className="btn btn--ghost btn--sm"
                      title="Marquer comme lu"
                    >
                      <i className="ph ph-check"></i>
                    </button>
                  </form>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

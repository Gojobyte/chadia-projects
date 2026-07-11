import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { NotifAPI } from "@/lib/api";

interface Notif {
  id: string;
  titre: string;
  message: string;
  createdAt?: string;
  lu?: boolean;
}

const DATE_FMT = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const TIME_FMT = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

export default async function Dashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const token = (session as { authServiceToken?: string }).authServiceToken;

  let notifications: Notif[] = [];
  if (token) {
    try {
      const data = await NotifAPI.listNotifications(session.user.id, token);
      notifications = data?.notifications ?? [];
    } catch { /* silencieux */ }
  }

  const unread = notifications.filter((n) => !n.lu).length;
  const firstName = session.user.name?.split(" ")[0] ?? "";
  const now = new Date();
  const dateLong = DATE_FMT.format(now);
  const heure = TIME_FMT.format(now);

  return (
    <div className="pg">
      <div className="pg-h">
        <div>
          <div className="pg-eyebrow">{dateLong} · {heure}</div>
          <h1 className="pg-title">Bonjour <em>{firstName}.</em></h1>
          <p className="pg-sub">
            CHADIA Projects se reconfigure autour de la <strong>candidature aux financements bailleurs</strong>.
            Les modules <em>Opportunités</em> et <em>Candidatures</em> arrivent prochainement.
          </p>
        </div>
        <div className="pg-actions">
          <Link href="/notifications" className="btn btn--secondary btn--sm">
            <i className="ph ph-bell" aria-hidden="true"></i> {unread > 0 ? `${unread} notification${unread > 1 ? "s" : ""}` : "Notifications"}
          </Link>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24, padding: 28 }}>
        <h3 style={{ marginTop: 0, fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 400 }}>
          Refonte en <em style={{ fontStyle: "italic", color: "var(--color-terracotta)" }}>cours.</em>
        </h3>
        <p style={{ color: "var(--color-sepia)", fontSize: 14, lineHeight: 1.6, margin: "8px 0 16px" }}>
          L&apos;ancien module &laquo;&nbsp;Appels d&apos;offres&nbsp;&raquo; (achats internes CHADIA) a été retiré.
          Il sera remplacé par&nbsp;:
        </p>
        <ul style={{ margin: 0, paddingLeft: 20, color: "var(--color-sepia)", fontSize: 14, lineHeight: 1.7 }}>
          <li><strong>/opportunites</strong> — veille automatique des appels à propositions des bailleurs internationaux (UE, ONU, BAD, USAID…) ciblant le Tchad.</li>
          <li><strong>/candidatures</strong> — dossiers que CHADIA monte pour répondre à ces opportunités (note conceptuelle, équipe, budget, pièces jointes).</li>
        </ul>
        <div style={{ marginTop: 18, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/projets" className="btn btn--secondary btn--sm">
            <i className="ph ph-folders" aria-hidden="true"></i> Projets
          </Link>
          <Link href="/bibliotheque" className="btn btn--secondary btn--sm">
            <i className="ph ph-files" aria-hidden="true"></i> Bibliothèque
          </Link>
          <Link href="/equipe" className="btn btn--secondary btn--sm">
            <i className="ph ph-users-three" aria-hidden="true"></i> Équipe
          </Link>
        </div>
      </div>
    </div>
  );
}

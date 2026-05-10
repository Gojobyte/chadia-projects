import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

interface Member {
  initials: string;
  tone: "ink" | "t1" | "t2" | "t3" | "t4" | "t5";
  nm: string;
  email: string;
  role: string;
  roleSub: string;
  zone: string;
  perms: "admin" | "coord" | "member" | "view";
  permsLabel: string;
  lastSeen: string;
  online?: boolean;
}

const MEMBERS: Member[] = [
  { initials: "AS", tone: "ink", nm: "Aïssatou Saleh", email: "aissatou.s@ong-chadia.org", role: "Coordinatrice nationale", roleSub: "Membre du conseil", zone: "N'Djaména", perms: "admin", permsLabel: "Admin", lastSeen: "en ligne", online: true },
  { initials: "MM", tone: "t1", nm: "Moussa Mahamat", email: "moussa.m@ong-chadia.org", role: "Coordinateur des programmes", roleSub: "Suivi-évaluation", zone: "N'Djaména", perms: "coord", permsLabel: "Coordinateur", lastSeen: "en ligne", online: true },
  { initials: "FH", tone: "t2", nm: "Fatimé Hassan", email: "fatime.h@ong-chadia.org", role: "Chargée de projet · VBG", roleSub: "Genre & protection", zone: "Bitkine, Guéra", perms: "member", permsLabel: "Membre", lastSeen: "il y a 12 min" },
  { initials: "RD", tone: "t3", nm: "Rachid Djimet", email: "rachid.d@ong-chadia.org", role: "Chargé de projet · Santé", roleSub: "Programme N'Djaména", zone: "N'Djaména", perms: "member", permsLabel: "Membre", lastSeen: "il y a 2 h" },
  { initials: "AB", tone: "t4", nm: "Achta Brahim", email: "achta.b@ong-chadia.org", role: "Chargée de projet · Femmes & AVEC", roleSub: "Microfinance solidaire", zone: "Mongo, Guéra", perms: "member", permsLabel: "Membre", lastSeen: "il y a 1 h" },
  { initials: "DH", tone: "t5", nm: "Djimkoumda Halilou", email: "djim.h@ong-chadia.org", role: "Animateur eau & assainissement", roleSub: "Forages & comités", zone: "Mongo, Guéra", perms: "member", permsLabel: "Membre", lastSeen: "il y a 4 h" },
  { initials: "NK", tone: "t1", nm: "Naïma Kotoko", email: "naima.k@ong-chadia.org", role: "Comptable", roleSub: "Trésorière du conseil", zone: "N'Djaména", perms: "admin", permsLabel: "Admin", lastSeen: "il y a 30 min" },
  { initials: "IB", tone: "t2", nm: "Issa Bichara", email: "issa.b@ong-chadia.org", role: "Chargé du suivi-évaluation", roleSub: "Reporting bailleurs", zone: "N'Djaména", perms: "coord", permsLabel: "Coordinateur", lastSeen: "il y a 6 h" },
  { initials: "MS", tone: "t3", nm: "Maïmouna Saïd", email: "maimouna.s@ong-chadia.org", role: "Assistante administrative", roleSub: "Logistique & achats", zone: "N'Djaména", perms: "member", permsLabel: "Membre", lastSeen: "hier · 17:42" },
  { initials: "YT", tone: "t4", nm: "Youssouf Tahir", email: "youssouf.t@ong-chadia.org", role: "Animateur jeunesse & formation", roleSub: "Programme PRJ-2025-14", zone: "N'Djaména", perms: "member", permsLabel: "Membre", lastSeen: "hier · 16:08" },
  { initials: "HK", tone: "t5", nm: "Hadja Kosso", email: "hadja.k@ong-chadia.org", role: "Sage-femme · projet santé", roleSub: "CDD · 12 mois", zone: "N'Djaména", perms: "member", permsLabel: "Membre", lastSeen: "il y a 3 j" },
  { initials: "KM", tone: "t1", nm: "Khadidja Moussa", email: "kmoussa.vol@ong-chadia.org", role: "Volontaire communication", roleSub: "Service civique · 8 mois", zone: "N'Djaména", perms: "view", permsLabel: "Lecture", lastSeen: "il y a 5 j" },
  { initials: "PD", tone: "t2", nm: "Pierre Delacroix", email: "pierre.d.csi@ong-chadia.org", role: "Volontaire CSI · suivi financier", roleSub: "France Volontaires · 18 mois", zone: "N'Djaména", perms: "view", permsLabel: "Lecture", lastSeen: "il y a 1 j" },
  { initials: "SO", tone: "t3", nm: "Saadia Ouattara", email: "saadia.o.vol@ong-chadia.org", role: "Volontaire animation Mongo", roleSub: "Service civique · 6 mois", zone: "Mongo, Guéra", perms: "view", permsLabel: "Lecture", lastSeen: "hier" },
];

const ORGTREE = [
  { initials: "AS", tone: "ink", title: "Coordination nationale", sub: "Aïssatou Saleh", indent: false, count: undefined as string | undefined },
  { initials: "MM", tone: "terracotta", title: "Programmes", sub: "Moussa Mahamat", indent: true, count: "5 chargés" },
  { initials: "IB", tone: "info", title: "Suivi-évaluation", sub: "Issa Bichara", indent: true, count: "1 + vol." },
  { initials: "NK", tone: "success", title: "Finances", sub: "Naïma Kotoko", indent: true, count: "1 + vol." },
  { initials: "MS", tone: "mineral", title: "Admin & logistique", sub: "Maïmouna Saïd", indent: true, count: undefined },
];

export default async function EquipePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const total = MEMBERS.length;
  const salaries = 9;
  const volontaires = MEMBERS.filter((m) => m.perms === "view").length;
  const terrain = MEMBERS.filter((m) => m.zone.includes("Mongo") || m.zone.includes("Bitkine")).length;
  const adminCount = MEMBERS.filter((m) => m.perms === "admin").length;
  const coordCount = MEMBERS.filter((m) => m.perms === "coord").length;
  const memberCount = MEMBERS.filter((m) => m.perms === "member").length;
  const viewCount = MEMBERS.filter((m) => m.perms === "view").length;

  return (
    <div className="pg">
      <header className="pg-h">
        <div>
          <div className="pg-eyebrow">Salariés · volontaires · animateurs terrain</div>
          <h1 className="pg-title">L&apos;équipe <em>de CHADIA.</em></h1>
          <p className="pg-sub">
            14 personnes au service du développement du Tchad — réparties entre le siège de
            N&apos;Djaména et les antennes terrain de Mongo (Guéra) et de Bitkine. Permissions
            modulables par projet.
          </p>
        </div>
        <div className="pg-actions">
          <button className="btn btn--ghost btn--sm"><i className="ph ph-export"></i> Exporter</button>
          <button className="btn btn--secondary btn--sm"><i className="ph ph-shield-check"></i> Rôles &amp; permissions</button>
          <button className="btn btn--accent btn--sm"><i className="ph ph-user-plus"></i> Inviter un membre</button>
        </div>
      </header>

      <div className="tm-stats">
        <div className="st">
          <div className="l">Total</div>
          <div className="v">{total}</div>
          <div className="d">+2 depuis janvier 2026</div>
        </div>
        <div className="st">
          <div className="l">Salariés</div>
          <div className="v">{salaries}</div>
          <div className="d">8 CDI · 1 CDD projet VBG</div>
        </div>
        <div className="st">
          <div className="l">Volontaires</div>
          <div className="v">{volontaires}</div>
          <div className="d">Service civique &amp; CSI</div>
        </div>
        <div className="st">
          <div className="l">Sur le terrain</div>
          <div className="v">{terrain}</div>
          <div className="d">Antennes Mongo &amp; Bitkine</div>
        </div>
      </div>

      <div className="tm-layout">
        <div>
          <div className="tm-tabs">
            <button className="on">Tous les membres <span className="c">{total}</span></button>
            <button>Siège N&apos;Djaména <span className="c">{MEMBERS.filter((m) => m.zone === "N'Djaména").length}</span></button>
            <button>Antenne Mongo <span className="c">{MEMBERS.filter((m) => m.zone.includes("Mongo")).length}</span></button>
            <button>Antenne Bitkine <span className="c">{MEMBERS.filter((m) => m.zone.includes("Bitkine")).length}</span></button>
            <button style={{ marginLeft: "auto" }}><i className="ph ph-funnel"></i> Filtres</button>
          </div>

          <div className="members">
            <table>
              <thead>
                <tr>
                  <th style={{ width: "30%" }}>Membre</th>
                  <th>Fonction</th>
                  <th>Zone</th>
                  <th>Accès</th>
                  <th>Activité</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {MEMBERS.map((m) => (
                  <tr key={m.email}>
                    <td>
                      <div className="person">
                        <span className={`av ${m.tone}`}>{m.initials}</span>
                        <div className="nm">{m.nm}<small>{m.email}</small></div>
                      </div>
                    </td>
                    <td><div className="role">{m.role}<small>{m.roleSub}</small></div></td>
                    <td><span className="zone-tag"><i className="ph-fill ph-map-pin"></i> {m.zone}</span></td>
                    <td><span className={`perms ${m.perms}`}>{m.permsLabel}</span></td>
                    <td><span className={`last-seen ${m.online ? "online" : ""}`}>{m.lastSeen}</span></td>
                    <td style={{ textAlign: "right" }}>
                      <button style={{ background: "transparent", border: "none", color: "var(--color-stone)", cursor: "pointer", padding: 4, fontSize: 16 }}>
                        <i className="ph ph-dots-three"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside>
          <div className="rail-card">
            <h4>Organi<em>gramme</em></h4>
            <p className="sub">Structure opérationnelle</p>
            <div className="org-tree">
              {ORGTREE.map((b) => (
                <div key={b.title} className={`branch ${b.indent ? "indent" : ""}`}>
                  <span className={`avatar avatar--sm avatar--${b.tone}`}>{b.initials}</span>
                  <div className="body"><strong>{b.title}</strong><small>{b.sub}</small></div>
                  {b.count && <span className="ct">{b.count}</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="rail-card">
            <h4>Permissions <em>en vigueur</em></h4>
            <p className="sub">Modèle simplifié sur 4 rôles</p>
            <div style={{ fontSize: 12, color: "var(--color-sepia)", lineHeight: 1.6 }}>
              {[
                { tone: "admin", label: "Admin", count: adminCount },
                { tone: "coord", label: "Coordinateur", count: coordCount },
                { tone: "member", label: "Membre", count: memberCount },
                { tone: "view", label: "Lecture", count: viewCount },
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
              <input type="email" placeholder="prenom@ong-chadia.org" />
              <button type="submit">Inviter</button>
            </form>
            <small>L&apos;invitation expire après 7 jours.</small>
          </div>
        </aside>
      </div>
    </div>
  );
}

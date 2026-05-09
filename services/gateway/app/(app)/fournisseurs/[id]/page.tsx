import { auth } from "@/lib/auth";
import { TenderAPI } from "@/lib/api";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";

const STATUT_BADGE: Record<string, string> = {
  EN_ATTENTE: "badge--scheduled",
  VERIFIE: "badge--published",
  REJETE: "badge--canceled",
  SUSPENDU: "badge--closed",
  BLACKLISTE: "badge--canceled",
};
const STATUT_LABEL: Record<string, string> = {
  EN_ATTENTE: "En attente", VERIFIE: "Vérifié", REJETE: "Rejeté",
  SUSPENDU: "Suspendu", BLACKLISTE: "Blacklisté",
};
const CATEGORIE_LABEL: Record<string, string> = {
  ENTREPRISE_INDIVIDUELLE: "Entreprise individuelle",
  SARL: "SARL", SA: "SA",
  ONG_NATIONALE: "ONG nationale",
  ONG_INTERNATIONALE: "ONG internationale",
  COOPERATIVE: "Coopérative",
  CONSORTIUM: "Consortium",
  AUTRE: "Autre",
};

interface Fournisseur {
  id: string;
  raisonSociale: string;
  sigle?: string | null;
  email: string;
  telephone?: string | null;
  adresse?: string | null;
  ville?: string | null;
  pays?: string | null;
  siteWeb?: string | null;
  representantNom?: string | null;
  representantTitre?: string | null;
  numeroRccm?: string | null;
  numeroNif?: string | null;
  domainesExpertise?: string[];
  certifications?: string[];
  anneesExperience?: number | null;
  effectif?: number | null;
  categorie: string;
  statut: string;
  verifieAt?: string | null;
  createdAt: string;
  _count?: { soumissions: number; evaluations: number; documents: number };
}

function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

async function verifyAction(id: string) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");
  const token = (session as { authServiceToken?: string }).authServiceToken;
  if (!token) redirect("/login");
  await TenderAPI.verifyFournisseur(id, token);
  revalidatePath(`/fournisseurs/${id}`);
  revalidatePath("/fournisseurs");
}

export default async function FournisseurDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const token = (session as { authServiceToken?: string }).authServiceToken;
  const { id } = await params;

  let f: Fournisseur | null = null;
  let errorMsg: string | null = null;
  try {
    const data = await TenderAPI.getFournisseur(id, token);
    f = data.fournisseur ?? null;
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : "Erreur de chargement";
  }

  if (errorMsg || !f) {
    return (
      <div className="empty">
        <div className="ic"><i className="ph ph-warning-octagon" aria-hidden="true"></i></div>
        <h3 className="t">Fournisseur <em>introuvable</em></h3>
        <p className="s">{errorMsg ?? "Cet identifiant ne correspond à aucun fournisseur."}</p>
        <Link href="/fournisseurs" className="btn btn--secondary">Retour</Link>
      </div>
    );
  }

  const canVerify =
    (session.user.role === "ADMIN" || session.user.role === "DIRECTEUR") &&
    f.statut === "EN_ATTENTE";
  const verify = verifyAction.bind(null, f.id);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, marginBottom: 32, paddingBottom: 24, borderBottom: "1px solid var(--color-line)" }}>
        <div style={{ display: "flex", gap: 20, alignItems: "center", minWidth: 0, flex: 1 }}>
          <div className="avatar avatar--xl avatar--mineral" aria-hidden="true">
            {initialsOf(f.sigle || f.raisonSociale)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="page-eyebrow">Fournisseur</div>
            <h1 className="page-title" style={{ marginTop: 4 }}>{f.raisonSociale}</h1>
            <div style={{ display: "flex", gap: 12, marginTop: 12, fontSize: "var(--text-sm)", color: "var(--color-shale)", flexWrap: "wrap" }}>
              {f.sigle && <span className="mono" style={{ fontSize: "var(--text-xs)", color: "var(--color-stone)" }}>{f.sigle}</span>}
              {f.sigle && <span style={{ color: "var(--color-mineral)" }}>·</span>}
              <span>{CATEGORIE_LABEL[f.categorie] ?? f.categorie}</span>
              {f.ville && (<><span style={{ color: "var(--color-mineral)" }}>·</span><span>{f.ville}{f.pays ? `, ${f.pays}` : ""}</span></>)}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
          <span className={`badge badge--lg ${STATUT_BADGE[f.statut] ?? "badge--draft"}`}>
            <span className="dot"></span>
            {STATUT_LABEL[f.statut] ?? f.statut}
          </span>
          {canVerify && (
            <form action={verify}>
              <button type="submit" className="btn btn--accent">
                <i className="ph ph-seal-check" aria-hidden="true"></i>
                Vérifier
              </button>
            </form>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
        <div className="kpi-card">
          <div className="lbl">Soumissions déposées</div>
          <div className="val tabular-nums">{f._count?.soumissions ?? 0}</div>
        </div>
        <div className="kpi-card">
          <div className="lbl">Évaluations reçues</div>
          <div className="val tabular-nums">{f._count?.evaluations ?? 0}</div>
        </div>
        <div className="kpi-card">
          <div className="lbl">Documents joints</div>
          <div className="val tabular-nums">{f._count?.documents ?? 0}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24 }}>
        <section style={{ display: "grid", gap: 24 }}>
          <div className="card" style={{ padding: 24 }}>
            <div className="eyebrow" style={{ color: "var(--color-ink)", marginBottom: 16 }}>Activité</div>
            {f.domainesExpertise && f.domainesExpertise.length > 0 ? (
              <div style={{ marginBottom: 16 }}>
                <div className="eyebrow" style={{ marginBottom: 8 }}>Domaines d&apos;expertise</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {f.domainesExpertise.map((d) => (
                    <span key={d} className="badge badge--outline" style={{ color: "var(--color-shale)" }}>{d}</span>
                  ))}
                </div>
              </div>
            ) : null}

            {f.certifications && f.certifications.length > 0 ? (
              <div style={{ marginBottom: 16 }}>
                <div className="eyebrow" style={{ marginBottom: 8 }}>Certifications</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {f.certifications.map((c) => (
                    <span key={c} className="badge badge--awarded">
                      <i className="ph ph-medal" aria-hidden="true" style={{ fontSize: 11 }}></i>
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <div className="eyebrow" style={{ marginBottom: 4 }}>Années d&apos;expérience</div>
                <div className="tabular-nums" style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", color: "var(--color-ink)" }}>
                  {f.anneesExperience ?? "—"}
                </div>
              </div>
              <div>
                <div className="eyebrow" style={{ marginBottom: 4 }}>Effectif</div>
                <div className="tabular-nums" style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", color: "var(--color-ink)" }}>
                  {f.effectif ?? "—"}
                </div>
              </div>
            </div>

            {(!f.domainesExpertise || f.domainesExpertise.length === 0) &&
              (!f.certifications || f.certifications.length === 0) &&
              !f.anneesExperience && !f.effectif && (
                <div style={{ fontSize: "var(--text-sm)", color: "var(--color-stone)", textAlign: "center", padding: 16 }}>
                  Aucune information d&apos;activité renseignée.
                </div>
              )}
          </div>

          <div className="card" style={{ padding: 24 }}>
            <div className="eyebrow" style={{ color: "var(--color-ink)", marginBottom: 16 }}>Représentant légal</div>
            {f.representantNom ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="avatar avatar--md avatar--terracotta">
                  {initialsOf(f.representantNom)}
                </div>
                <div>
                  <div style={{ fontSize: "var(--text-md)", fontWeight: 600, color: "var(--color-ink)" }}>{f.representantNom}</div>
                  <div style={{ fontSize: "var(--text-sm)", color: "var(--color-shale)" }}>{f.representantTitre ?? "—"}</div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: "var(--text-sm)", color: "var(--color-stone)" }}>Non renseigné.</div>
            )}
          </div>
        </section>

        <aside className="sheet" style={{ width: "100%", borderRadius: "var(--radius-md)" }}>
          <div className="sheet-h">
            <h4>Coordonnées</h4>
          </div>
          <div className="sheet-b">
            <dl style={{ margin: 0 }}>
              <div className="sheet-row">
                <dt>Email</dt>
                <dd className="mono" style={{ fontSize: "var(--text-xs)", overflow: "hidden", textOverflow: "ellipsis" }}>{f.email}</dd>
              </div>
              {f.telephone && (
                <div className="sheet-row">
                  <dt>Téléphone</dt>
                  <dd className="tabular-nums">{f.telephone}</dd>
                </div>
              )}
              {f.siteWeb && (
                <div className="sheet-row">
                  <dt>Site web</dt>
                  <dd>
                    <a href={f.siteWeb} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-terracotta)", borderBottom: "1px solid currentColor", paddingBottom: 1 }}>
                      {f.siteWeb.replace(/^https?:\/\//, "")}
                    </a>
                  </dd>
                </div>
              )}
              {f.adresse && (
                <div className="sheet-row">
                  <dt>Adresse</dt>
                  <dd>{f.adresse}</dd>
                </div>
              )}
              {f.numeroRccm && (
                <div className="sheet-row">
                  <dt>RCCM</dt>
                  <dd className="mono" style={{ fontSize: "var(--text-xs)" }}>{f.numeroRccm}</dd>
                </div>
              )}
              {f.numeroNif && (
                <div className="sheet-row">
                  <dt>NIF</dt>
                  <dd className="mono" style={{ fontSize: "var(--text-xs)" }}>{f.numeroNif}</dd>
                </div>
              )}
              <div className="sheet-row">
                <dt>Inscrit le</dt>
                <dd style={{ fontSize: "var(--text-xs)", color: "var(--color-shale)" }}>{fmtDate(f.createdAt)}</dd>
              </div>
              {f.verifieAt && (
                <div className="sheet-row">
                  <dt>Vérifié le</dt>
                  <dd style={{ fontSize: "var(--text-xs)", color: "var(--color-success)" }}>{fmtDate(f.verifieAt)}</dd>
                </div>
              )}
            </dl>
          </div>
        </aside>
      </div>
    </>
  );
}

import { TenderAPI } from "@/lib/api";
import Link from "next/link";

interface AppelOffreResultat {
  id: string;
  fournisseurRetenuNom?: string | null;
  montantAttribue?: number | null;
  devise?: string | null;
  nombreSoumissions: number;
  publieAt?: string | null;
  appelOffre: {
    reference: string;
    titre: string;
    type: string;
    categorie: string;
    secteur?: string | null;
    budgetEstime?: number | null;
    devise?: string | null;
    datePublication?: string | null;
    bailleur: { nom: string; sigle: string };
  };
}

function fmtMoney(n: number | null | undefined, cur = "FCFA"): string {
  if (n == null) return "—";
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n)} ${cur}`;
}
function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export default async function ResultatsPage({
  searchParams,
}: {
  searchParams: Promise<{ bailleurId?: string; secteur?: string }>;
}) {
  const { bailleurId, secteur } = await searchParams;
  const params: Record<string, string> = {};
  if (bailleurId) params.bailleurId = bailleurId;
  if (secteur) params.secteur = secteur;

  let resultats: AppelOffreResultat[] = [];
  let errorMsg: string | null = null;
  try {
    const data = await TenderAPI.listResultats(params);
    resultats = data.resultats ?? [];
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : "Erreur de chargement";
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-page)" }}>
      <header style={{ borderBottom: "1px solid var(--color-line-strong)", padding: "32px 48px", background: "var(--color-canvas)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
            <span className="brand-mark" aria-hidden="true">C</span>
            <div>
              <div className="brand-name">CHADIA</div>
              <div className="brand-org">Projects</div>
            </div>
          </Link>
          <Link href="/login" className="btn btn--secondary btn--sm">Espace privé</Link>
        </div>
      </header>

      <section style={{ padding: "80px 48px 48px", borderBottom: "1px solid var(--color-line)" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <div className="page-eyebrow" style={{ marginBottom: 24 }}>Transparence publique</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(40px, 6vw, 72px)", lineHeight: 0.95, letterSpacing: "var(--tracking-tight)", fontWeight: 400, margin: "0 0 24px", color: "var(--color-ink)", maxWidth: "16ch" }}>
            Résultats des marchés <em style={{ color: "var(--color-terracotta)", fontStyle: "italic" }}>publics</em>
          </h1>
          <p style={{ fontSize: "var(--text-md)", lineHeight: "var(--leading-relax)", color: "var(--color-sepia)", maxWidth: "60ch", margin: 0 }}>
            Conformément aux principes de transparence des marchés publics, retrouvez ici la liste des appels d&apos;offres attribués par CHADIA et ses partenaires bailleurs.
          </p>
        </div>
      </section>

      <section style={{ padding: "48px 48px 96px" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid var(--color-line)" }}>
            <div>
              <span className="eyebrow">Registre</span>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", marginTop: 4 }}>
                <span className="tabular-nums">{resultats.length}</span> résultat{resultats.length > 1 ? "s" : ""} publié{resultats.length > 1 ? "s" : ""}
              </div>
            </div>
            <form method="get" style={{ display: "flex", gap: 8 }}>
              <input
                name="secteur"
                type="text"
                defaultValue={secteur ?? ""}
                placeholder="Secteur…"
                className="input"
                style={{ width: 200 }}
              />
              <button type="submit" className="btn btn--secondary btn--sm">Filtrer</button>
            </form>
          </div>

          {errorMsg && (
            <div className="card" style={{ padding: 16, marginBottom: 16, background: "var(--color-danger-soft)", color: "var(--color-danger)", borderColor: "rgba(163,45,45,0.18)" }}>
              {errorMsg}
            </div>
          )}

          {resultats.length === 0 ? (
            <div className="empty">
              <div className="ic"><i className="ph ph-medal" aria-hidden="true"></i></div>
              <h3 className="t">Aucun <em>résultat</em> publié</h3>
              <p className="s">Les résultats des marchés attribués apparaîtront ici dès leur publication officielle.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 0 }}>
              {resultats.map((r, i) => (
                <article key={r.id} style={{ padding: "32px 0", borderBottom: i === resultats.length - 1 ? "none" : "1px solid var(--color-line)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, gap: 16 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="card-meta" style={{ marginBottom: 6 }}>{r.appelOffre.reference}</div>
                      <h2 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-2xl)", fontWeight: 400, lineHeight: "var(--leading-snug)", letterSpacing: "var(--tracking-tight)", margin: "0 0 8px", color: "var(--color-ink)" }}>
                        {r.appelOffre.titre}
                      </h2>
                      <div style={{ display: "flex", gap: 10, fontSize: "var(--text-sm)", color: "var(--color-shale)", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 600 }}>{r.appelOffre.bailleur?.sigle}</span>
                        <span style={{ color: "var(--color-mineral)" }}>·</span>
                        <span>{r.appelOffre.categorie}</span>
                        {r.appelOffre.secteur && <><span style={{ color: "var(--color-mineral)" }}>·</span><span>{r.appelOffre.secteur}</span></>}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div className="eyebrow">Publié le</div>
                      <div style={{ fontSize: "var(--text-sm)", color: "var(--color-sepia)", marginTop: 4 }}>{fmtDate(r.publieAt)}</div>
                    </div>
                  </div>

                  <dl style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, padding: "16px 20px", background: "var(--color-canvas)", borderRadius: "var(--radius-md)", margin: 0 }}>
                    <div>
                      <dt className="eyebrow" style={{ marginBottom: 6 }}>Fournisseur retenu</dt>
                      <dd style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-md)", color: "var(--color-success)", margin: 0 }}>
                        {r.fournisseurRetenuNom ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="eyebrow" style={{ marginBottom: 6 }}>Montant attribué</dt>
                      <dd style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-md)", color: "var(--color-ink)", margin: 0 }} className="tabular-nums">
                        {fmtMoney(r.montantAttribue, r.devise ?? "FCFA")}
                      </dd>
                    </div>
                    <div>
                      <dt className="eyebrow" style={{ marginBottom: 6 }}>Soumissions</dt>
                      <dd style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-md)", color: "var(--color-ink)", margin: 0 }} className="tabular-nums">
                        {r.nombreSoumissions}
                      </dd>
                    </div>
                    <div>
                      <dt className="eyebrow" style={{ marginBottom: 6 }}>Budget initial</dt>
                      <dd style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-md)", color: "var(--color-ink)", margin: 0 }} className="tabular-nums">
                        {fmtMoney(r.appelOffre.budgetEstime, r.appelOffre.devise ?? "FCFA")}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          )}

          <div style={{ marginTop: 64, paddingTop: 24, borderTop: "1px solid var(--color-line)", textAlign: "center", fontSize: "var(--text-xs)", color: "var(--color-stone)" }}>
            Plateforme institutionnelle CHADIA. Données mises à jour quotidiennement.
          </div>
        </div>
      </section>
    </div>
  );
}

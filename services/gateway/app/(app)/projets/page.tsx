import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ProjetsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Cycle complet</div>
          <h1 className="page-title">Pro<em>jets</em></h1>
          <p className="page-subtitle">
            Un projet regroupe plusieurs appels d&apos;offres autour d&apos;un objectif global, d&apos;un bailleur et d&apos;une période. Cette section sera disponible prochainement.
          </p>
        </div>
      </div>

      <div className="empty">
        <div className="ic"><i className="ph ph-folder" aria-hidden="true"></i></div>
        <h3 className="t">Module <em>projets</em> en préparation</h3>
        <p className="s">
          Ce module permettra de regrouper les appels d&apos;offres par projet ONG (financement, équipe, jalons, budget consolidé). Pour l&apos;instant, créez vos appels d&apos;offres directement depuis le menu correspondant.
        </p>
        <Link href="/appels-offres" className="btn btn--secondary">
          <i className="ph ph-arrow-right" aria-hidden="true"></i>
          Voir les appels d&apos;offres
        </Link>
      </div>
    </>
  );
}

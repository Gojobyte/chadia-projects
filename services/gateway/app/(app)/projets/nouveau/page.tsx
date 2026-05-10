import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function NouveauProjetPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Création</div>
          <h1 className="page-title">Nouveau <em>projet</em></h1>
          <p className="page-subtitle">Module en préparation.</p>
        </div>
      </div>
      <div className="empty">
        <div className="ic"><i className="ph ph-folder-plus" aria-hidden="true"></i></div>
        <h3 className="t">Bientôt <em>disponible</em></h3>
        <p className="s">La création de projet ONG sera proposée dans une prochaine version. Vous pouvez déjà créer un appel d&apos;offre individuel.</p>
        <Link href="/appels-offres/nouveau" className="btn btn--primary">
          <i className="ph ph-plus" aria-hidden="true"></i>
          Nouvel appel d&apos;offre
        </Link>
      </div>
    </>
  );
}

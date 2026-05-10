import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function TemplatesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Bibliothèque</div>
          <h1 className="page-title">Tem<em>plates</em></h1>
          <p className="page-subtitle">Modèles de documents réutilisables (TDR, contrats, grilles d&apos;évaluation).</p>
        </div>
      </div>

      <div className="empty">
        <div className="ic"><i className="ph ph-files" aria-hidden="true"></i></div>
        <h3 className="t">Bibliothèque <em>vide</em></h3>
        <p className="s">Aucun template n&apos;a encore été ajouté. La gestion des templates sera disponible dans une prochaine version.</p>
      </div>
    </>
  );
}

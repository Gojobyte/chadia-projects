import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ProjetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  await params;

  return (
    <div className="empty">
      <div className="ic"><i className="ph ph-folder" aria-hidden="true"></i></div>
      <h3 className="t">Fiche projet <em>indisponible</em></h3>
      <p className="s">Le module projets est en cours de migration. Revenez bientôt.</p>
      <Link href="/projets" className="btn btn--secondary">Retour</Link>
    </div>
  );
}

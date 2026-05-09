import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function BudgetPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  await params;

  return (
    <div className="empty">
      <div className="ic"><i className="ph ph-coins" aria-hidden="true"></i></div>
      <h3 className="t">Budget <em>indisponible</em></h3>
      <p className="s">Le suivi budgétaire détaillé sera réintégré avec le module projets.</p>
      <Link href="/projets" className="btn btn--secondary">Retour</Link>
    </div>
  );
}

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DocPage({
  params,
}: {
  params: Promise<{ id: string; docId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  await params;

  return (
    <div className="empty">
      <div className="ic"><i className="ph ph-file-text" aria-hidden="true"></i></div>
      <h3 className="t">Éditeur <em>en migration</em></h3>
      <p className="s">L&apos;éditeur de documents collaboratif sera réintégré avec le module projets.</p>
      <Link href="/projets" className="btn btn--secondary">Retour</Link>
    </div>
  );
}

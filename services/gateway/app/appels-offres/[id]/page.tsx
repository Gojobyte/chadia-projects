import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AppelOffreDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Appel d'offre {id}</div>
          <div className="page-subtitle">En cours de migration vers le service tender</div>
        </div>
      </div>
      <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--text-3)" }}>
        Cette page sera recâblée vers <code>TenderAPI.getAppelOffre()</code> (HTTP).
      </div>
    </>
  );
}

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AppelsOffresPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Appels d'offres</div>
          <div className="page-subtitle">En cours de migration vers le service tender</div>
        </div>
      </div>
      <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--text-3)" }}>
        Cette page sera recâblée vers <code>TenderAPI.listAppelsOffres()</code> (HTTP).
      </div>
    </>
  );
}

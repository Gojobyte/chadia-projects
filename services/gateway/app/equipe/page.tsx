import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function EquipePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Équipe</div>
          <div className="page-subtitle">En cours de migration vers le service auth</div>
        </div>
      </div>
      <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--text-3)" }}>
        Cette page sera recâblée vers <code>AuthAPI</code> (HTTP).
      </div>
    </>
  );
}

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Dashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [projetsEnCours, deadlinesProches, mesTaches, activiteRecente] = await Promise.all([
    prisma.projet.findMany({
      where: { statut: { in: ["EN_COURS", "BROUILLON", "EN_REVISION"] } },
      include: {
        bailleur: { select: { sigle: true } },
        documents: { select: { statut: true } },
      },
      orderBy: { dateLimite: "asc" },
      take: 10,
    }),
    prisma.projet.findMany({
      where: { dateLimite: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }, statut: { notIn: ["SOUMIS", "ACCEPTE", "REJETE", "ARCHIVE"] } },
      include: { bailleur: { select: { sigle: true } } },
      orderBy: { dateLimite: "asc" },
      take: 5,
    }),
    prisma.tache.findMany({
      where: { assigneAId: session.user.id, statut: { not: "TERMINE" } },
      include: { projet: { select: { titre: true } } },
      orderBy: { dateLimite: "asc" },
      take: 10,
    }),
    prisma.activite.findMany({
      include: { user: { select: { name: true } }, projet: { select: { titre: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm">Bienvenue, {session.user.name}</p>
        </div>
        <Link href="/projets/nouveau" className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors">
          Nouveau projet
        </Link>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-slate-500">Projets en cours</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{projetsEnCours.length}</p>
        </div>
        <div className={`bg-white rounded-xl shadow-sm p-6 ${deadlinesProches.length > 0 ? "ring-2 ring-red-500" : ""}`}>
          <p className="text-sm text-slate-500">Deadlines &lt; 7 jours</p>
          <p className={`text-3xl font-bold mt-1 ${deadlinesProches.length > 0 ? "text-red-600" : "text-slate-900"}`}>{deadlinesProches.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-slate-500">Mes taches</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{mesTaches.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm text-slate-500">Activite recente</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{activiteRecente.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Projets en cours */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Projets en cours</h2>
          {projetsEnCours.length === 0 ? (
            <p className="text-slate-400 text-sm">Aucun projet en cours.</p>
          ) : (
            <div className="space-y-3">
              {projetsEnCours.map((p) => {
                const total = p.documents.length;
                const valides = p.documents.filter((d) => d.statut === "VALIDE").length;
                const pct = total > 0 ? Math.round((valides / total) * 100) : 0;
                return (
                  <Link key={p.id} href={`/projets/${p.id}`} className="block p-3 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-900">{p.titre}</span>
                      <span className="text-xs text-slate-400">{p.bailleur.sigle}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-indigo-600 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-slate-400">{pct}% complete</span>
                      <span className="text-xs text-slate-400">Deadline: {new Date(p.dateLimite).toLocaleDateString("fr-FR")}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Mes taches */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Mes taches</h2>
          {mesTaches.length === 0 ? (
            <p className="text-slate-400 text-sm">Aucune tache en attente.</p>
          ) : (
            <div className="space-y-2">
              {mesTaches.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{t.titre}</p>
                    <p className="text-xs text-slate-400">{t.projet.titre}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    t.priorite === "HAUTE" ? "bg-red-100 text-red-800" :
                    t.priorite === "MOYENNE" ? "bg-yellow-100 text-yellow-800" : "bg-slate-100 text-slate-600"
                  }`}>{t.priorite}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activite recente */}
        <div className="bg-white rounded-xl shadow-sm p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Activite recente</h2>
          {activiteRecente.length === 0 ? (
            <p className="text-slate-400 text-sm">Aucune activite.</p>
          ) : (
            <div className="space-y-2">
              {activiteRecente.map((a) => (
                <div key={a.id} className="flex items-center gap-3 text-sm">
                  <span className="text-xs text-slate-400 w-32 flex-shrink-0">{new Date(a.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                  <span className="font-medium text-slate-700">{a.user.name}</span>
                  <span className="text-slate-500">{a.description}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

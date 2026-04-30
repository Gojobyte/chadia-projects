import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon apres-midi";
  return "Bonsoir";
}

function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

const statutLabels: Record<string, string> = {
  BROUILLON: "Brouillon", EN_COURS: "En cours", EN_REVISION: "Revision", SOUMIS: "Soumis",
};
const statutBadge: Record<string, string> = {
  BROUILLON: "badge-neutral", EN_COURS: "badge-blue", EN_REVISION: "badge-warning", SOUMIS: "badge-success",
};

export default async function Dashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [projetsEnCours, deadlinesProches, mesTaches, activiteRecente, totalProjets] = await Promise.all([
    prisma.projet.findMany({
      where: { statut: { in: ["EN_COURS", "BROUILLON", "EN_REVISION"] } },
      include: { bailleur: { select: { sigle: true } }, documents: { select: { statut: true } } },
      orderBy: { dateLimite: "asc" }, take: 8,
    }),
    prisma.projet.findMany({
      where: { dateLimite: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }, statut: { notIn: ["SOUMIS", "ACCEPTE", "REJETE", "ARCHIVE"] } },
      include: { bailleur: { select: { sigle: true } } },
      orderBy: { dateLimite: "asc" }, take: 5,
    }),
    prisma.tache.findMany({
      where: { assigneAId: session.user.id, statut: { not: "TERMINE" } },
      include: { projet: { select: { titre: true } } },
      orderBy: { dateLimite: "asc" }, take: 8,
    }),
    prisma.activite.findMany({
      include: { user: { select: { name: true } }, projet: { select: { titre: true } } },
      orderBy: { createdAt: "desc" }, take: 10,
    }),
    prisma.projet.count(),
  ]);

  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div>
      {/* Header */}
      <div className="flex items-end justify-between mb-6 animate-in delay-1">
        <div>
          <p className="text-[12px] text-[#94a3b8] mb-0.5 capitalize">{today}</p>
          <h1 className="text-[22px] font-bold text-[#1a365d]">{getGreeting()}, {session.user.name}</h1>
        </div>
        <Link href="/projets/nouveau"
          className="px-4 py-2 rounded text-[13px] font-semibold text-white transition-colors hover:opacity-90"
          style={{ background: "#0468b1" }}>
          + Nouveau projet
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card stat-blue p-4 animate-in delay-1">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-medium text-[#64748b]">Projets actifs</p>
            <svg className="w-5 h-5 text-[#0468b1]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>
          </div>
          <p className="text-[28px] font-bold text-[#1a365d] mt-1">{projetsEnCours.length}</p>
          <p className="text-[11px] text-[#94a3b8]">sur {totalProjets} au total</p>
        </div>
        <div className={`card ${deadlinesProches.length > 0 ? "stat-red" : "stat-amber"} p-4 animate-in delay-2`}>
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-medium text-[#64748b]">Deadlines proches</p>
            <svg className="w-5 h-5 text-[#dc2626]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <p className={`text-[28px] font-bold mt-1 ${deadlinesProches.length > 0 ? "text-[#dc2626]" : "text-[#1a365d]"}`}>{deadlinesProches.length}</p>
          <p className="text-[11px] text-[#94a3b8]">dans les 7 prochains jours</p>
        </div>
        <div className="card stat-green p-4 animate-in delay-3">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-medium text-[#64748b]">Mes taches</p>
            <svg className="w-5 h-5 text-[#059669]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <p className="text-[28px] font-bold text-[#1a365d] mt-1">{mesTaches.length}</p>
          <p className="text-[11px] text-[#94a3b8]">en attente</p>
        </div>
        <div className="card stat-amber p-4 animate-in delay-4">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-medium text-[#64748b]">Activites</p>
            <svg className="w-5 h-5 text-[#d97706]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
          </div>
          <p className="text-[28px] font-bold text-[#1a365d] mt-1">{activiteRecente.length}</p>
          <p className="text-[11px] text-[#94a3b8]">cette semaine</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* Projects table */}
        <div className="col-span-8 card p-0 overflow-hidden animate-in delay-5">
          <div className="px-5 py-3 border-b border-[#e2e8f0] flex items-center justify-between">
            <h2 className="text-[13px] font-bold text-[#1a365d] uppercase tracking-wider">Projets en cours</h2>
            <Link href="/projets" className="text-[12px] text-[#0468b1] hover:underline font-medium">Voir tout →</Link>
          </div>
          {projetsEnCours.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-[#94a3b8] text-sm">Aucun projet en cours</p>
              <Link href="/projets/nouveau" className="text-[#0468b1] text-xs hover:underline mt-1 inline-block">Creer un projet</Link>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-[#f8fafc]">
                  <th className="text-left px-5 py-2 text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Projet</th>
                  <th className="text-left px-3 py-2 text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Bailleur</th>
                  <th className="text-left px-3 py-2 text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Statut</th>
                  <th className="text-left px-3 py-2 text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Progression</th>
                  <th className="text-right px-5 py-2 text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Deadline</th>
                </tr>
              </thead>
              <tbody>
                {projetsEnCours.map((p) => {
                  const total = p.documents.length;
                  const valides = p.documents.filter((d) => d.statut === "VALIDE").length;
                  const pct = total > 0 ? Math.round((valides / total) * 100) : 0;
                  const days = daysUntil(p.dateLimite);
                  const deadlineColor = days <= 3 ? "text-[#dc2626] font-bold" : days <= 7 ? "text-[#d97706]" : "text-[#64748b]";

                  return (
                    <tr key={p.id} className="border-t border-[#f1f5f9] hover:bg-[#f8fafc] transition-colors">
                      <td className="px-5 py-3">
                        <Link href={`/projets/${p.id}`} className="text-[13px] font-medium text-[#1e293b] hover:text-[#0468b1]">{p.titre}</Link>
                      </td>
                      <td className="px-3 py-3">
                        <span className="badge badge-blue">{p.bailleur.sigle}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`badge ${statutBadge[p.statut] ?? "badge-neutral"}`}>{statutLabels[p.statut] ?? p.statut}</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-[#e2e8f0] rounded-full h-1.5">
                            <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: pct === 100 ? "#059669" : "#0468b1" }} />
                          </div>
                          <span className="text-[11px] text-[#64748b] font-medium w-8">{pct}%</span>
                        </div>
                      </td>
                      <td className={`px-5 py-3 text-right text-[12px] ${deadlineColor}`}>
                        {days <= 0 ? "Expire !" : days === 1 ? "Demain" : `${days} jours`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Deadlines */}
        <div className="col-span-4 card p-0 overflow-hidden animate-in delay-6">
          <div className="px-5 py-3 border-b border-[#e2e8f0]">
            <h2 className="text-[13px] font-bold text-[#1a365d] uppercase tracking-wider">Echeances proches</h2>
          </div>
          {deadlinesProches.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-xl mb-1">✓</p>
              <p className="text-[#94a3b8] text-[12px]">Aucune echeance urgente</p>
            </div>
          ) : (
            <div className="divide-y divide-[#f1f5f9]">
              {deadlinesProches.map((p) => {
                const days = daysUntil(p.dateLimite);
                const dotColor = days <= 1 ? "bg-[#dc2626]" : days <= 3 ? "bg-[#d97706]" : "bg-[#0468b1]";
                return (
                  <Link key={p.id} href={`/projets/${p.id}`} className="flex items-start gap-3 px-5 py-3 hover:bg-[#f8fafc] transition-colors">
                    <div className={`w-2 h-2 rounded-full ${dotColor} mt-1.5 flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-[#1e293b] truncate">{p.titre}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-[#94a3b8]">{p.bailleur.sigle}</span>
                        <span className={`text-[10px] font-bold ${days <= 1 ? "text-[#dc2626]" : days <= 3 ? "text-[#d97706]" : "text-[#64748b]"}`}>
                          {days <= 0 ? "EXPIRE" : days === 1 ? "Demain" : `${days}j restants`}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Tasks */}
        <div className="col-span-5 card p-0 overflow-hidden animate-in delay-5">
          <div className="px-5 py-3 border-b border-[#e2e8f0]">
            <h2 className="text-[13px] font-bold text-[#1a365d] uppercase tracking-wider">Mes taches</h2>
          </div>
          {mesTaches.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-[#94a3b8] text-[12px]">Aucune tache en attente</p>
            </div>
          ) : (
            <div className="divide-y divide-[#f1f5f9]">
              {mesTaches.map((t) => {
                const prioClass = t.priorite === "HAUTE" ? "badge-danger" : t.priorite === "MOYENNE" ? "badge-warning" : "badge-neutral";
                return (
                  <div key={t.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-[#f8fafc] transition-colors">
                    <input type="checkbox" disabled className="w-3.5 h-3.5 rounded border-[#cbd5e1] text-[#0468b1] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-[#1e293b] truncate">{t.titre}</p>
                      <p className="text-[10px] text-[#94a3b8] truncate">{t.projet.titre}</p>
                    </div>
                    <span className={`badge ${prioClass}`}>{t.priorite === "HAUTE" ? "Urgent" : t.priorite === "MOYENNE" ? "Normal" : "Faible"}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Activity */}
        <div className="col-span-7 card p-0 overflow-hidden animate-in delay-6">
          <div className="px-5 py-3 border-b border-[#e2e8f0]">
            <h2 className="text-[13px] font-bold text-[#1a365d] uppercase tracking-wider">Journal d&apos;activite</h2>
          </div>
          {activiteRecente.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-[#94a3b8] text-[12px]">Aucune activite recente</p>
            </div>
          ) : (
            <div className="divide-y divide-[#f1f5f9]">
              {activiteRecente.map((a) => {
                const initial = a.user.name?.charAt(0) ?? "?";
                return (
                  <div key={a.id} className="flex items-start gap-3 px-5 py-2.5">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5"
                      style={{ background: "#0468b1" }}>
                      {initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-[#1e293b]">
                        <span className="font-semibold">{a.user.name}</span>{" "}
                        <span className="text-[#64748b]">{a.description}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-[#94a3b8]">
                          {new Date(a.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {a.projet && <span className="text-[10px] text-[#0468b1]">· {a.projet.titre}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

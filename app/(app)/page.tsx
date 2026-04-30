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

export default async function Dashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [projetsEnCours, deadlinesProches, mesTaches, activiteRecente, totalProjets] = await Promise.all([
    prisma.projet.findMany({
      where: { statut: { in: ["EN_COURS", "BROUILLON", "EN_REVISION"] } },
      include: { bailleur: { select: { sigle: true } }, documents: { select: { statut: true } } },
      orderBy: { dateLimite: "asc" }, take: 6,
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
      orderBy: { createdAt: "desc" }, take: 8,
    }),
    prisma.projet.count(),
  ]);

  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="min-h-screen" style={{ background: "#0c0f1a" }}>
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl mx-1 mb-8 animate-in delay-1"
        style={{ background: "linear-gradient(135deg, #141829 0%, #1a1040 50%, #1e1145 100%)" }}>
        <div className="absolute inset-0 opacity-30"
          style={{ background: "radial-gradient(ellipse at 70% 20%, rgba(129,140,248,0.15), transparent 60%), radial-gradient(ellipse at 30% 80%, rgba(245,158,11,0.1), transparent 50%)" }} />
        <div className="relative px-8 py-8 flex items-center justify-between">
          <div>
            <p className="text-white/30 text-xs font-medium tracking-widest uppercase mb-1">{today}</p>
            <h1 className="text-2xl font-semibold text-white/90">
              {getGreeting()}, <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg, #818cf8, #f59e0b)" }}>{session.user.name}</span>
            </h1>
            <p className="text-white/30 text-sm mt-1">Votre espace de pilotage de projets</p>
          </div>
          <Link href="/projets/nouveau"
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 4px 20px rgba(99,102,241,0.3)" }}>
            + Nouveau projet
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Projets actifs" value={projetsEnCours.length} total={totalProjets} icon="📊" variant="amber" delay="delay-2" />
        <StatCard label="Deadlines proches" value={deadlinesProches.length} icon="⏰" variant={deadlinesProches.length > 0 ? "rose" : "default"} delay="delay-3" />
        <StatCard label="Mes taches" value={mesTaches.length} icon="✅" variant="indigo" delay="delay-4" />
        <StatCard label="Activites recentes" value={activiteRecente.length} icon="📈" variant="emerald" delay="delay-5" />
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* Projects — 8 cols */}
        <div className="col-span-8 glass rounded-2xl p-6 animate-in delay-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(to bottom, #818cf8, #6366f1)" }} />
              <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Projets en cours</h2>
            </div>
            <Link href="/projets" className="text-xs text-white/30 hover:text-indigo-400 transition-colors">Voir tout →</Link>
          </div>

          {projetsEnCours.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white/20 text-sm">Aucun projet en cours</p>
              <Link href="/projets/nouveau" className="text-indigo-400 text-xs hover:underline mt-2 inline-block">Creer un projet</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {projetsEnCours.map((p) => {
                const total = p.documents.length;
                const valides = p.documents.filter((d) => d.statut === "VALIDE").length;
                const pct = total > 0 ? Math.round((valides / total) * 100) : 0;
                const days = daysUntil(p.dateLimite);
                const urgency = days <= 3 ? "text-red-400" : days <= 7 ? "text-amber-400" : "text-white/30";

                return (
                  <Link key={p.id} href={`/projets/${p.id}`}
                    className="group p-4 rounded-xl border border-white/[0.04] hover:border-white/[0.1] bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-white/80 truncate group-hover:text-white transition-colors">{p.titre}</p>
                        <p className="text-[10px] text-white/20 mt-0.5 font-mono">{p.bailleur.sigle}</p>
                      </div>
                      <ProgressRing pct={pct} size={36} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-full bg-white/[0.06] rounded-full h-1 flex-1" style={{ minWidth: "60px" }}>
                          <div className="h-1 rounded-full transition-all" style={{ width: `${pct}%`, background: pct === 100 ? "#34d399" : "linear-gradient(90deg, #6366f1, #818cf8)" }} />
                        </div>
                        <span className="text-[10px] text-white/30 font-mono">{pct}%</span>
                      </div>
                      <span className={`text-[10px] font-medium ${urgency}`}>
                        {days <= 0 ? "Expire !" : `${days}j`}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Deadlines — 4 cols */}
        <div className="col-span-4 glass rounded-2xl p-6 animate-in delay-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(to bottom, #f87171, #ef4444)" }} />
            <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Deadlines</h2>
          </div>

          {deadlinesProches.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-2xl mb-2">🎉</p>
              <p className="text-white/20 text-xs">Aucune deadline urgente</p>
            </div>
          ) : (
            <div className="space-y-2">
              {deadlinesProches.map((p) => {
                const days = daysUntil(p.dateLimite);
                const bg = days <= 1 ? "bg-red-500/10 border-red-500/20" : days <= 3 ? "bg-amber-500/10 border-amber-500/20" : "bg-white/[0.02] border-white/[0.04]";
                const textColor = days <= 1 ? "text-red-400" : days <= 3 ? "text-amber-400" : "text-white/50";
                return (
                  <Link key={p.id} href={`/projets/${p.id}`}
                    className={`block p-3 rounded-xl border ${bg} hover:bg-white/[0.04] transition-all`}>
                    <p className="text-xs font-medium text-white/70 truncate">{p.titre}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10px] text-white/20 font-mono">{p.bailleur.sigle}</span>
                      <span className={`text-[11px] font-bold ${textColor}`}>
                        {days <= 0 ? "EXPIRE" : days === 1 ? "Demain" : `${days} jours`}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Tasks — 5 cols */}
        <div className="col-span-5 glass rounded-2xl p-6 animate-in delay-5">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(to bottom, #f59e0b, #d97706)" }} />
            <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Mes taches</h2>
          </div>

          {mesTaches.length === 0 ? (
            <p className="text-white/20 text-xs text-center py-8">Aucune tache assignee</p>
          ) : (
            <div className="space-y-1.5">
              {mesTaches.map((t) => {
                const prioColors: Record<string, string> = {
                  HAUTE: "bg-red-500/20 text-red-400 border-red-500/30",
                  MOYENNE: "bg-amber-500/20 text-amber-400 border-amber-500/30",
                  BASSE: "bg-white/[0.06] text-white/40 border-white/[0.08]",
                };
                return (
                  <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.03] transition-all group">
                    <div className="w-4 h-4 rounded border border-white/10 group-hover:border-indigo-400/50 transition-colors flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white/60 group-hover:text-white/80 truncate transition-colors">{t.titre}</p>
                      <p className="text-[10px] text-white/20 truncate">{t.projet.titre}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${prioColors[t.priorite] ?? prioColors.BASSE}`}>
                      {t.priorite}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Activity — 7 cols */}
        <div className="col-span-7 glass rounded-2xl p-6 animate-in delay-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(to bottom, #34d399, #059669)" }} />
            <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Activite recente</h2>
          </div>

          {activiteRecente.length === 0 ? (
            <p className="text-white/20 text-xs text-center py-8">Aucune activite</p>
          ) : (
            <div className="space-y-0">
              {activiteRecente.map((a, i) => {
                const initial = a.user.name?.charAt(0) ?? "?";
                const colors = ["bg-indigo-500", "bg-amber-500", "bg-emerald-500", "bg-violet-500", "bg-rose-500"];
                const color = colors[i % colors.length];
                return (
                  <div key={a.id} className="relative flex items-start gap-3 py-2.5 timeline-dot">
                    <div className={`w-[30px] h-[30px] rounded-full ${color} flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0`}>
                      {initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/50">
                        <span className="text-white/70 font-medium">{a.user.name}</span>{" "}
                        <span className="text-white/30">{a.description}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-white/15 font-mono">
                          {new Date(a.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {a.projet && <span className="text-[10px] text-indigo-400/40">· {a.projet.titre}</span>}
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

/* Stat card component */
function StatCard({ label, value, total, icon, variant, delay }: {
  label: string; value: number; total?: number; icon: string;
  variant: "amber" | "indigo" | "emerald" | "rose" | "default"; delay: string;
}) {
  const glowClass = variant === "amber" ? "glow-amber" : variant === "indigo" ? "glow-indigo" : variant === "emerald" ? "glow-emerald" : variant === "rose" ? "glow-rose" : "";
  const valueColor = variant === "rose" && value > 0 ? "text-red-400" : variant === "amber" ? "text-amber-400" : variant === "indigo" ? "text-indigo-400" : variant === "emerald" ? "text-emerald-400" : "text-white/80";

  return (
    <div className={`glass rounded-2xl p-5 ${glowClass} animate-in ${delay}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-lg">{icon}</span>
        {total !== undefined && (
          <span className="text-[10px] text-white/20 font-mono">/{total} total</span>
        )}
      </div>
      <p className={`text-3xl font-bold ${valueColor}`} style={{ fontFeatureSettings: "'tnum'" }}>{value}</p>
      <p className="text-[11px] text-white/25 mt-1 font-medium">{label}</p>
    </div>
  );
}

/* Circular progress indicator */
function ProgressRing({ pct, size }: { pct: number; size: number }) {
  const r = (size - 4) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct === 100 ? "#34d399" : pct >= 50 ? "#818cf8" : "#f59e0b";

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg className="progress-ring" width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={3} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={3}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white/50">{pct}</span>
    </div>
  );
}

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { notFound } from "@/lib/utils/api-response";

// GET /api/projets/:id/export — Exporter un recap du projet en HTML (imprimable en PDF)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireRole("MEMBRE");
  if (result.error) return result.error;
  const { id } = await params;

  const projet = await prisma.projet.findUnique({
    where: { id },
    include: {
      bailleur: true,
      documents: { orderBy: { ordre: "asc" }, include: { assigneA: { select: { name: true } } } },
      taches: { include: { assigneA: { select: { name: true } } } },
      membres: { include: { user: { select: { name: true, email: true } } } },
      createdBy: { select: { name: true } },
    },
  });

  if (!projet) return notFound("Projet");

  const totalDocs = projet.documents.length;
  const valides = projet.documents.filter(d => d.statut === "VALIDE").length;
  const pct = totalDocs > 0 ? Math.round((valides / totalDocs) * 100) : 0;

  const statutLabels: Record<string, string> = {
    A_FAIRE: "A faire", EN_COURS: "En cours", EN_REVISION: "En revision", VALIDE: "Valide",
    BROUILLON: "Brouillon", SOUMIS: "Soumis", ACCEPTE: "Accepte", REJETE: "Rejete",
  };

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${projet.titre} — Fiche Projet</title>
  <style>
    body { font-family: 'Source Sans 3', Arial, sans-serif; color: #1e293b; margin: 40px; line-height: 1.6; }
    h1 { color: #0468b1; font-size: 24px; border-bottom: 2px solid #0468b1; padding-bottom: 8px; }
    h2 { color: #1a365d; font-size: 16px; margin-top: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th, td { border: 1px solid #e2e8f0; padding: 6px 10px; text-align: left; font-size: 13px; }
    th { background: #f1f5f9; font-weight: 600; color: #1a365d; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .badge-blue { background: #e8f4fc; color: #0468b1; }
    .badge-green { background: #ecfdf5; color: #059669; }
    .badge-red { background: #fef2f2; color: #dc2626; }
    .badge-grey { background: #f1f5f9; color: #64748b; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 12px 0; }
    .info-item { font-size: 13px; }
    .info-label { font-weight: 600; color: #64748b; }
    .progress-bar { width: 100%; height: 8px; background: #e2e8f0; border-radius: 4px; margin: 4px 0; }
    .progress-fill { height: 8px; background: #0468b1; border-radius: 4px; }
    .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11px; color: #94a3b8; text-align: center; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <h1>${projet.titre}</h1>

  <div class="info-grid">
    <div class="info-item"><span class="info-label">Bailleur :</span> ${projet.bailleur.nom} (${projet.bailleur.sigle})</div>
    <div class="info-item"><span class="info-label">Reference :</span> ${projet.reference ?? "—"}</div>
    <div class="info-item"><span class="info-label">Budget :</span> ${projet.budget ? projet.budget.toLocaleString() + " " + projet.devise : "—"}</div>
    <div class="info-item"><span class="info-label">Date limite :</span> ${new Date(projet.dateLimite).toLocaleDateString("fr-FR")}</div>
    <div class="info-item"><span class="info-label">Statut :</span> <span class="badge badge-blue">${statutLabels[projet.statut] ?? projet.statut}</span></div>
    <div class="info-item"><span class="info-label">Cree par :</span> ${projet.createdBy.name}</div>
  </div>

  <p>${projet.description}</p>

  <h2>Progression globale : ${pct}%</h2>
  <div class="progress-bar"><div class="progress-fill" style="width: ${pct}%"></div></div>
  <p style="font-size: 12px; color: #64748b;">${valides} documents valides sur ${totalDocs}</p>

  <h2>Documents (${totalDocs})</h2>
  <table>
    <tr><th>Document</th><th>Statut</th><th>Assigne a</th><th>Google Doc</th></tr>
    ${projet.documents.map(d => `
      <tr>
        <td>${d.titre}</td>
        <td><span class="badge ${d.statut === "VALIDE" ? "badge-green" : d.statut === "EN_COURS" ? "badge-blue" : "badge-grey"}">${statutLabels[d.statut] ?? d.statut}</span></td>
        <td>${d.assigneA?.name ?? "—"}</td>
        <td>${d.fichierUrl ? '<a href="' + d.fichierUrl + '">Ouvrir</a>' : "—"}</td>
      </tr>
    `).join("")}
  </table>

  <h2>Equipe (${projet.membres.length})</h2>
  <table>
    <tr><th>Nom</th><th>Email</th><th>Role</th></tr>
    ${projet.membres.map(m => `
      <tr><td>${m.user.name}</td><td>${m.user.email}</td><td>${m.role}</td></tr>
    `).join("")}
  </table>

  <h2>Taches (${projet.taches.length})</h2>
  <table>
    <tr><th>Tache</th><th>Statut</th><th>Priorite</th><th>Assigne a</th></tr>
    ${projet.taches.map(t => `
      <tr>
        <td>${t.titre}</td>
        <td>${statutLabels[t.statut] ?? t.statut}</td>
        <td>${t.priorite}</td>
        <td>${t.assigneA?.name ?? "—"}</td>
      </tr>
    `).join("")}
  </table>

  <div class="footer">
    CHADIA Projects — Fiche projet generee le ${new Date().toLocaleDateString("fr-FR")} — ONG CHADIA
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="projet-${projet.titre.replace(/[^a-zA-Z0-9]/g, "-")}.html"`,
    },
  });
}

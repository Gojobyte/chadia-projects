import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

const TENDER_URL = process.env.TENDER_SERVICE_URL || "http://localhost:3002";

/**
 * GET /api/documents/:id/file
 *
 * Streame un document binaire (PDF, DOCX, XLSX…) depuis le service tender
 * en préservant les headers `Content-Type` et `Content-Disposition: inline`
 * pour que le navigateur affiche le PDF dans sa visionneuse native.
 *
 * Auth : la session NextAuth est obligatoire. Le JWT du service auth est
 * forwardé en `Authorization: Bearer` au tender service, qui applique sa
 * propre vérification de visibilité (CONFIDENTIEL → ADMIN/DIRECTEUR uniquement).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) {
    return new Response(JSON.stringify({ error: "Document id manquant" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const session = await getServerSession(authOptions);
  const token = (session as { authServiceToken?: string } | null)?.authServiceToken;
  if (!token) {
    return new Response(JSON.stringify({ error: "Non authentifié" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const resp = await fetch(`${TENDER_URL}/documents/${encodeURIComponent(id)}/file`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!resp.ok) {
      const text = await resp.text();
      return new Response(text || JSON.stringify({ error: "Document inaccessible" }), {
        status: resp.status,
        headers: {
          "Content-Type": resp.headers.get("content-type") || "application/json",
        },
      });
    }

    const passHeaders = new Headers();
    for (const h of ["content-type", "content-disposition", "content-length", "cache-control"]) {
      const v = resp.headers.get(h);
      if (v) passHeaders.set(h, v);
    }
    // Sécurité : empêcher l'embed depuis un autre domaine (XSS via PDF malveillant).
    passHeaders.set("X-Content-Type-Options", "nosniff");
    return new Response(resp.body, { status: 200, headers: passHeaders });
  } catch (err) {
    console.error(`Document file proxy error for id=${id}:`, err);
    return new Response(JSON.stringify({ error: "Service indisponible" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}

import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

const TENDER_URL = process.env.TENDER_SERVICE_URL || "http://localhost:3002";

/**
 * POST /api/documents/upload
 *
 * Forward du multipart vers le tender service.
 * On streame le body tel quel pour préserver le `boundary` du multipart.
 *
 * Le proxy catch-all `/api/[...service]` est bogué pour les chemins
 * multi-segments — cette route dédiée le contourne proprement.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const token = (session as { authServiceToken?: string } | null)?.authServiceToken;
  if (!token) {
    return new Response(JSON.stringify({ error: "Non authentifié" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const contentType = req.headers.get("content-type");
  if (!contentType || !contentType.startsWith("multipart/form-data")) {
    return new Response(JSON.stringify({ error: "multipart/form-data attendu" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const resp = await fetch(`${TENDER_URL}/documents/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": contentType,
      },
      body: req.body,
      // @ts-expect-error - Node fetch supporte `duplex: "half"` pour streamer
      duplex: "half",
      cache: "no-store",
    });

    const text = await resp.text();
    return new Response(text, {
      status: resp.status,
      headers: {
        "Content-Type": resp.headers.get("content-type") || "application/json",
      },
    });
  } catch (err) {
    console.error("Document upload proxy error:", err);
    return new Response(JSON.stringify({ error: "Service indisponible" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}

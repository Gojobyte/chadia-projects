// Service proxy - forwards requests to microservices
const SERVICE_URLS: Record<string, string> = {
  auth: process.env.AUTH_SERVICE_URL || "http://localhost:3001",
  tender: process.env.TENDER_SERVICE_URL || "http://localhost:3002",
  notification: process.env.NOTIFICATION_SERVICE_URL || "http://localhost:3003",
};

const SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || "";

/**
 * Récupère le JWT du service auth depuis la session NextAuth pour le
 * forwarder au service métier (machine-to-machine via Authorization).
 * Importé dynamiquement pour éviter de pénaliser les routes qui n'en ont
 * pas besoin et casser le build edge runtime éventuel.
 */
async function getAuthBearerFromSession(): Promise<string | null> {
  try {
    const { getServerSession } = await import("next-auth/next");
    const { authOptions } = await import("./auth");
    const session = await getServerSession(authOptions);
    const token = (session as { authServiceToken?: string } | null)?.authServiceToken;
    return token ?? null;
  } catch {
    return null;
  }
}

export async function forward(
  service: string,
  path: string,
  req: Request,
  body: unknown,
): Promise<Response> {
  const baseUrl = SERVICE_URLS[service];
  if (!baseUrl) {
    return new Response(JSON.stringify({ error: `Unknown service: ${service}` }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const headers = new Headers();

  // Forward auth header explicite si présent, sinon utiliser la session NextAuth.
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    headers.set("Authorization", authHeader);
  } else {
    const jwt = await getAuthBearerFromSession();
    if (jwt) headers.set("Authorization", `Bearer ${jwt}`);
  }

  // Forward cookies (utile pour les services qui inspectent NextAuth)
  const cookie = req.headers.get("cookie");
  if (cookie) headers.set("Cookie", cookie);

  // Token machine-to-machine (lookup user by email, etc.)
  if (SERVICE_TOKEN) headers.set("x-service-token", SERVICE_TOKEN);

  const contentType = req.headers.get("content-type") || "";
  const isMultipart = contentType.startsWith("multipart/form-data");

  const fetchOpts: RequestInit = {
    method: req.method,
    headers,
    cache: "no-store",
    // @ts-expect-error - Node.js fetch supports `duplex: "half"` for streaming
    duplex: "half",
  };

  if (!["GET", "HEAD"].includes(req.method)) {
    if (isMultipart) {
      // Streaming pur du corps : pas de parsing JSON, on garde le boundary.
      headers.set("Content-Type", contentType);
      fetchOpts.body = req.body;
    } else if (body !== null && body !== undefined) {
      headers.set("Content-Type", "application/json");
      fetchOpts.body = JSON.stringify(body);
    }
  }

  try {
    const resp = await fetch(`${baseUrl}${path}`, fetchOpts);
    const respContentType = resp.headers.get("content-type") || "";

    // Réponse binaire (PDF, image…) : streamer telle quelle, préserver headers.
    if (
      !respContentType.includes("json") &&
      !respContentType.includes("text/")
    ) {
      const passHeaders = new Headers();
      const hToCopy = ["content-type", "content-disposition", "content-length", "cache-control"];
      for (const h of hToCopy) {
        const v = resp.headers.get(h);
        if (v) passHeaders.set(h, v);
      }
      return new Response(resp.body, { status: resp.status, headers: passHeaders });
    }

    // Réponse texte/JSON : passer-thru
    const text = await resp.text();
    return new Response(text, {
      status: resp.status,
      headers: { "Content-Type": respContentType || "application/json" },
    });
  } catch (err) {
    console.error(`Proxy error to ${service} ${path}:`, err);
    return new Response(JSON.stringify({ error: "Service unavailable" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}

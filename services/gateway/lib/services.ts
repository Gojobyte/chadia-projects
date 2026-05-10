// Service proxy - forwards requests to microservices
const SERVICE_URLS: Record<string, string> = {
  auth: process.env.AUTH_SERVICE_URL || "http://localhost:3001",
  tender: process.env.TENDER_SERVICE_URL || "http://localhost:3002",
  notification: process.env.NOTIFICATION_SERVICE_URL || "http://localhost:3003",
};

const SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || "";

export async function forward(
  service: string,
  path: string,
  req: Request,
  body: unknown
): Promise<Response> {
  const baseUrl = SERVICE_URLS[service];
  if (!baseUrl) {
    return new Response(JSON.stringify({ error: `Unknown service: ${service}` }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const headers = new Headers();
  headers.set("Content-Type", "application/json");

  // Forward auth header
  const authHeader = req.headers.get("authorization");
  if (authHeader) headers.set("Authorization", authHeader);

  // Forward cookies
  const cookie = req.headers.get("cookie");
  if (cookie) headers.set("Cookie", cookie);

  // Service-to-service token
  if (SERVICE_TOKEN) headers.set("x-service-token", SERVICE_TOKEN);

  const fetchOpts: RequestInit = {
    method: req.method,
    headers,
    cache: "no-store",
  };

  if (body && !["GET", "HEAD"].includes(req.method)) {
    fetchOpts.body = JSON.stringify(body);
  }

  try {
    const resp = await fetch(`${baseUrl}${path}`, fetchOpts);
    const data = await resp.json().catch(() => null);
    return new Response(JSON.stringify(data), {
      status: resp.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(`Proxy error to ${service}:`, err);
    return new Response(JSON.stringify({ error: "Service unavailable" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}

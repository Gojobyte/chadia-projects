// Service URLs from environment
const AUTH_URL = process.env.AUTH_SERVICE_URL || "http://localhost:3001";
const TENDER_URL = process.env.TENDER_SERVICE_URL || "http://localhost:3002";
const NOTIF_URL = process.env.NOTIFICATION_SERVICE_URL || "http://localhost:3003";

// Internal service token for service-to-service calls
const SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || "";

async function proxyTo(serviceUrl, path, req, body) {
  const url = `${serviceUrl}${path}`;
  const headers = {
    "Content-Type": "application/json",
    "x-service-token": SERVICE_TOKEN,
  };
  // Forward auth token if present
  const authHeader = req.headers.get("authorization");
  if (authHeader) headers["Authorization"] = authHeader;

  const options = { method: req.method, headers };
  if (body && ["POST", "PUT", "PATCH"].includes(req.method)) {
    options.body = JSON.stringify(body);
  }

  const resp = await fetch(url, options);
  const data = await resp.json().catch(() => null);
  return { status: resp.status, data };
}

const Services = {
  auth:    { url: AUTH_URL,    prefix: "/api/auth" },
  tender:  { url: TENDER_URL,  prefix: "/api/tender" },
  notify:  { url: NOTIF_URL,   prefix: "/api/notifications" },

  // Tender sub-routes
  fournisseurs:  { url: TENDER_URL, prefix: "/api/fournisseurs" },
  appelsOffres:  { url: TENDER_URL, prefix: "/api/appels-offres" },
  soumissions:   { url: TENDER_URL, prefix: "/api/soumissions" },
  documents:     { url: TENDER_URL, prefix: "/api/documents" },
  analytics:     { url: TENDER_URL, prefix: "/api/analytics" },

  // Notification sub-routes
  alertes:       { url: NOTIF_URL, prefix: "/api/alertes" },
  abonnements:   { url: NOTIF_URL, prefix: "/api/abonnements" },
};

async function forward(serviceKey, path, req, body) {
  const svc = Services[serviceKey];
  if (!svc) return { status: 404, data: { error: "Unknown service" } };
  return proxyTo(svc.url, path, req, body);
}

module.exports = { Services, forward, proxyTo };

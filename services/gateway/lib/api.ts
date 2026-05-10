// API Client for microservices communication
// In production (Railway), services communicate via HTTP
// In development, same pattern

const AUTH_URL = process.env.AUTH_SERVICE_URL || "http://localhost:3001";
const TENDER_URL = process.env.TENDER_SERVICE_URL || "http://localhost:3002";
const NOTIF_URL = process.env.NOTIFICATION_SERVICE_URL || "http://localhost:3003";
const SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || "";

interface FetchOptions {
  method?: string;
  body?: unknown;
  token?: string;
  cache?: RequestCache;
}

async function apiFetch(baseUrl: string, path: string, opts: FetchOptions = {}) {
  const { method = "GET", body, token, cache = "no-store" } = opts;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (SERVICE_TOKEN) headers["x-service-token"] = SERVICE_TOKEN;

  const fetchOpts: RequestInit = { method, headers, cache };
  if (body && method !== "GET") fetchOpts.body = JSON.stringify(body);

  const resp = await fetch(`${baseUrl}${path}`, fetchOpts);
  const data = await resp.json().catch(() => null);
  if (!resp.ok) throw new Error(data?.error || `API error ${resp.status}`);
  return data;
}

// Auth API
export const AuthAPI = {
  login: (body: { email: string; password: string }) =>
    apiFetch(AUTH_URL, "/auth/login", { method: "POST", body }),
  register: (body: { email: string; name: string; password: string }) =>
    apiFetch(AUTH_URL, "/auth/register", { method: "POST", body }),
  me: (token: string) =>
    apiFetch(AUTH_URL, "/auth/me", { token }),
  validate: (token: string) =>
    apiFetch(AUTH_URL, "/auth/validate", { token }),
  // Service-to-service: lookup user by email (uses x-service-token automatically)
  getUserByEmail: (email: string) =>
    apiFetch(AUTH_URL, `/auth/users?email=${encodeURIComponent(email)}`),
  listUsers: (token: string, params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch(AUTH_URL, `/auth/users${qs}`, { token });
  },
  // Service-to-service: upsert/link Google account, returns { user, token }
  googleUpsert: (body: { email: string; name?: string; image?: string; providerAccountId: string }) =>
    apiFetch(AUTH_URL, "/auth/oauth/google", { method: "POST", body }),
};

// Tender API
export const TenderAPI = {
  // Fournisseurs
  listFournisseurs: (params?: Record<string, string>, token?: string) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch(TENDER_URL, `/fournisseurs${qs}`, { token });
  },
  getFournisseur: (id: string, token?: string) =>
    apiFetch(TENDER_URL, `/fournisseurs/${id}`, { token }),
  createFournisseur: (body: Record<string, unknown>, token?: string) =>
    apiFetch(TENDER_URL, "/fournisseurs", { method: "POST", body, token }),
  verifyFournisseur: (id: string, token?: string) =>
    apiFetch(TENDER_URL, `/fournisseurs/${id}/verify`, { method: "PATCH", token }),

  // Appels d'offres
  listAppelsOffres: (params?: Record<string, string>, token?: string) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch(TENDER_URL, `/appels-offres${qs}`, { token });
  },
  getAppelOffre: (id: string) =>
    apiFetch(TENDER_URL, `/appels-offres/${id}`),
  createAppelOffre: (body: Record<string, unknown>, token?: string) =>
    apiFetch(TENDER_URL, "/appels-offres", { method: "POST", body, token }),
  publishAppelOffre: (id: string, token: string) =>
    apiFetch(TENDER_URL, `/appels-offres/${id}/publish`, { method: "PATCH", token }),

  // Soumissions
  listSoumissions: (params?: Record<string, string>, token?: string) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch(TENDER_URL, `/soumissions${qs}`, { token });
  },
  getSoumission: (id: string, token?: string) =>
    apiFetch(TENDER_URL, `/soumissions/${id}`, { token }),
  createSoumission: (body: Record<string, unknown>, token?: string) =>
    apiFetch(TENDER_URL, "/soumissions", { method: "POST", body, token }),
  evaluateSoumission: (id: string, body: Record<string, unknown>, token?: string) =>
    apiFetch(TENDER_URL, `/soumissions/${id}/evaluate`, { method: "PUT", body, token }),
  retainSoumission: (id: string, token?: string) =>
    apiFetch(TENDER_URL, `/soumissions/${id}/retain`, { method: "PATCH", token }),

  // Documents
  listDocuments: (params?: Record<string, string>, token?: string) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch(TENDER_URL, `/documents${qs}`, { token });
  },
  getDocument: (id: string, token?: string) =>
    apiFetch(TENDER_URL, `/documents/${id}`, { token }),
  createDocument: (body: Record<string, unknown>, token?: string) =>
    apiFetch(TENDER_URL, "/documents", { method: "POST", body, token }),
  patchDocument: (id: string, body: Record<string, unknown>, token?: string) =>
    apiFetch(TENDER_URL, `/documents/${id}`, { method: "PATCH", body, token }),
  deleteDocument: (id: string, token?: string) =>
    apiFetch(TENDER_URL, `/documents/${id}`, { method: "DELETE", token }),
  // Upload multipart : la requête transite par /api/[...service]/route.ts qui
  // forward le FormData au tender avec le token JWT.
  documentFileUrl: (id: string) => `/api/tender/documents/${id}/file`,

  // Analytics
  getAnalytics: (token?: string) =>
    apiFetch(TENDER_URL, "/analytics", { token }),

  // Résultats publics (marchés attribués)
  listResultats: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch(TENDER_URL, `/resultats${qs}`);
  },

  // Bailleurs
  listBailleurs: () => apiFetch(TENDER_URL, "/bailleurs"),
  createBailleur: (body: Record<string, unknown>, token?: string) =>
    apiFetch(TENDER_URL, "/bailleurs", { method: "POST", body, token }),

  // Projets
  listProjets: (params?: Record<string, string>, token?: string) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch(TENDER_URL, `/projets${qs}`, { token });
  },
  getProjet: (id: string, token?: string) =>
    apiFetch(TENDER_URL, `/projets/${id}`, { token }),
  createProjet: (body: Record<string, unknown>, token?: string) =>
    apiFetch(TENDER_URL, "/projets", { method: "POST", body, token }),
  updateProjet: (id: string, body: Record<string, unknown>, token?: string) =>
    apiFetch(TENDER_URL, `/projets/${id}`, { method: "PUT", body, token }),
  updateProjetAvancement: (id: string, body: { avancement?: number; etapeLabel?: string }, token?: string) =>
    apiFetch(TENDER_URL, `/projets/${id}/avancement`, { method: "PATCH", body, token }),
  deleteProjet: (id: string, token?: string) =>
    apiFetch(TENDER_URL, `/projets/${id}`, { method: "DELETE", token }),

  // Settings
  listSettings: (token: string, params?: { category?: string; prefix?: string }) => {
    const qs = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
    return apiFetch(TENDER_URL, `/settings${qs}`, { token });
  },
  getSetting: (key: string, token: string) =>
    apiFetch(TENDER_URL, `/settings/${key}`, { token }),
  updateSetting: (key: string, value: unknown, token: string) =>
    apiFetch(TENDER_URL, `/settings/${key}`, { method: "PUT", body: { value }, token }),
  updateSettings: (entries: Record<string, unknown>, token: string) =>
    apiFetch(TENDER_URL, "/settings", { method: "PATCH", body: { entries }, token }),
};

// Notification API
export const NotifAPI = {
  listNotifications: (userId: string, token?: string) =>
    apiFetch(NOTIF_URL, `/notifications?userId=${userId}`, { token }),
  markRead: (id: string, token?: string) =>
    apiFetch(NOTIF_URL, `/notifications/${id}/read`, { method: "PATCH", token }),
  markAllRead: (userId: string, token?: string) =>
    apiFetch(NOTIF_URL, `/notifications/read-all?userId=${userId}`, { method: "PATCH", token }),
  listAlertes: (userId: string, token?: string) =>
    apiFetch(NOTIF_URL, `/alertes?userId=${userId}`, { token }),
  createAbonnement: (body: Record<string, unknown>, token?: string) =>
    apiFetch(NOTIF_URL, "/abonnements", { method: "POST", body, token }),
  listAbonnements: (userId: string, token?: string) =>
    apiFetch(NOTIF_URL, `/abonnements?userId=${userId}`, { token }),
};

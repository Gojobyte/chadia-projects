import { forward } from "@/lib/services";

// Proxy handler for all microservice routes
async function handler(req, { params }) {
  const { service, ...rest } = await params;
  const path = "/" + rest.join("/");
  let body = null;
  if (!["GET", "HEAD"].includes(req.method)) {
    try { body = await req.json(); } catch {}
  }
  return forward(service, path, req, body);
}

export async function GET(req, params) { return handler(req, params); }
export async function POST(req, params) { return handler(req, params); }
export async function PUT(req, params) { return handler(req, params); }
export async function PATCH(req, params) { return handler(req, params); }
export async function DELETE(req, params) { return handler(req, params); }

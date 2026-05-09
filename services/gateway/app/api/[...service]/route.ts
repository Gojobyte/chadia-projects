import { forward } from "@/lib/services";
import type { NextRequest } from "next/server";

// Proxy handler for all microservice routes
async function handler(req: NextRequest, { params }: { params: Promise<Record<string, string | string[]>> }) {
  const p = await params;
  const service = p.service as string;
  const slug = p.slug as string[];
  const path = "/" + (slug || []).join("/");
  let body: unknown = null;
  if (!["GET", "HEAD"].includes(req.method)) {
    try { body = await req.json(); } catch { /* ignore */ }
  }
  return forward(service, path, req, body);
}

export async function GET(req: NextRequest, ctx: { params: Promise<Record<string, string | string[]>> }) { return handler(req, ctx); }
export async function POST(req: NextRequest, ctx: { params: Promise<Record<string, string | string[]>> }) { return handler(req, ctx); }
export async function PUT(req: NextRequest, ctx: { params: Promise<Record<string, string | string[]>> }) { return handler(req, ctx); }
export async function PATCH(req: NextRequest, ctx: { params: Promise<Record<string, string | string[]>> }) { return handler(req, ctx); }
export async function DELETE(req: NextRequest, ctx: { params: Promise<Record<string, string | string[]>> }) { return handler(req, ctx); }

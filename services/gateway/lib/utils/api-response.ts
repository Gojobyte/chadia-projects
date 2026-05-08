import { NextResponse } from "next/server";

export function success<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}
export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}
export function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
export function unauthorized() {
  return NextResponse.json({ error: "Non autorise." }, { status: 401 });
}
export function forbidden() {
  return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
}
export function notFound(entite = "Ressource") {
  return NextResponse.json({ error: `${entite} non trouve(e).` }, { status: 404 });
}

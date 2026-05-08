import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/documents?projetId=xxx
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projetId = searchParams.get("projetId");

    if (!projetId) {
      return NextResponse.json(
        { error: "projetId requis" },
        { status: 400 }
      );
    }

    const documents = await prisma.document.findMany({
      where: { projetId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        titre: true,
        contenu: true,
        statut: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ documents });
  } catch (error) {
    console.error("[documents] GET error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// POST /api/documents
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { projetId, titre, contenu, categorie } = body;

    if (!projetId || !titre) {
      return NextResponse.json(
        { error: "projetId et titre requis" },
        { status: 400 }
      );
    }

    const document = await prisma.document.create({
      data: {
        projetId,
        titre,
        contenu: contenu || "",
        categorie: categorie || "TECHNIQUE",
        statut: "BROUILLON",
      },
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    console.error("[documents] POST error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/commentaires?projetId=xxx&documentId=xxx
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projetId = searchParams.get("projetId");
    const documentId = searchParams.get("documentId");
    const tacheId = searchParams.get("tacheId");

    if (!projetId) {
      return NextResponse.json({ error: "projetId requis" }, { status: 400 });
    }

    const commentaires = await prisma.commentaire.findMany({
      where: {
        projetId,
        ...(documentId ? { documentId } : {}),
        ...(tacheId ? { tacheId } : {}),
      },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ commentaires });
  } catch (error) {
    console.error("[commentaires] GET error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST /api/commentaires
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { projetId, documentId, tacheId, contenu } = body;

    if (!projetId || !contenu) {
      return NextResponse.json(
        { error: "projetId et contenu requis" },
        { status: 400 }
      );
    }

    const commentaire = await prisma.commentaire.create({
      data: {
        projetId,
        documentId: documentId || null,
        tacheId: tacheId || null,
        contenu,
        userId: session.user.id,
      },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    });

    return NextResponse.json({ commentaire }, { status: 201 });
  } catch (error) {
    console.error("[commentaires] POST error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// POST /api/ai/generate
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { prompt, context } = body;

    if (!prompt) {
      return NextResponse.json({ error: "prompt requis" }, { status: 400 });
    }

    // Try Mistral first, fallback to Claude
    const aiText = await callAI(prompt, context);

    return NextResponse.json({ text: aiText });
  } catch (error) {
    console.error("[ai/generate] error:", error);
    return NextResponse.json(
      { error: "Erreur de génération IA" },
      { status: 500 }
    );
  }
}

async function callAI(prompt: string, context?: string): Promise<string> {
  const systemPrompt = `Tu es un assistant expert en rédaction de projets et appels d'offres pour des ONG au Tchad. 
Tu rédiges des textes professionnels, clairs et convaincants en français.
${context ? `Contexte du document :\n${context}\n` : ""}

Rédige un paragraphe pertinent pour : ${prompt}

Réponds UNIQUEMENT avec le texte généré, sans explication ni mise en forme HTML.`;

  // Try Mistral
  if (process.env.MISTRAL_API_KEY) {
    try {
      const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
        },
        body: JSON.stringify({
          model: "mistral-small-latest",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.choices?.[0]?.message?.content || "";
      }
    } catch {
      // Mistral failed, try Claude
    }
  }

  // Try Claude
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          system: systemPrompt,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.content?.[0]?.text || "";
      }
    } catch {
      // Claude failed too
    }
  }

  // Fallback: return placeholder text
  return `Texte généré pour : "${prompt}". Configurez MISTRAL_API_KEY ou ANTHROPIC_API_KEY pour la génération IA réelle.`;
}

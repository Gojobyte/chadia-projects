/**
 * POST /api/projets/analyze — Sprint 1
 *
 * Analyse simple d'un appel d'offres depuis URL, texte brut, ou fichier base64.
 * Retourne une structure légère adaptée à la création rapide d'un projet
 * (titre, bailleur, budget, dateLimite, description, documents requis,
 * critères, résumé).
 *
 * Pour l'analyse TDR complète et structurée, voir /api/projets/analyze-tdr.
 */

import { requireRole } from "@/lib/auth-guard";
import { completeWithFallback } from "@/lib/ai/providers/factory";
import { logLLMInteraction } from "@/lib/ai/logger";
import { error, success } from "@/lib/utils/api-response";

const SYSTEM_PROMPT = `Tu es un expert en analyse d'appels d'offres et termes de référence pour ONG.
Tu réponds TOUJOURS en JSON valide, sans préambule ni backticks markdown.
Le JSON doit être directement parsable par JSON.parse().`;

function buildPrompt(text: string): string {
  return `Analyse l'appel d'offres suivant et extrais les informations clés au format JSON strict.

Si une information n'est pas présente dans le document, mets null. N'invente rien.

SCHÉMA JSON ATTENDU :
{
  "titre": "string — titre court et clair de l'appel",
  "bailleur": "string|null — nom court du bailleur (UNDP, AFD, UE, etc.)",
  "budget": "number|null — montant maximum en valeur numérique brute",
  "devise": "string|null — EUR, USD, XAF, FCFA",
  "dateLimite": "string|null — date ISO 8601 (YYYY-MM-DD) de soumission",
  "description": "string — description complète du projet/appel (2-4 paragraphes)",
  "documentsRequis": ["string — liste des documents/livrables exigés"],
  "criteres": ["string — critères d'évaluation"],
  "resume": "string — résumé en 2-3 phrases"
}

<appel_offres>
${text}
</appel_offres>

Réponds UNIQUEMENT avec le JSON. Pas de backticks, pas de préambule.`;
}

interface AnalyzeBody {
  url?: string;
  text?: string;
  file?: string; // base64
  fileName?: string;
}

export async function POST(request: Request) {
  const result = await requireRole("MEMBRE");
  if (result.error) return result.error;

  let body: AnalyzeBody;
  try {
    body = (await request.json()) as AnalyzeBody;
  } catch {
    return error("Corps de requête JSON invalide.", 400);
  }

  let rawText = "";
  let sourceLabel = "";

  try {
    if (body.url) {
      const { extractTextFromURL } = await import("@/lib/ai/extractors/url");
      const extraction = await extractTextFromURL(body.url);
      rawText = extraction.text;
      sourceLabel = `url:${body.url}`;
    } else if (body.text) {
      rawText = body.text;
      sourceLabel = "text";
    } else if (body.file) {
      const buffer = Buffer.from(body.file, "base64");
      const { extractTextFromPDF } = await import("@/lib/ai/extractors/pdf");
      const extraction = await extractTextFromPDF(buffer, body.fileName ?? "document.pdf");
      rawText = extraction.text;
      sourceLabel = `file:${body.fileName ?? "document.pdf"}`;
    } else {
      return error("Fournissez `url`, `text`, ou `file` (base64).", 400);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur d'extraction du texte";
    return error(msg, 422);
  }

  if (rawText.length < 100) {
    return error("Le contenu extrait est trop court (< 100 caractères).", 400);
  }

  const prompt = buildPrompt(rawText);

  try {
    const response = await completeWithFallback("tdr_extraction", {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
      maxTokens: 4096,
      jsonMode: true,
    });

    let parsed: Record<string, unknown> | null = null;
    try {
      const cleaned = response.content.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      await logLLMInteraction({
        userId: result.user.id,
        action: "tender_quick_analyze",
        inputPrompt: prompt.slice(0, 500),
        response,
        status: "error",
        errorMsg: "JSON parsing failed",
      });
      return error("L'IA n'a pas pu produire un JSON exploitable. Réessayez.", 422);
    }

    await logLLMInteraction({
      userId: result.user.id,
      action: "tender_quick_analyze",
      inputPrompt: prompt.slice(0, 500),
      response,
      status: "success",
    });

    return success({
      analysis: parsed,
      source: { label: sourceLabel, textLength: rawText.length },
      cost: {
        tokensIn: response.tokensIn,
        tokensOut: response.tokensOut,
        costUsd: response.costUsd,
        model: response.model,
        provider: response.provider,
        durationMs: response.durationMs,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur LLM";
    console.error("[analyze] Erreur:", msg);
    return error(msg, 500);
  }
}

/**
 * POST /api/projets/analyze-tdr
 *
 * Reçoit un PDF, une URL, ou du texte brut d'un appel d'offres.
 * Retourne une analyse TDR structurée (TDRAnalysis) sans créer de projet.
 * L'utilisateur valide/corrige avant de créer le projet (étape suivante).
 */

import { requireRole } from "@/lib/auth-guard";
import { getProvider } from "@/lib/ai/providers/factory";
import { logLLMInteraction } from "@/lib/ai/logger";
import { TDR_EXTRACTION_SYSTEM, buildTDRExtractionPrompt } from "@/lib/ai/prompts/tdrExtractor";
import { parseTDRAnalysis } from "@/lib/ai/schemas/tdrAnalysis";
// Extracteurs importés dynamiquement pour éviter les imports natifs au build time

export async function POST(request: Request) {
  const result = await requireRole("MEMBRE");
  if (result.error) return result.error;

  const contentType = request.headers.get("content-type") ?? "";
  let sourceType: "pdf" | "url" | "text";
  let rawText = "";
  let sourceUrl: string | null = null;
  let sourceFileName: string | null = null;

  try {
    // Déterminer la source
    if (contentType.includes("multipart/form-data")) {
      // Upload PDF
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) return Response.json({ error: "Aucun fichier fourni" }, { status: 400 });

      sourceType = "pdf";
      sourceFileName = file.name;
      const buffer = Buffer.from(await file.arrayBuffer());
      const { extractTextFromPDF } = await import("@/lib/ai/extractors/pdf");
      const extraction = await extractTextFromPDF(buffer, file.name);
      rawText = extraction.text;

      if (extraction.pageCount > 100) {
        return Response.json({ error: "Le PDF dépasse 100 pages" }, { status: 400 });
      }
    } else {
      // JSON body : URL ou texte
      const body = await request.json();

      if (body.url) {
        sourceType = "url";
        sourceUrl = body.url;
        const { extractTextFromURL } = await import("@/lib/ai/extractors/url");
        const extraction = await extractTextFromURL(body.url);
        rawText = extraction.text;
      } else if (body.text) {
        sourceType = "text";
        rawText = body.text;
      } else {
        return Response.json({ error: "Fournissez un fichier PDF, une URL, ou du texte" }, { status: 400 });
      }
    }

    if (rawText.length < 100) {
      return Response.json({ error: "Le contenu extrait est trop court (< 100 caractères)" }, { status: 400 });
    }

    // Appel LLM
    const provider = getProvider("tdr_extraction");
    const prompt = buildTDRExtractionPrompt(rawText);

    const response = await provider.complete({
      messages: [
        { role: "system", content: TDR_EXTRACTION_SYSTEM },
        { role: "user", content: prompt },
      ],
      temperature: 0.1, // Très déterministe pour l'extraction
      maxTokens: 16384,
      jsonMode: true,
    });

    // Parser et valider le JSON
    const analysis = parseTDRAnalysis(response.content);

    if (!analysis) {
      // Log l'échec
      await logLLMInteraction({
        userId: result.user.id,
        action: "tdr_extraction",
        inputPrompt: prompt.slice(0, 500),
        response,
        status: "error",
        errorMsg: "JSON parsing failed",
      });

      return Response.json({
        error: "L'IA n'a pas pu analyser ce document. Essayez avec un format différent ou saisissez manuellement.",
        rawResponse: response.content.slice(0, 500),
      }, { status: 422 });
    }

    // Log le succès
    await logLLMInteraction({
      userId: result.user.id,
      action: "tdr_extraction",
      inputPrompt: prompt.slice(0, 500),
      response,
      status: "success",
    });

    return Response.json({
      analysis,
      source: {
        type: sourceType,
        url: sourceUrl,
        fileName: sourceFileName,
        textLength: rawText.length,
        rawTextPreview: rawText.slice(0, 500),
      },
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
    const msg = err instanceof Error ? err.message : "Erreur interne";
    console.error("[analyze-tdr] Erreur:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}

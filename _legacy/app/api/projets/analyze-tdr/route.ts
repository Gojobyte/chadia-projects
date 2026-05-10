/**
 * POST /api/projets/analyze-tdr — Phase 1.5
 *
 * Reçoit un PDF, une URL, ou du texte brut d'un appel d'offres.
 * Retourne une analyse TDR structurée (TDRAnalysis).
 *
 * Améliorations Phase 1.5 :
 * - Retry automatique si la validation stricte échoue
 * - Flag extractionQuality: "high" | "partial"
 * - Prompt de correction avec erreurs explicites
 */

import { requireRole } from "@/lib/auth-guard";
import { completeWithFallback } from "@/lib/ai/providers/factory";
import { logLLMInteraction } from "@/lib/ai/logger";
import {
  TDR_EXTRACTION_SYSTEM,
  buildTDRExtractionPrompt,
  buildTDRCorrectionPrompt,
} from "@/lib/ai/prompts/tdrExtractor";
import { parseTDRAnalysis, formatValidationErrors } from "@/lib/ai/schemas/tdrAnalysis";

export async function POST(request: Request) {
  const result = await requireRole("MEMBRE");
  if (result.error) return result.error;

  const contentType = request.headers.get("content-type") ?? "";
  let sourceType: "pdf" | "url" | "text";
  let rawText = "";
  let sourceUrl: string | null = null;
  let sourceFileName: string | null = null;

  try {
    // ─── Extraction du texte source ───
    if (contentType.includes("multipart/form-data")) {
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

    // ─── Premier appel LLM ───
    const prompt = buildTDRExtractionPrompt(rawText);
    let totalCost = 0;
    let totalTokensIn = 0;
    let totalTokensOut = 0;

    const response = await completeWithFallback("tdr_extraction", {
      messages: [
        { role: "system", content: TDR_EXTRACTION_SYSTEM },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
      maxTokens: 16384,
      jsonMode: true,
    });

    totalCost += response.costUsd;
    totalTokensIn += response.tokensIn;
    totalTokensOut += response.tokensOut;

    let parsed = parseTDRAnalysis(response.content);

    // ─── Retry si extraction de qualité partielle ───
    if (parsed && parsed.quality === "partial" && parsed.errors && parsed.errors.length > 0) {
      console.log(`[analyze-tdr] Qualité partielle (${parsed.errors.length} erreurs), retry avec correction...`);

      const correctionPrompt = buildTDRCorrectionPrompt(
        rawText,
        formatValidationErrors(parsed.errors)
      );

      try {
        const retryResponse = await completeWithFallback("tdr_extraction", {
          messages: [
            { role: "system", content: TDR_EXTRACTION_SYSTEM },
            { role: "user", content: correctionPrompt },
          ],
          temperature: 0.15,
          maxTokens: 16384,
          jsonMode: true,
        });

        totalCost += retryResponse.costUsd;
        totalTokensIn += retryResponse.tokensIn;
        totalTokensOut += retryResponse.tokensOut;

        const retryParsed = parseTDRAnalysis(retryResponse.content);
        if (retryParsed && (retryParsed.quality === "high" || (retryParsed.errors?.length ?? 99) < (parsed.errors?.length ?? 0))) {
          console.log(`[analyze-tdr] Retry amélioré: ${retryParsed.quality} (${retryParsed.errors?.length ?? 0} erreurs restantes)`);
          parsed = retryParsed;

          // Logger le retry
          await logLLMInteraction({
            userId: result.user.id,
            action: "tdr_extraction_retry",
            inputPrompt: correctionPrompt.slice(0, 500),
            response: retryResponse,
            status: "success",
          });
        }
      } catch (retryErr) {
        console.warn("[analyze-tdr] Retry échoué, on garde l'extraction initiale:", retryErr);
      }
    }

    if (!parsed) {
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
      }, { status: 422 });
    }

    // ─── Logger le succès ───
    await logLLMInteraction({
      userId: result.user.id,
      action: "tdr_extraction",
      inputPrompt: prompt.slice(0, 500),
      response,
      status: "success",
    });

    return Response.json({
      analysis: parsed.data,
      extractionQuality: parsed.quality,
      qualityErrors: parsed.errors ?? [],
      source: {
        type: sourceType,
        url: sourceUrl,
        fileName: sourceFileName,
        textLength: rawText.length,
        rawTextPreview: rawText.slice(0, 500),
      },
      cost: {
        tokensIn: totalTokensIn,
        tokensOut: totalTokensOut,
        costUsd: totalCost,
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

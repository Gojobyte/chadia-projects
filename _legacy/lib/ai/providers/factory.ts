/**
 * Factory — routing des tâches IA vers le bon provider/modèle.
 *
 * Mistral est le provider principal.
 * Si Mistral échoue (clé invalide, rate limit, erreur), on bascule vers Gemini.
 */

import { MistralProvider } from "./mistral";
import { GeminiProvider } from "./gemini";
import type { LLMProvider, LLMTask, LLMRequest, LLMResponse } from "../client";

// Mapping tâche → provider + modèle
const TASK_CONFIG: Record<LLMTask, { provider: "mistral" | "gemini"; model: string }> = {
  tdr_extraction: { provider: "mistral", model: "mistral-large-latest" },
  section_questions: { provider: "mistral", model: "mistral-large-latest" },
  paragraph_draft: { provider: "mistral", model: "mistral-large-latest" },
  budget_check: { provider: "mistral", model: "mistral-large-latest" },
  copilot_inline: { provider: "mistral", model: "mistral-small-latest" },
  quick_suggestion: { provider: "mistral", model: "mistral-small-latest" },
};

/**
 * Retourne le provider configuré pour une tâche donnée.
 * Ne garantit PAS que le provider fonctionne — utiliser completeWithFallback() pour ça.
 */
export function getProvider(task: LLMTask): LLMProvider {
  const config = TASK_CONFIG[task];

  if (config.provider === "mistral" && process.env.MISTRAL_API_KEY) {
    return new MistralProvider(config.model);
  }

  if (process.env.GEMINI_API_KEY) {
    return new GeminiProvider("gemini-2.5-flash");
  }

  throw new Error("Aucun provider LLM configuré. Ajoutez MISTRAL_API_KEY ou GEMINI_API_KEY dans .env");
}

/**
 * Exécute un appel LLM avec fallback automatique.
 * Essaie Mistral d'abord, bascule vers Gemini si Mistral échoue.
 */
export async function completeWithFallback(task: LLMTask, request: LLMRequest): Promise<LLMResponse> {
  const providers: LLMProvider[] = [];

  // Construire la liste de providers à essayer
  if (process.env.MISTRAL_API_KEY) {
    const config = TASK_CONFIG[task];
    providers.push(new MistralProvider(config.model));
  }
  if (process.env.GEMINI_API_KEY) {
    providers.push(new GeminiProvider("gemini-2.5-flash"));
  }

  if (providers.length === 0) {
    throw new Error("Aucun provider LLM configuré");
  }

  let lastError: Error | null = null;

  for (const provider of providers) {
    try {
      const response = await provider.complete(request);
      return response;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[LLM Fallback] Provider échoué, tentative suivante...`, lastError.message.slice(0, 100));
    }
  }

  throw lastError ?? new Error("Tous les providers LLM ont échoué");
}

export function isAIAvailable(): boolean {
  return !!(process.env.MISTRAL_API_KEY || process.env.GEMINI_API_KEY);
}

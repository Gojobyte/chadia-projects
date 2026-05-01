/**
 * Factory — routing des tâches IA vers le bon provider/modèle.
 *
 * Mistral est le provider principal.
 * Gemini est le fallback si MISTRAL_API_KEY n'est pas configurée.
 *
 * Cette couche permet de changer de provider sans toucher aux routes.
 */

import { MistralProvider } from "./mistral";
import { GeminiProvider } from "./gemini";
import type { LLMProvider, LLMTask } from "../client";

// Mapping tâche → provider + modèle
const TASK_CONFIG: Record<LLMTask, { provider: "mistral" | "gemini"; model: string }> = {
  // Mistral Large pour les tâches critiques (qualité FR)
  tdr_extraction: { provider: "mistral", model: "mistral-large-latest" },
  section_questions: { provider: "mistral", model: "mistral-large-latest" },
  paragraph_draft: { provider: "mistral", model: "mistral-large-latest" },
  budget_check: { provider: "mistral", model: "mistral-large-latest" },

  // Mistral Small pour les tâches rapides
  copilot_inline: { provider: "mistral", model: "mistral-small-latest" },
  quick_suggestion: { provider: "mistral", model: "mistral-small-latest" },
};

export function getProvider(task: LLMTask): LLMProvider {
  const config = TASK_CONFIG[task];

  // Essayer Mistral en priorité
  if (config.provider === "mistral" && process.env.MISTRAL_API_KEY) {
    return new MistralProvider(config.model);
  }

  // Fallback Gemini
  if (process.env.GEMINI_API_KEY) {
    console.warn(`[LLM] Mistral indisponible, fallback Gemini pour ${task}`);
    return new GeminiProvider("gemini-2.5-flash");
  }

  throw new Error(
    "Aucun provider LLM configuré. Ajoutez MISTRAL_API_KEY ou GEMINI_API_KEY dans .env"
  );
}

/**
 * Vérifie si au moins un provider IA est disponible.
 * Utilisé pour le mode dégradé (app fonctionnelle sans IA).
 */
export function isAIAvailable(): boolean {
  return !!(process.env.MISTRAL_API_KEY || process.env.GEMINI_API_KEY);
}

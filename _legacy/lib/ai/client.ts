/**
 * Interface LLMClient — couche d'abstraction pour les providers IA.
 *
 * Permet de switcher entre Mistral, Gemini, ou un futur provider
 * sans toucher aux routes API ni aux composants.
 *
 * Chaque provider implémente cette interface.
 */

export type LLMTask =
  | "tdr_extraction"
  | "section_questions"
  | "paragraph_draft"
  | "budget_check"
  | "copilot_inline"
  | "quick_suggestion";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMRequest {
  messages: LLMMessage[];
  temperature?: number;    // 0.0 - 1.0, défaut 0.2
  maxTokens?: number;      // défaut 8192
  jsonMode?: boolean;      // forcer la réponse en JSON
}

export interface LLMResponse {
  content: string;         // texte de la réponse
  tokensIn: number;
  tokensOut: number;
  costUsd: number;         // coût estimé en USD
  model: string;           // modèle utilisé
  provider: string;        // "mistral" | "gemini"
  durationMs?: number;
}

export interface LLMProvider {
  /** Appel synchrone — attend la réponse complète */
  complete(request: LLMRequest): Promise<LLMResponse>;

  /** Appel en streaming — pour les générations longues (Phase 2+) */
  stream?(request: LLMRequest): AsyncIterable<string>;
}

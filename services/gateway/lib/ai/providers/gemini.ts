/**
 * Provider Google Gemini — fallback si Mistral est indisponible.
 *
 * Utilise le SDK @google/generative-ai déjà installé.
 * Conservé pour compatibilité et comme seconde option.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import pRetry from "p-retry";
import type { LLMProvider, LLMRequest, LLMResponse } from "../client";

// Tarifs Gemini (gratuit sur le free tier, sinon par million de tokens)
const PRICING: Record<string, { input: number; output: number }> = {
  "gemini-2.5-flash": { input: 0.15, output: 0.60 },
  "gemini-2.5-pro": { input: 1.25, output: 5.0 },
};

export class GeminiProvider implements LLMProvider {
  private model: string;
  private genAI: GoogleGenerativeAI;

  constructor(model = "gemini-2.5-flash") {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY manquant dans .env");
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = model;
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const start = Date.now();
    const model = this.genAI.getGenerativeModel({ model: this.model });

    // Gemini n'a pas de rôle "system" natif — on le préfixe au premier message user
    const systemMsg = request.messages.find(m => m.role === "system");
    const userMsgs = request.messages.filter(m => m.role !== "system");
    const prompt = [
      systemMsg ? systemMsg.content + "\n\n" : "",
      ...userMsgs.map(m => m.content),
    ].join("\n");

    const response = await pRetry(
      async () => model.generateContent(prompt),
      { retries: 2, minTimeout: 1000, maxTimeout: 5000 }
    );

    const text = response.response.text();
    const usage = response.response.usageMetadata;
    const tokensIn = usage?.promptTokenCount ?? 0;
    const tokensOut = usage?.candidatesTokenCount ?? 0;
    const pricing = PRICING[this.model] ?? { input: 0.15, output: 0.60 };
    const costUsd = (tokensIn * pricing.input + tokensOut * pricing.output) / 1_000_000;

    return {
      content: text,
      tokensIn,
      tokensOut,
      costUsd,
      model: this.model,
      provider: "gemini",
      durationMs: Date.now() - start,
    };
  }
}

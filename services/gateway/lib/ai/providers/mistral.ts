/**
 * Provider Mistral AI — provider principal de CHADIA Projects.
 *
 * Modèles utilisés :
 * - mistral-large-latest : extraction TDR, rédaction de qualité
 * - mistral-small-latest : copilote inline, suggestions rapides
 */

import { Mistral } from "@mistralai/mistralai";
import pRetry from "p-retry";
import type { LLMProvider, LLMRequest, LLMResponse } from "../client";

// Tarifs USD par million de tokens (mai 2026)
const PRICING: Record<string, { input: number; output: number }> = {
  "mistral-large-latest": { input: 2.0, output: 6.0 },
  "mistral-small-latest": { input: 0.2, output: 0.6 },
  "mistral-embed": { input: 0.1, output: 0 },
};

export class MistralProvider implements LLMProvider {
  private client: Mistral;
  private model: string;

  constructor(model = "mistral-large-latest") {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) throw new Error("MISTRAL_API_KEY manquant dans .env");
    this.client = new Mistral({
      apiKey,
      timeoutMs: 120_000, // 2 minutes timeout (TDR longs)
    });
    this.model = model;
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const start = Date.now();

    const response = await pRetry(
      async () => {
        const res = await this.client.chat.complete({
          model: this.model,
          messages: request.messages.map(m => ({
            role: m.role as "system" | "user" | "assistant",
            content: m.content,
          })),
          temperature: request.temperature ?? 0.2,
          maxTokens: request.maxTokens ?? 8192,
          responseFormat: request.jsonMode
            ? { type: "json_object" }
            : undefined,
        });
        return res;
      },
      {
        retries: 1, // 1 seul retry (free tier = 2 RPM)
        minTimeout: 2000,
        maxTimeout: 10000,
      }
    );

    const tokensIn = response.usage?.promptTokens ?? 0;
    const tokensOut = response.usage?.completionTokens ?? 0;
    const pricing = PRICING[this.model] ?? { input: 2.0, output: 6.0 };
    const costUsd = (tokensIn * pricing.input + tokensOut * pricing.output) / 1_000_000;

    const content = response.choices?.[0]?.message?.content;

    return {
      content: typeof content === "string" ? content : JSON.stringify(content ?? ""),
      tokensIn,
      tokensOut,
      costUsd,
      model: this.model,
      provider: "mistral",
      durationMs: Date.now() - start,
    };
  }

  async *stream(request: LLMRequest): AsyncIterable<string> {
    const streamResponse = await this.client.chat.stream({
      model: this.model,
      messages: request.messages.map(m => ({
        role: m.role as "system" | "user" | "assistant",
        content: m.content,
      })),
      temperature: request.temperature ?? 0.2,
    });

    for await (const chunk of streamResponse) {
      const content = chunk.data?.choices?.[0]?.delta?.content;
      if (typeof content === "string" && content) yield content;
    }
  }
}

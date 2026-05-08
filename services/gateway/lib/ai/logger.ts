/**
 * Logger des interactions LLM.
 *
 * Chaque appel IA est enregistré en base dans la table llm_interactions.
 * Permet le suivi des coûts, le debug, et l'audit de conformité.
 */

import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";
import type { LLMResponse } from "./client";

interface LogParams {
  userId: string;
  projetId?: string;
  action: string;          // "tdr_extraction", "copilot_continuer", etc.
  inputPrompt: string;     // le prompt envoyé (pour le hash)
  response: LLMResponse;
  status: "success" | "error" | "retry";
  errorMsg?: string;
}

export async function logLLMInteraction(params: LogParams): Promise<void> {
  try {
    const inputHash = createHash("sha256")
      .update(params.inputPrompt.slice(0, 5000)) // hash sur les 5000 premiers caractères
      .digest("hex")
      .slice(0, 32);

    await prisma.lLMInteraction.create({
      data: {
        userId: params.userId,
        projetId: params.projetId ?? null,
        provider: params.response.provider,
        model: params.response.model,
        action: params.action,
        inputHash,
        tokensIn: params.response.tokensIn,
        tokensOut: params.response.tokensOut,
        costUsd: params.response.costUsd,
        durationMs: params.response.durationMs ?? 0,
        status: params.status,
        errorMsg: params.errorMsg ?? null,
      },
    });

    // Log console pour le développement
    console.log(
      `[LLM] ${params.action} | ${params.response.provider}/${params.response.model} | ` +
      `${params.response.tokensIn} in + ${params.response.tokensOut} out | ` +
      `$${params.response.costUsd.toFixed(4)} | ${params.response.durationMs}ms | ${params.status}`
    );
  } catch (err) {
    // Le logging ne doit jamais casser l'app
    console.error("[LLM Logger] Erreur d'écriture:", err);
  }
}

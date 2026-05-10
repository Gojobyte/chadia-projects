import type { LLMResponse } from "./client";

interface LogParams {
  userId: string;
  projetId?: string;
  action: string;
  inputPrompt: string;
  response: LLMResponse;
  status: "success" | "error" | "retry";
  errorMsg?: string;
}

export async function logLLMInteraction(params: LogParams): Promise<void> {
  console.log(
    `[LLM] ${params.action} | ${params.response.provider}/${params.response.model} | ` +
    `${params.response.tokensIn} in + ${params.response.tokensOut} out | ` +
    `$${params.response.costUsd.toFixed(4)} | ${params.response.durationMs}ms | ${params.status}`
  );
}

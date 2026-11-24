import { planProfession } from "@minmax-codex/optimizer";
import type { Plan, PlanInput } from "@minmax-codex/optimizer";

export interface PlanRequest {
  readonly id: number;
  readonly input: PlanInput;
}
export type PlanResponse =
  | { readonly id: number; readonly plan: Plan | null }
  | { readonly id: number; readonly error: string };

interface WorkerScope {
  addEventListener(type: "message", listener: (event: MessageEvent<PlanRequest>) => void): void;
  postMessage(message: PlanResponse): void;
}
const scope = self as unknown as WorkerScope;

// El cálculo corre fuera del hilo principal para no bloquear la interfaz (ADR-003).
scope.addEventListener("message", (event) => {
  const { id, input } = event.data;
  try {
    scope.postMessage({ id, plan: planProfession(input) });
  } catch (error) {
    scope.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
});

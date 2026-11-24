import { useCallback, useEffect, useRef, useState } from "react";
import type { Plan } from "@minmax-codex/optimizer";
import { buildPlanInput, computePlan, validateInputs } from "./model";
import type { CalculatorInputs } from "./model";
import type { PlanResponse } from "./plan.worker";

export type PlanState =
  | { readonly status: "invalid" }
  | { readonly status: "computing" }
  | { readonly status: "ready"; readonly plan: Plan | null }
  | { readonly status: "error"; readonly message: string };

/**
 * Calcula el plan cada vez que cambian las entradas. Usa un Web Worker cuando existe (ADR-003)
 * y cae al cálculo síncrono si no (pruebas, navegadores sin soporte). Devuelve también `retry`,
 * que vuelve a calcular con las mismas entradas tras un error.
 */
export function usePlan(inputs: CalculatorInputs): readonly [PlanState, () => void] {
  const [state, setState] = useState<PlanState>({ status: "computing" });
  const [attempt, setAttempt] = useState(0);
  const worker = useRef<Worker | null>(null);
  const counter = useRef(0);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(
    () => () => {
      worker.current?.terminate();
      worker.current = null;
    },
    [],
  );

  useEffect(() => {
    if (validateInputs(inputs) !== null) {
      setState({ status: "invalid" });
      return;
    }
    setState({ status: "computing" });
    counter.current += 1;
    const id = counter.current;
    if (typeof Worker === "undefined") {
      try {
        setState({ status: "ready", plan: computePlan(inputs) });
      } catch (error) {
        setState({
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }
    worker.current ??= new Worker(new URL("./plan.worker.ts", import.meta.url), { type: "module" });
    const current = worker.current;
    const onMessage = (event: MessageEvent<PlanResponse>): void => {
      if (event.data.id !== counter.current) return; // respuesta de una entrada anterior
      setState(
        "error" in event.data
          ? { status: "error", message: event.data.error }
          : { status: "ready", plan: event.data.plan },
      );
    };
    // Si el Worker no carga o revienta, se descarta para que el reintento cree uno nuevo.
    const onFailure = (): void => {
      current.terminate();
      if (worker.current === current) worker.current = null;
      setState({ status: "error", message: "worker" });
    };
    current.addEventListener("message", onMessage);
    current.addEventListener("error", onFailure);
    current.postMessage({ id, input: buildPlanInput(inputs) });
    return () => {
      current.removeEventListener("message", onMessage);
      current.removeEventListener("error", onFailure);
    };
  }, [inputs, attempt]);

  return [state, retry];
}

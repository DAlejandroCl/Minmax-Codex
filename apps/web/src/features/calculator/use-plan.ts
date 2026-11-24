import { useEffect, useRef, useState } from "react";
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
 * y cae al cálculo síncrono si no (pruebas, navegadores sin soporte).
 */
export function usePlan(inputs: CalculatorInputs): PlanState {
  const [state, setState] = useState<PlanState>({ status: "computing" });
  const worker = useRef<Worker | null>(null);
  const counter = useRef(0);

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
    current.addEventListener("message", onMessage);
    current.postMessage({ id, input: buildPlanInput(inputs) });
    return () => current.removeEventListener("message", onMessage);
  }, [inputs]);

  return state;
}

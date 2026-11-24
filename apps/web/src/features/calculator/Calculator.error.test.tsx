import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type * as Optimizer from "@minmax-codex/optimizer";
import Calculator from "./Calculator";

const failing = vi.hoisted(() => ({ on: true }));

vi.mock("@minmax-codex/optimizer", async (importOriginal) => {
  const real = await importOriginal<typeof Optimizer>();
  return {
    ...real,
    planAllStrategies: (input: Parameters<typeof real.planAllStrategies>[0]) => {
      if (failing.on) throw new Error("fallo simulado");
      return real.planAllStrategies(input);
    },
  };
});

describe("error de cálculo", () => {
  it("muestra un error con acción y se recupera al reintentar", async () => {
    failing.on = true;
    render(<Calculator />);
    expect(await screen.findByText("No se pudo calcular el plan")).toBeInTheDocument();
    failing.on = false;
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText(/Coste total estimado/)).toBeInTheDocument();
    expect(screen.queryByText("No se pudo calcular el plan")).not.toBeInTheDocument();
  });
});

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { describe, expect, it, vi } from "vitest";
import Calculator from "./Calculator";

describe("Calculator", () => {
  it("muestra el plan, la lista de compras y no tiene violaciones críticas de axe", async () => {
    const { container } = render(<Calculator />);
    await waitFor(() => expect(screen.getByText(/Coste total estimado/)).toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "Lista de compras" })).toBeInTheDocument();
    const results = await axe(container);
    const critical = results.violations.filter((v) => v.impact === "critical");
    expect(critical).toEqual([]);
    expect(results.violations).toEqual([]);
  });

  it("avisa cuando el rango es inválido", async () => {
    render(<Calculator />);
    const start = screen.getByLabelText("Habilidad actual");
    await userEvent.clear(start);
    await userEvent.type(start, "299");
    const target = screen.getByLabelText("Habilidad objetivo");
    await userEvent.clear(target);
    await userEvent.type(target, "10");
    expect(await screen.findByRole("alert")).toHaveTextContent(/no puede superar/);
  });

  it("copia la lista y lo anuncia", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<Calculator />);
    await userEvent.click(await screen.findByRole("button", { name: "Copiar lista" }));
    expect(writeText).toHaveBeenCalledOnce();
    expect(await screen.findByText("Lista copiada al portapapeles.")).toBeInTheDocument();
  });
});

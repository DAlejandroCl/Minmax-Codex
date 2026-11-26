import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { describe, expect, it } from "vitest";
import { validateAllocation } from "@minmax-codex/shared";
import { demoAllocation, demoTrees } from "./demo-talents";
import { TalentTrees } from "./TalentTrees";

const setup = (applied = demoAllocation, level = 40) =>
  render(<TalentTrees trees={demoTrees} level={level} applied={applied} />);

const node = (name: RegExp) => screen.getByRole("button", { name });

describe("datos de ejemplo", () => {
  it("la asignación demo es válida para el nivel del personaje", () => {
    expect(validateAllocation(demoTrees, demoAllocation, 40)).toMatchObject({
      valid: true,
      unspent: 15,
    });
  });
});

describe("TalentTrees", () => {
  it("muestra los puntos sin gastar y el estado de cada talento", () => {
    setup();
    expect(screen.getByText("Talentos sin gastar:").parentElement).toHaveTextContent("15");
    expect(node(/^Tinta fresca, rango 3 de 3, al máximo/)).toBeInTheDocument();
    expect(node(/^Biblioteca, rango 0 de 5, bloqueado/)).toBeInTheDocument();
  });

  it("suma con clic y quita con Retroceso; descuenta los puntos", async () => {
    setup({}, 12);
    await userEvent.click(node(/^Chispa/));
    expect(node(/^Chispa, rango 1 de 5/)).toBeInTheDocument();
    expect(screen.getByText("Talentos sin gastar:").parentElement).toHaveTextContent("2");
    node(/^Chispa/).focus();
    await userEvent.keyboard("{Backspace}");
    expect(node(/^Chispa, rango 0 de 5/)).toBeInTheDocument();
  });

  it("explica por qué no se puede sumar un talento de fila cerrada", async () => {
    setup({});
    await userEvent.click(node(/^Letra firme/));
    expect(screen.getByRole("status")).toHaveTextContent("Gasta más puntos en este árbol");
    expect(node(/^Letra firme, rango 0 de 3/)).toBeInTheDocument();
  });

  it("aplicar y restablecer dependen de que haya cambios", async () => {
    setup();
    const apply = screen.getByRole("button", { name: "Aplicar cambios" });
    expect(apply).toBeDisabled();
    await userEvent.click(node(/^Chispa/));
    expect(apply).toBeEnabled();
    await userEvent.click(screen.getByRole("button", { name: "Restablecer" }));
    expect(apply).toBeDisabled();
    await userEvent.click(node(/^Chispa/));
    await userEvent.click(apply);
    expect(screen.getByRole("status")).toHaveTextContent("Cambios aplicados.");
    expect(apply).toBeDisabled();
  });

  it("no tiene violaciones de accesibilidad", async () => {
    const { container } = setup();
    expect(await axe(container)).toHaveNoViolations();
  });
});

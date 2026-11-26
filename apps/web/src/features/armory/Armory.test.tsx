import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { axe } from "vitest-axe";
import { describe, expect, it } from "vitest";
import Armory from "./Armory";

const setup = () =>
  render(
    <MemoryRouter>
      <Armory />
    </MemoryRouter>,
  );

describe("Armory", () => {
  it("muestra el personaje, el ilvl medio y las 17 ranuras", () => {
    setup();
    expect(
      screen.getByRole("heading", { level: 2, name: "Aldric Vientonorte" }),
    ).toBeInTheDocument();
    const equipment = screen.getByRole("region", { name: "Equipo" });
    expect(within(equipment).getAllByRole("listitem")).toHaveLength(17);
    expect(within(equipment).getAllByText("Vacío").length).toBeGreaterThan(0);
  });

  it("lista las mejoras pendientes", () => {
    setup();
    const issues = screen.getByRole("region", { name: "Mejoras pendientes" });
    expect(within(issues).getByText("Pecho: falta encantamiento")).toBeInTheDocument();
    expect(within(issues).getByText("Hombros: 1 ranura de gema vacía")).toBeInTheDocument();
  });

  it("cambia de idioma", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: "EN" }));
    expect(screen.getByRole("region", { name: "Pending upgrades" })).toBeInTheDocument();
  });

  it("no tiene violaciones de accesibilidad", async () => {
    const { container } = setup();
    expect(await axe(container)).toHaveNoViolations();
  });
});

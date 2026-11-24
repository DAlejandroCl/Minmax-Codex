import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { describe, expect, it } from "vitest";
import Calculator from "./Calculator";

const total = () => screen.getByText(/Coste total estimado/).parentElement?.textContent ?? "";
const radio = (name: RegExp) => screen.getByRole("radio", { name });

describe("estrategias (H-015)", () => {
  it("muestra las cuatro estrategias con su coste y crafteos, y la más barata está elegida", async () => {
    render(<Calculator />);
    await screen.findByText(/Coste total estimado/);
    const group = screen.getByRole("group", { name: "Estrategia" });
    expect(within(group).getAllByRole("radio")).toHaveLength(4);
    expect(radio(/Más barata/)).toBeChecked();
    expect(radio(/Más barata/)).toHaveAccessibleDescription(/crafteos/);
    expect(radio(/Solo vendedor/)).toHaveAccessibleDescription(/Sin ruta/);
  });

  it("cambiar de estrategia cambia el plan sin esperar un recálculo", async () => {
    render(<Calculator />);
    await screen.findByText(/Coste total estimado/);
    const before = total();
    await userEvent.click(radio(/Menos crafteos/));
    await waitFor(() => expect(total()).not.toBe(before));
    expect(radio(/Menos crafteos/)).toBeChecked();
  });

  it("«Sin patrones de botín» quita el patrón de botín de los pasos", async () => {
    render(<Calculator />);
    await screen.findByText(/Coste total estimado/);
    expect(screen.getAllByText(/patrón de botín \(se liga al recogerlo\)/).length).toBeGreaterThan(
      0,
    );
    await userEvent.click(radio(/Sin patrones de botín/));
    await waitFor(() =>
      expect(screen.queryByText(/Cómo se obtiene: patrón de botín/)).not.toBeInTheDocument(),
    );
  });

  it("solo vendedor sin ruta explica el motivo y ofrece volver a la más barata", async () => {
    render(<Calculator />);
    await screen.findByText(/Coste total estimado/);
    await userEvent.click(radio(/Solo vendedor/));
    expect(await screen.findByText("No hay ruta posible")).toBeInTheDocument();
    expect(screen.getByText(/Con la estrategia elegida no hay ruta/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Usar la más barata" }));
    expect(await screen.findByText(/Coste total estimado/)).toBeInTheDocument();
    expect(radio(/Más barata/)).toBeChecked();
  });

  it("solo vendedor sí tiene ruta con un objetivo más bajo", async () => {
    render(<Calculator />);
    const target = screen.getByLabelText("Habilidad objetivo");
    await userEvent.clear(target);
    await userEvent.type(target, "200");
    await userEvent.click(radio(/Solo vendedor/));
    expect(await screen.findByText(/Coste total estimado/)).toBeInTheDocument();
    expect(screen.queryByText("No hay ruta posible")).not.toBeInTheDocument();
  });

  it("se puede cambiar con las flechas del teclado", async () => {
    render(<Calculator />);
    await screen.findByText(/Coste total estimado/);
    radio(/Más barata/).focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(radio(/Menos crafteos/)).toBeChecked();
    expect(radio(/Menos crafteos/)).toHaveFocus();
  });

  it("restablecer vuelve a la estrategia más barata", async () => {
    render(<Calculator />);
    await screen.findByText(/Coste total estimado/);
    await userEvent.click(radio(/Menos crafteos/));
    await userEvent.click(screen.getByRole("button", { name: "Restablecer" }));
    await waitFor(() => expect(radio(/Más barata/)).toBeChecked());
  });

  it("el selector no tiene violaciones de axe", async () => {
    const { container } = render(<Calculator />);
    await screen.findByText(/Coste total estimado/);
    expect((await axe(container)).violations).toEqual([]);
  });
});

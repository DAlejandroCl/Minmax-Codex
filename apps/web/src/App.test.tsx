import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { axe } from "vitest-axe";
import { describe, expect, it } from "vitest";
import { App } from "./App";

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

describe("rutas", () => {
  it("la portada enlaza a la calculadora y navega sin recargar", async () => {
    renderAt("/");
    expect(screen.getByRole("heading", { level: 1, name: "Minmax Codex" })).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("link", { name: "Abrir la calculadora de profesiones" }),
    );
    expect(
      await screen.findByRole("heading", { level: 1, name: "Calculadora de subida de profesión" }),
    ).toBeInTheDocument();
  });

  it("al navegar, el foco pasa al contenido principal", async () => {
    renderAt("/");
    await userEvent.click(
      screen.getByRole("link", { name: "Abrir la calculadora de profesiones" }),
    );
    await screen.findByRole("heading", { level: 1, name: "Calculadora de subida de profesión" });
    expect(document.getElementById("contenido")).toHaveFocus();
  });

  it("una ruta desconocida muestra la página 404 con salida a la portada", async () => {
    renderAt("/no-existe");
    expect(
      screen.getByRole("heading", { level: 1, name: "Página no encontrada" }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("link", { name: "Volver al inicio" }));
    expect(screen.getByRole("heading", { level: 1, name: "Minmax Codex" })).toBeInTheDocument();
  });

  it("cambiar de idioma traduce la portada y actualiza el atributo lang", async () => {
    renderAt("/");
    await userEvent.click(screen.getByRole("button", { name: "EN" }));
    expect(
      screen.getByRole("link", { name: "Open the profession calculator" }),
    ).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("en");
  });

  it("portada y 404 no tienen violaciones de axe", async () => {
    const home = renderAt("/");
    expect((await axe(home.container)).violations).toEqual([]);
    home.unmount();
    const missing = renderAt("/x");
    expect((await axe(missing.container)).violations).toEqual([]);
  });
});

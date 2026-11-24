import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { en, es, i18n } from "../../i18n";
import { ShoppingListView } from "./components/ShoppingListView";
import { useToasts } from "../toast/store";
import Calculator from "./Calculator";

const keys = (o: object, prefix = ""): string[] =>
  Object.entries(o).flatMap(([k, v]) =>
    typeof v === "object" && v !== null ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );

describe("i18n", () => {
  it("ES y EN tienen exactamente las mismas claves", () => {
    // Las claves de plural cambian de sufijo por idioma solo si difieren las categorías; aquí ambos usan _one/_other.
    expect(keys(en).sort()).toEqual(keys(es).sort());
  });
});

describe("precios con edad y override (H-017)", () => {
  it("marca el precio obsoleto y atípico y avisa en el plan", async () => {
    render(<Calculator />);
    expect(
      await screen.findByText(/precio del plan necesita revisión: Piel curada/),
    ).toBeInTheDocument();
    expect(screen.getByText("Obsoleto")).toBeInTheDocument();
    expect(screen.getByText(/Atípico: 32.6× lo habitual/)).toBeInTheDocument();
    expect(screen.getByText(/Visto hace 30 días/)).toBeInTheDocument();
  });

  it("editar el precio lo marca como manual, quita el aviso y recalcula el coste", async () => {
    render(<Calculator />);
    await screen.findByText(/precio del plan necesita revisión/);
    const total = () => screen.getByText(/Coste total estimado/).parentElement?.textContent ?? "";
    const before = total();
    const gold = screen.getByLabelText("Piel curada · Precios por unidad — Oro");
    await userEvent.clear(gold);
    await userEvent.type(gold, "1");
    await waitFor(() =>
      expect(screen.queryByText(/precio del plan necesita revisión/)).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Manual")).toBeInTheDocument();
    expect(total()).not.toBe(before);
  });

  it("restaurar vuelve al precio original y lo anuncia con un toast", async () => {
    render(<Calculator />);
    const gold = screen.getByLabelText("Piel curada · Precios por unidad — Oro");
    await userEvent.clear(gold);
    await userEvent.type(gold, "1");
    const [restore] = await screen.findAllByText("Restaurar", { selector: "button" });
    await userEvent.click(restore as HTMLElement);
    expect(await screen.findByText("Precio de Piel curada restaurado.")).toBeInTheDocument();
    expect(await screen.findByText(/precio del plan necesita revisión/)).toBeInTheDocument();
  });
});

describe("estados vacíos y de error", () => {
  it("rango inválido explica qué corregir", async () => {
    render(<Calculator />);
    const start = screen.getByLabelText("Habilidad actual");
    await userEvent.clear(start);
    await userEvent.type(start, "299");
    const target = screen.getByLabelText("Habilidad objetivo");
    await userEvent.clear(target);
    await userEvent.type(target, "10");
    expect(await screen.findByText("Revisa el rango de habilidad")).toBeInTheDocument();
  });

  it("sin ruta con solo-entrenador ofrece permitir patrones y funciona", async () => {
    render(<Calculator />);
    await userEvent.click(screen.getByLabelText(/Solo recetas de entrenador/));
    expect(await screen.findByText("No hay ruta posible")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Permitir patrones" }));
    expect(await screen.findByText(/Coste total estimado/)).toBeInTheDocument();
  });

  it("si no falta nada, la lista de compras lo dice", () => {
    const list = {
      rows: [
        {
          itemId: 1,
          name: "Hilo fino",
          source: "vendor" as const,
          needed: 2,
          owned: 2,
          missing: 0,
          unitPrice: 90,
          subtotal: 0,
        },
      ],
      total: 0,
    };
    render(
      <I18nextProvider i18n={i18n}>
        <ShoppingListView list={list} flagged={new Set()} />
      </I18nextProvider>,
    );
    expect(screen.getByText(/Ya tienes todo lo necesario/)).toBeInTheDocument();
  });
});

describe("notificaciones y teclado", () => {
  it("Escape cierra las notificaciones", async () => {
    render(<Calculator />);
    await userEvent.click(screen.getByRole("button", { name: "Restablecer" }));
    expect(await screen.findByText("Valores restablecidos.")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByText("Valores restablecidos.")).not.toBeInTheDocument(),
    );
  });

  it("el botón de cerrar tiene nombre accesible y funciona", async () => {
    render(<Calculator />);
    useToasts.getState().push("error", "Algo falló");
    const message = await screen.findByText("Algo falló");
    const toast = message.closest('[role="alert"]') as HTMLElement;
    expect(toast).not.toBeNull();
    await userEvent.click(within(toast).getByRole("button", { name: "Cerrar notificación" }));
    await waitFor(() => expect(screen.queryByText("Algo falló")).not.toBeInTheDocument());
  });

  it("el primer elemento enfocable es el enlace para saltar al contenido", async () => {
    render(<Calculator />);
    await userEvent.tab();
    expect(screen.getByRole("link", { name: "Saltar al contenido" })).toHaveFocus();
  });

  it("la página con avisos y toast no tiene violaciones de axe", async () => {
    const { container } = render(<Calculator />);
    await screen.findByText(/precio del plan necesita revisión/);
    useToasts.getState().push("success", "Hecho");
    await screen.findByText("Hecho");
    expect((await axe(container)).violations).toEqual([]);
  });
});

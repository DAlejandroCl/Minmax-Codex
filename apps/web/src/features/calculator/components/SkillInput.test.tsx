import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { SkillInput } from "./SkillInput";

function Harness() {
  const [value, setValue] = useState(148);
  return (
    <>
      <SkillInput id="s" label="Habilidad" value={value} onCommit={setValue} invalid={false} />
      <output data-testid="committed">{value}</output>
    </>
  );
}

describe("SkillInput", () => {
  it("permite borrar y reescribir sin que el valor salte", async () => {
    render(<Harness />);
    const input = screen.getByLabelText("Habilidad");
    await userEvent.clear(input);
    expect(input).toHaveValue(null); // vacío mientras se escribe
    expect(screen.getByTestId("committed")).toHaveTextContent("148"); // no se confirma un valor inválido
    await userEvent.type(input, "200");
    expect(input).toHaveValue(200);
    expect(screen.getByTestId("committed")).toHaveTextContent("200");
  });

  it("al salir del campo vacío vuelve al último valor válido", async () => {
    render(<Harness />);
    const input = screen.getByLabelText("Habilidad");
    await userEvent.clear(input);
    await userEvent.tab();
    expect(input).toHaveValue(148);
  });
});

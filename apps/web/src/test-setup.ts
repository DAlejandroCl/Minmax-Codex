import "@testing-library/jest-dom/vitest";
import * as axeMatchers from "vitest-axe/matchers";
import { cleanup } from "@testing-library/react";
import { afterEach, expect } from "vitest";

expect.extend(axeMatchers);

afterEach(async () => {
  cleanup();
  // Import diferido: así los tests pueden mockear el optimizador antes de que se cargue el store.
  const { useCalculator } = await import("./features/calculator/store");
  useCalculator.getState().reset();
});

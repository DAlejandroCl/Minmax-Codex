import "@testing-library/jest-dom/vitest";
import * as axeMatchers from "vitest-axe/matchers";
import { cleanup } from "@testing-library/react";
import { afterEach, expect } from "vitest";
import { useCalculator } from "./features/calculator/store";

expect.extend(axeMatchers);

afterEach(() => {
  cleanup();
  useCalculator.getState().reset();
});

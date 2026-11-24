import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "./i18n";
import "./styles/global.css";
import { App } from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("Falta el elemento #root en index.html");

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);

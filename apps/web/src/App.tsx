import { lazy, Suspense, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Route, Routes, useLocation } from "react-router";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";

// La calculadora arrastra el optimizador y el Worker: se carga solo al visitar su ruta.
const CalculatorPage = lazy(() => import("./pages/CalculatorPage"));

/** Al cambiar de ruta, el foco pasa al contenido para que teclado y lectores de pantalla sigan la navegación. */
function useRouteFocus(): void {
  const { pathname } = useLocation();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    document.getElementById("contenido")?.focus();
  }, [pathname]);
}

export function App() {
  const { t } = useTranslation();
  useRouteFocus();
  return (
    <Suspense
      fallback={
        <p role="status" className="p-6 text-muted">
          {t("loading")}
        </p>
      }
    >
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/calculadora" element={<CalculatorPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

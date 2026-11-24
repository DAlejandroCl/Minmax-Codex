import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import type { i18n as I18nInstance } from "i18next";
import type { Locale } from "../features/calculator/model";

export const es = {
  loading: "Cargando…",
  home: {
    pageTitle: "Minmax Codex",
    tagline:
      "Herramientas para sacar el máximo partido a tus personajes de WoW Forever, empezando por subir profesiones al menor coste.",
    navLabel: "Herramientas",
    openCalculator: "Abrir la calculadora de profesiones",
  },
  notFound: {
    pageTitle: "Página no encontrada · Minmax Codex",
    title: "Página no encontrada",
    body: "La dirección no existe o ha cambiado.",
    home: "Volver al inicio",
  },
  pageTitle: "Calculadora de profesiones · Minmax Codex",
  title: "Calculadora de subida de profesión",
  demoNotice:
    "Datos de ejemplo: las recetas, precios y umbrales de color no son oficiales ni están medidos. Edita los precios para probar.",
  form: {
    legend: "Objetivo",
    start: "Habilidad actual",
    target: "Habilidad objetivo",
    trainerOnly: "Solo recetas de entrenador (sin comprar patrones)",
    prices: "Precios por unidad",
    owned: "Ya lo tengo",
    reset: "Restablecer",
    gold: "Oro",
    silver: "Plata",
    copper: "Cobre",
    errors: {
      range: "La habilidad actual no puede superar el objetivo.",
      bounds: "Introduce valores enteros entre 1 y 300.",
    },
  },
  result: {
    heading: "Plan",
    computing: "Calculando…",
    none: "No hay ruta posible con las recetas disponibles.",
    error: "No se pudo calcular el plan.",
    total: "Coste total estimado",
    materials: "Materiales",
    recipes: "Recetas y entrenamientos",
    steps: "Pasos",
    stepTitle: "{{from}} → {{to}}: {{count}} × {{recipe}}",
    stepCost: "Materiales: {{cost}} ({{perPoint}} por punto)",
    chanceStart: "Al empezar",
    chanceEnd: "Al terminar",
    routeLabel: "Ruta de habilidad {{from}} a {{to}}",
    acquisition: "Cómo se obtiene: {{how}}",
    how: { known: "ya conocida", trainer: "entrenador ({{cost}})", pattern: "patrón ({{cost}})" },
    milestone: "Hito: {{label}} ({{cost}})",
  },
  shopping: {
    heading: "Lista de compras",
    item: "Objeto",
    source: "Origen",
    needed: "Necesario",
    have: "Tengo",
    missing: "Falta",
    price: "Precio",
    subtotal: "Subtotal",
    total: "Total",
    copy: "Copiar lista",
    copied: "Lista copiada al portapapeles.",
    copyFailed: "No se pudo copiar; selecciona el texto manualmente.",
    vendor: "Vendedor",
    auction: "Subasta",
    empty: "No hay nada que comprar.",
    tableRegion: "Tabla de la lista de compras (desplazable)",
    allOwned: "Ya tienes todo lo necesario: no hay nada que comprar.",
    flagged: "Precio por revisar",
  },
  skip: { main: "Saltar al contenido", plan: "Saltar al plan" },
  price: {
    observed_one: "Visto hace {{count}} día",
    observed_other: "Visto hace {{count}} días",
    stale: "Obsoleto",
    outlier: "Atípico: {{factor}}× lo habitual",
    manual: "Manual",
    restore: "Restaurar",
    reviewInPlan_one: "{{count}} precio del plan necesita revisión: {{names}}.",
    reviewInPlan_other: "{{count}} precios del plan necesitan revisión: {{names}}.",
    reviewHint:
      "Un precio obsoleto o atípico puede inflar mucho el coste. Compruébalo en la subasta y edítalo.",
  },
  state: {
    invalid: {
      title: "Revisa el rango de habilidad",
      body: "Corrige los valores del formulario para calcular el plan.",
    },
    none: {
      title: "No hay ruta posible",
      body: "Con las recetas disponibles no se llega a esa habilidad.",
      bodyTrainer:
        "Sin comprar patrones no se llega a esa habilidad. Permite patrones para ver una ruta.",
      allowPatterns: "Permitir patrones",
    },
    error: {
      title: "No se pudo calcular el plan",
      body: "Ocurrió un error al calcular. Puedes reintentar.",
      retry: "Reintentar",
    },
    ready: "Plan actualizado. Coste total: {{cost}}.",
  },
  toast: {
    region: "Notificaciones",
    dismiss: "Cerrar notificación",
    reset: "Valores restablecidos.",
    restored: "Precio de {{item}} restaurado.",
  },
};

export const en: typeof es = {
  loading: "Loading…",
  home: {
    pageTitle: "Minmax Codex",
    tagline:
      "Tools to get the most out of your WoW Forever characters, starting with leveling professions at the lowest cost.",
    navLabel: "Tools",
    openCalculator: "Open the profession calculator",
  },
  notFound: {
    pageTitle: "Page not found · Minmax Codex",
    title: "Page not found",
    body: "The address does not exist or has changed.",
    home: "Back to home",
  },
  pageTitle: "Profession calculator · Minmax Codex",
  title: "Profession leveling calculator",
  demoNotice:
    "Sample data: recipes, prices and color thresholds are neither official nor measured. Edit the prices to try it.",
  form: {
    legend: "Goal",
    start: "Current skill",
    target: "Target skill",
    trainerOnly: "Trainer recipes only (no purchased patterns)",
    prices: "Price per unit",
    owned: "Already owned",
    reset: "Reset",
    gold: "Gold",
    silver: "Silver",
    copper: "Copper",
    errors: {
      range: "Current skill cannot exceed the target.",
      bounds: "Enter whole numbers between 1 and 300.",
    },
  },
  result: {
    heading: "Plan",
    computing: "Calculating…",
    none: "No route is possible with the available recipes.",
    error: "The plan could not be calculated.",
    total: "Estimated total cost",
    materials: "Materials",
    recipes: "Recipes and training",
    steps: "Steps",
    stepTitle: "{{from}} → {{to}}: {{count}} × {{recipe}}",
    stepCost: "Materials: {{cost}} ({{perPoint}} per point)",
    chanceStart: "At start",
    chanceEnd: "At end",
    routeLabel: "Skill route {{from}} to {{to}}",
    acquisition: "How to get it: {{how}}",
    how: { known: "already known", trainer: "trainer ({{cost}})", pattern: "pattern ({{cost}})" },
    milestone: "Milestone: {{label}} ({{cost}})",
  },
  shopping: {
    heading: "Shopping list",
    item: "Item",
    source: "Source",
    needed: "Needed",
    have: "Owned",
    missing: "Missing",
    price: "Price",
    subtotal: "Subtotal",
    total: "Total",
    copy: "Copy list",
    copied: "List copied to the clipboard.",
    copyFailed: "Could not copy; select the text manually.",
    vendor: "Vendor",
    auction: "Auction",
    empty: "Nothing to buy.",
    tableRegion: "Shopping list table (scrollable)",
    allOwned: "You already have everything: nothing to buy.",
    flagged: "Price to review",
  },
  skip: { main: "Skip to content", plan: "Skip to plan" },
  price: {
    observed_one: "Seen {{count}} day ago",
    observed_other: "Seen {{count}} days ago",
    stale: "Stale",
    outlier: "Unusual: {{factor}}× the usual",
    manual: "Manual",
    restore: "Restore",
    reviewInPlan_one: "{{count}} price in the plan needs review: {{names}}.",
    reviewInPlan_other: "{{count}} prices in the plan need review: {{names}}.",
    reviewHint:
      "A stale or unusual price can inflate the cost a lot. Check it on the auction house and edit it.",
  },
  state: {
    invalid: {
      title: "Check the skill range",
      body: "Fix the form values to calculate the plan.",
    },
    none: {
      title: "No route available",
      body: "The available recipes cannot reach that skill.",
      bodyTrainer:
        "Without buying patterns that skill cannot be reached. Allow patterns to see a route.",
      allowPatterns: "Allow patterns",
    },
    error: {
      title: "The plan could not be calculated",
      body: "An error occurred while calculating. You can try again.",
      retry: "Try again",
    },
    ready: "Plan updated. Total cost: {{cost}}.",
  },
  toast: {
    region: "Notifications",
    dismiss: "Dismiss notification",
    reset: "Values reset.",
    restored: "{{item}} price restored.",
  },
};

export const i18n: I18nInstance = i18next.createInstance();
// Registra esta instancia como la global de react-i18next: `useTranslation` funciona sin provider en toda la app.
void i18n.use(initReactI18next).init({
  lng: "es",
  fallbackLng: "es",
  resources: { es: { translation: es }, en: { translation: en } },
  interpolation: { escapeValue: false },
  initAsync: false,
});

export const LOCALES: readonly Locale[] = ["es", "en"];

// El atributo lang del documento sigue al idioma de la interfaz (WCAG 3.1.1).
if (typeof document !== "undefined") {
  document.documentElement.lang = i18n.language;
  i18n.on("languageChanged", (lng) => {
    document.documentElement.lang = lng;
  });
}

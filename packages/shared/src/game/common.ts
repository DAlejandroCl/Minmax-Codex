import { z } from "zod";

/** ID numérico del juego: entero positivo. */
export const GameIdSchema = z.number().int().positive();

/**
 * Texto localizado tal como lo entrega la API de Battle.net: un string o un objeto por idioma
 * (`{ en_US: "…", es_MX: "…" }`). Se exige al menos un texto no vacío.
 */
export const LocalizedStringSchema = z.union([
  z.string().trim().min(1),
  z
    .record(z.string(), z.string())
    .refine((o) => Object.values(o).some((v) => v.trim().length > 0), "ningún idioma tiene texto"),
]);
export type LocalizedString = z.infer<typeof LocalizedStringSchema>;

/** Nombre normalizado: inglés siempre presente (idioma de referencia) y español si existe. */
export const NameI18nSchema = z.object({
  en: z.string().min(1),
  es: z.string().min(1).optional(),
});
export type NameI18n = z.infer<typeof NameI18nSchema>;

const firstText = (
  o: Readonly<Record<string, string>>,
  keys: readonly string[],
): string | undefined => {
  for (const k of keys) {
    const v = o[k]?.trim();
    if (v) return v;
  }
  return undefined;
};

/** Normaliza un texto localizado de la API. `null` si no hay ningún texto utilizable. */
export function toNameI18n(value: LocalizedString): NameI18n | null {
  if (typeof value === "string") return { en: value.trim() };
  const en =
    firstText(value, ["en_US", "en_GB"]) ??
    Object.values(value)
      .map((v) => v.trim())
      .find((v) => v.length > 0);
  if (en === undefined) return null;
  const es = firstText(value, ["es_MX", "es_ES"]);
  return es === undefined ? { en } : { en, es };
}

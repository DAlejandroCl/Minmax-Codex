# SP-3 · Fuente primaria de precios

**Estado:** casas, rulesets y una casa real validados con llamadas propias (2026-11-17); falta el detalle de campos y la cadencia · **Riesgos:** R-04, R-16, R-17

## 1. Pregunta
¿De dónde obtener precios de subasta fiables y frescos para la calculadora de profesiones?

## 2. Hallazgos (fuentes comunitarias, no oficiales)

| Hecho | Fuente |
|-------|--------|
| El 2026-10-28 no existía namespace de Forever para subasta | [goldbook #67](https://github.com/jkc-be/goldbook/issues/67) |
| **Battle.net empezó a servir datos de subasta de Forever el 2026-11-06** | [SDK wow-forever-sdk PR #2](https://github.com/SideQuest-Guild/wow-forever-sdk/pull/2) |
| Namespace `dynamic-forever-{region}`; índice de casas: `/data/wow/ruleset/{id}/auctions/` (**con barra final**) | Hilo del foro de Blizzard, actualización del 6-nov |
| 15 casas por ruleset (IDs 110–121 y 123–125: Alliance, Horde y Blackwater, cinco de cada) | Ídem |
| `/auctions/{casa}` devuelve subastas y *commodities*; `/auctions/{casa}/commodities` devuelve `unit_price` | Ídem |
| **El ruleset no filtra:** todos los rulesets listan las mismas casas con subastas idénticas | Ídem y SDK PR #2 |
| Casas grandes: 50–115 mil subastas, ≈ 9–10 MB por respuesta, actualización ≈ cada hora | Ídem |
| Algunas subastas son solo puja (sin `buyout`); la casa 112 viene sin campo `auctions` | Ídem |
| ≈ 43 % de los ítems de una casa de EU (652 de 1.515 ID distintos) devuelven 404 en `static-forever` | Foro, 6-nov |

Todo esto proviene de terceros sobre una API **no documentada**: puede cambiar sin aviso.

## 3. Implicaciones para el diseño

1. **La clave de mercado es la casa de subastas (facción/grupo), no el ruleset.** `price_snapshot.market` pasa a `auction_house_id` (+ región). Se corrige el modelo de [05](../05-modelo-de-dominio-y-datos.md) cuando se apruebe ADR-013.
2. **Volumen real (medido en una casa):** una casa trae ≈ 96.000 subastas y ≈ 5.300 ítems distintos (más que los ≈ 1.500 del informe comunitario). Si las demás casas se parecen (no verificado), una lectura de las 15 casas son ≈ 1,4 millones de subastas y ≈ 140 MB de JSON; guardar un precio por (casa, ítem, hora) serían ≈ 80.000 filas/lectura y ≈ 1,9 millones/día. El límite gratuito de 500 MB se agota en pocos días → **la política de ADR-012 sigue siendo necesaria** y debe reducirse a "último estado por (casa, ítem) + agregados diarios". Además, solo importan los ≈ 2.700 ítems de recetas, no los 5.300: filtrar al ingerir reduce el volumen a la mitad.
3. **Ingesta:** un job horario descarga 15 casas (hasta ≈ 150 MB/h) y reduce a (ítem, casa) → mínimo, mediana y cantidad. Debe ejecutarse en GitHub Actions, no en funciones (límite de 4,5 MB por petición/respuesta en Vercel Functions).
4. **Nombres de ítems incompletos:** la capa de presentación debe tolerar ítems sin nombre (mostrar ID y marcar "sin resolver").
5. **Términos de la API:** límite de retención y de uso (ver [SP-07](SP-07-legal.md)) condicionan qué se puede guardar y por cuánto tiempo.

## 4. Fuentes de respaldo
Escaneos in-game de usuarios (addon) y override manual (RF-PRI-03) siguen siendo necesarios si Blizzard retira o limita la API.

## 5. Recomendación
Adoptar **API oficial como fuente primaria de precios** (propuesta ADR-013), con override manual y escaneo por addon como respaldo.

## 6. Resultados de la sonda propia (2026-11-17, región `us`)

| Hecho verificado | Detalle |
|------------------|---------|
| Índice de rulesets | 200; ids **1, 2, 3 y 15** (cuatro, no tres como suponían las notas comunitarias) |
| Índice de casas del ruleset 2 | 200 con la barra final; **15 casas**: ids 110–121 y 123–125 (sin 122) |
| Reparto | 5 «Alliance Auction House» (110, 111, 112, 119, 123), 5 «Horde» (113, 114, 115, 120, 124) y 5 «Blackwater» (116, 117, 118, 121, 125) |

### Comparación de rulesets y una casa real (2026-11-17)

| Hecho verificado | Detalle |
|------------------|---------|
| Índice de casas por ruleset | Los rulesets 1, 2, 3 y 15 responden 200 y listan **15 casas con el mismo reparto** (5 Alliance, 5 Horde, 5 Blackwater) |
| Casa 110 (ruleset 2) | 200; ≈ 9,5 MB de JSON (se transfiere con gzip); **96.465 subastas** y **5.295 ítems distintos** |
| Cabeceras | `Last-Modified: 21:25:03 GMT`, `Cache-Control: public, max-age=86400`, `Content-Encoding: gzip` |
| Cadencia | Dos descargas con 12 min de diferencia devolvieron el **mismo** `Last-Modified`: los datos no cambiaron en ese lapso. `max-age=86400` es una pista de caché, no la frecuencia de actualización |

### Forma de una subasta en `/auctions/{casa}` (casa 110, 96.465 entradas)

| Campo | Presente en | Observación |
|-------|------------:|-------------|
| `id`, `item.id`, `quantity`, `time_left` | 96.465 (todas) | `quantity` vale **siempre 1**; `time_left` visto: `MEDIUM`, `LONG` (el resto de valores sin verificar) |
| `buyout` | 96.463 | Entero en **cobre** (mín. 100, máx. 111.112.976): encaja con ADR-006 |
| `bid` | 362 | Solo 362 subastas lo traen; 2 no tienen `buyout` (solo puja) |
| `item.bonus_lists`, `item.context`, `item.modifiers` | 23.494 / 23.010 / 16.343 | Variantes de ítem (equipo con bonos); un mismo `item.id` puede tener precios muy distintos según estos campos |

Conclusiones y consecuencias:

- Este endpoint trae **publicaciones individuales** (cantidad 1). Los materiales apilables (paños, hierbas, minerales) probablemente están en **`/commodities`**, que en un informe comunitario trae `unit_price`; **no lo hemos probado**. Sin él, los precios de reactivos podrían faltar: es la siguiente medición (`probe auction --commodities`, que además calcula qué porcentaje de los reactivos de recetas tiene publicación).
- El precio de un ítem debe calcularse como el mínimo de `buyout` **filtrando por variante** (sin `bonus_lists`/`modifiers`) para productos comunes; para equipo con bonos hace falta un criterio aparte (fuera del MVP).
- Las subastas solo-puja (`buyout` ausente) se ignoran para el costo.

Sigue **sin verificar**: que las subastas sean idénticas entre rulesets (solo se comparó el índice de casas), la cadencia real (repetir cada hora), los demás valores de `time_left`, y `/commodities`.

## 7. Cómo validarlo

```bash
git pull && pnpm install
pnpm --filter @wow-forever/api-probe probe auction --compare --house=110
```

Descarga el índice de casas de los 4 rulesets y **una** casa (≈ 10 MB, guardada en `out/`). `auction-summary.json` incluye: forma de la respuesta, campos y rangos numéricos, nº de subastas e ítems distintos, y las cabeceras `Last-Modified`/`Date`/`Cache-Control` (sirven para estimar la cadencia). Para medir la cadencia, repite la llamada con una hora de diferencia y compara `Last-Modified`.

Criterio de salida: forma de la subasta documentada, identidad de casas entre rulesets confirmada o refutada, y cadencia medida.

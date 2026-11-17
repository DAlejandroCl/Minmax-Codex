# SP-3 · Fuente primaria de precios

**Estado:** índice de casas validado con llamadas propias (2026-11-17); falta descargar una casa y comparar rulesets · **Riesgos:** R-04, R-16, R-17

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
2. **Volumen real:** ≈ 1.500 ítems distintos por casa × 15 casas × 24 lecturas/día ≈ 540.000 filas/día si se guardara cada observación (estimación con una sola muestra; validar). Con ~60 B/fila serían ≈ 32 MB/día: el límite gratuito de 500 MB se agota en ≈ 2 semanas → **la política de ADR-012 sigue siendo necesaria** y debe reducirse a "último estado por (casa, ítem) + agregados diarios".
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

Sigue **sin verificar por nosotros**: tamaño y forma de una casa, campos de cada subasta (`buyout`, `unit_price`, `time_left`), si `/commodities` existe, cadencia de actualización, y si los rulesets 1, 3 y 15 listan las mismas casas (la afirmación «el ruleset no filtra» solo está respaldada por informes).

## 7. Cómo validarlo

```bash
git pull && pnpm install
pnpm --filter @wow-forever/api-probe probe auction --compare --house=110
```

Descarga el índice de casas de los 4 rulesets y **una** casa (≈ 10 MB, guardada en `out/`). `auction-summary.json` incluye: forma de la respuesta, campos y rangos numéricos, nº de subastas e ítems distintos, y las cabeceras `Last-Modified`/`Date`/`Cache-Control` (sirven para estimar la cadencia). Para medir la cadencia, repite la llamada con una hora de diferencia y compara `Last-Modified`.

Criterio de salida: forma de la subasta documentada, identidad de casas entre rulesets confirmada o refutada, y cadencia medida.

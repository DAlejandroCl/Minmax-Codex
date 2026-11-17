# SP-3 · Fuente primaria de precios

**Estado:** investigado (sin validar con llamadas propias) · **Fecha:** 2026-11-16 · **Riesgos:** R-04, R-16, R-17

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

## 6. Cómo validarlo
`pnpm --filter @wow-forever/api-probe probe` prueba el índice de rulesets y el de casas (no descarga las casas completas). Criterio de salida: respuesta 200 del índice de casas con tus credenciales y confirmación de 15 casas.

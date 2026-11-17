# SP-1 · Datos estáticos del juego

**Estado:** sonda básica ejecutada (2026-11-17); catálogo completo pendiente · **Riesgos:** R-02, R-03, R-10, R-17, R-18

## 1. Qué cambió
La propuesta original era extraer datos de archivos del cliente. Desde el lanzamiento, `static-forever-{region}` sirve datos del juego y se puede fijar por versión. Si cubre recetas, es la vía más simple y la de menor riesgo legal ([SP-07](SP-07-legal.md)).

## 2. Resultados de la sonda básica (2026-11-17, región `us`)

Respuestas reales con credenciales propias (19 de 20 llamadas dieron 200).

| Hecho verificado | Detalle |
|------------------|---------|
| Namespace fijado a build | `static-1.60.1_70399-forever-us` aparece en los enlaces de las respuestas: se puede versionar por build (ADR-005) |
| Profesiones | 12 reales: Tailoring (197), Cooking (185), Leatherworking (165), Skinning (393), Enchanting (333), Mining (186), Blacksmithing (164), Engineering (202), Fishing (356), Alchemy (171), Herbalism (182), First Aid (129). Más `Test Profession [DNT]` (2933), que se excluye |
| Skill tiers | Tailoring: tier 2948 «1–75» con 17 categorías y **471 recetas**. Hay que recorrer **todos** los tiers de cada profesión |
| Forma de la receta | `id`, `name`, `media`, `crafted_item{id,name}`, `reagents[{reagent{id,name}, quantity}]`, `crafted_quantity{value}` |
| Categoría «SEASON OF DISCOVERY» | Existe con 54 recetas en Tailoring; **hay que comprobar en el juego** si están disponibles en Forever |

Lo que **no** demuestra: `item/720` dio 404, pero era un ID arbitrario elegido por mí, no evidencia de cobertura.

## 3. Hueco principal (R-18)

La receta de ejemplo (Bolt of Linen Cloth, 2359) **no incluye**:

- umbrales de dificultad (naranja/amarillo/verde/gris),
- habilidad mínima requerida,
- fuente de obtención (entrenador, vendedor, subasta, drop, reputación).

El «tier» tampoco sirve de sustituto: «1–75» agrupa 471 recetas, así que no indica el nivel de cada una. Con esta forma de datos:

- no se puede calcular `p(s,r)` (probabilidad de subir skill) solo con la API ([SP-04](SP-04-skillup.md));
- no se puede modelar *dónde comprar el pattern* ni su precio fijo, base del optimizador (ADR-010).

**Alcance de la conclusión:** es una sola receta. La sonda `catalog` baja todas y lista cada campo que aparece (`recipeKeys` en `catalog-summary.json`). Hasta entonces R-18 es una hipótesis fuerte, no un hecho.

## 4. Siguiente medición

```bash
git pull
pnpm install
pnpm --filter @wow-forever/api-probe probe catalog --limit=20   # prueba corta
pnpm --filter @wow-forever/api-probe probe catalog              # ≈ 2.500 recetas, unos 10–15 min
pnpm --filter @wow-forever/api-probe probe items                # cobertura de ítems (404)
```

Ambos modos son secuenciales (≥ 200 ms entre llamadas) y **reanudables**: si se interrumpen, al repetirlos retoman lo ya descargado. Comparte `out/catalog/catalog-summary.json` y `out/catalog/items-summary.json` (no contienen credenciales).

| # | Pregunta | Dónde se ve |
|---|----------|-------------|
| 1 | ¿Algún tier o receta trae umbrales, habilidad mínima o fuentes? | `recipeKeys`, `tierKeys` |
| 2 | ¿Cuántas recetas únicas hay y cómo se reparten por profesión? | `uniqueRecipes`, `recipesPerProfession` |
| 3 | ¿Hay recetas que aparecen en varias profesiones o sin reactivos/producto? | `recipesInSeveralProfessions`, `recipesWithoutReagents`, `recipesWithoutCraftedItem` |
| 4 | ¿Qué porcentaje de reactivos y productos da 404 en `item/{id}`? | `items-summary.json` → `reagents`, `crafted` |
| 5 | ¿Los ítems traen precio de venta a vendedor, nivel requerido u otros campos útiles? | `itemKeys` |
| 6 | ¿Existen endpoints de NPC/vendedor/zona? | Pendiente; probar con `--path` |

## 5. Árbol de decisión

- **El catálogo trae umbrales y fuentes** → ETL sobre `static-forever`; R-18 se cierra.
- **Faltan umbrales** → SP-4: medirlos en el juego (muestreo por receta) o curar una tabla editorial verificada.
- **Faltan fuentes de obtención** → curación editorial con nivel de confianza (R-10); consulta a Blizzard sobre campos futuros.
- **Alta tasa de 404 en reactivos** → el optimizador debe tolerar ítems sin nombre y completar desde otra fuente (curación o addon).
- **Extraer del cliente** → solo después de leer el EULA ([SP-07](SP-07-legal.md)); no recomendado mientras la API alcance.
- **La API cambia o se restringe** → los artefactos por build ya generados siguen sirviéndose; se revisa ADR-005.

## 6. Criterios de salida
- Catálogo completo descargado y campos disponibles documentados.
- Cobertura de ítems medida y plan para los huecos.
- Dataset de 1–2 profesiones generado por un ETL reproducible y 20 recetas verificadas contra el juego o una base comunitaria.

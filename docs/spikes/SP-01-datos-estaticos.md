# SP-1 · Datos estáticos del juego

**Estado:** reorientado, pendiente de ejecución · **Riesgos:** R-02, R-03, R-10, R-17

## 1. Qué cambió
La propuesta original era extraer datos de archivos del cliente. Desde el lanzamiento, `static-forever-{region}` sirve datos del juego (clases, razas, ítems, profesiones, misiones) y se puede fijar por versión (`static-1.60.1_70399-forever-{region}`), según informes comunitarios. Si cubre recetas, es la vía más simple y la de menor riesgo legal ([SP-07](SP-07-legal.md)).

## 2. Preguntas que debe responder la sonda

| # | Pregunta | Dónde se ve |
|---|----------|-------------|
| 1 | ¿`/data/wow/profession/index` lista las profesiones de Forever? ¿Cuántas? | `static-profession-index.json` |
| 2 | ¿Los niveles de habilidad (*skill tiers*) listan todas las recetas? | `static-skill-tier-*.json` |
| 3 | ¿`/data/wow/recipe/{id}` trae **reactivos y cantidades**? | `static-recipe-*.json` |
| 4 | ¿Aparecen los **umbrales de color** (naranja/amarillo/verde/gris) o la habilidad mínima? | Ídem |
| 5 | ¿Hay **fuente de obtención** (entrenador, vendedor, subasta, drop, reputación)? | Ídem |
| 6 | ¿Cuántos ítems devuelven 404 (informes: ≈ 43 % en una casa de subastas)? | `static-item-720.json` + prueba ampliada |
| 7 | ¿Existen NPCs/vendedores y zonas? | Pendiente de endpoint |

## 3. Procedimiento
1. Crea un cliente en [develop.battle.net](https://develop.battle.net/access/clients) y copia `.env.example` a `.env` con tus credenciales (el archivo está en `.gitignore`).
2. `pnpm install && pnpm --filter @wow-forever/api-probe probe -- --max-recipes=10`
3. Revisa `tools/api-probe/out/<fecha>/_summary.json` (códigos HTTP, claves de primer nivel) y los JSON guardados.
4. Comparte conmigo el contenido de `_summary.json` y un `static-recipe-*.json` (sin credenciales; la sonda no los guarda) para completar este informe.
5. Borra `tools/api-probe/out/` al terminar (retención de datos de la API, ver SP-07).

## 4. Criterios de salida
- Dataset de 1–2 profesiones (recetas, reactivos, umbrales/skill mínimo, fuentes) generado por un ETL reproducible.
- 20 recetas verificadas manualmente contra el juego o una base comunitaria.
- Lista de huecos de la API (fuentes de obtención, NPCs, ítems 404) y su plan de cobertura (curación editorial, otra fuente o addon).

## 5. Árbol de decisión
- **La API cubre recetas, reactivos y umbrales** → ETL sobre `static-forever` (sin archivos del cliente).
- **Faltan umbrales de color** → SP-4 los mide en el juego o se infieren de la habilidad mínima.
- **Faltan fuentes de obtención** → curación editorial verificada en el juego (R-10), marcando la confianza.
- **La API cambia o se restringe** → artefactos por build ya generados siguen sirviéndose; se revisa ADR-005.

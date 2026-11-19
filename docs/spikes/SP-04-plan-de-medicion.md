# SP-4 · Plan de medición in-game

**Estado:** listo para ejecutar · **Responsable:** Diego (juego) + Claude (análisis) · **Spike:** [SP-04](SP-04-skillup.md) · **Riesgos:** R-13, R-14, R-18, R-19

## 1. Objetivo
Obtener, **sin extraer datos del cliente** (ver [SP-08](SP-08-skillup-forever.md)), los parámetros que la API no da:

| # | Dato | Para qué | Hipótesis |
|---|------|----------|-----------|
| M1 | Habilidad en la que cada receta cambia de color | Umbrales amarillo/verde/gris del optimizador | H1 (el requisito del patrón = naranja), H2 (regla fija de offsets) |
| M2 | Probabilidad `p` de subir por color y tramo | `p(s, r)` del modelo ADR-010 | `p = (gris − s)/(gris − amarillo)` |
| M3 | Recetas que enseña cada entrenador (habilidad y costo) | Cubrir las 696 recetas sin patrón | — |
| M4 | Patrones que venden los NPC (y a qué precio) | Fuente de cada patrón (R-18) | — |

**Ya sabemos** (API): reactivos, ítem fabricado y, para 1.797 de 2.493 recetas, la habilidad mínima del patrón (`recipe-requirements.json`).

## 2. Reglas de la medición
- Solo observación manual en el juego y anotación propia: sin leer archivos del cliente ni usar datos de terceros.
- Una profesión de referencia primero (**la que ya estés subiendo**) para no gastar materiales extra; luego ampliar.
- Todo dato lleva fecha y build del juego (`1.60.1` hoy); un parche invalida lo anterior (R-03/R-14).
- Los CSV se guardan en `tools/measure/data/` y se versionan (son observaciones propias).

## 3. M1 · Umbrales de color (H1 y H2)
**Qué anotar** (`templates/colors.csv`): para cada receta elegida, el color que muestra la ventana de profesión a una habilidad dada.

1. Elige **15–20 recetas con patrón** de `recipe-requirements.json`, con requisitos distintos (bajo, medio y alto del tramo actual).
2. Cada vez que tu habilidad suba **5 puntos** (o al abrir la ventana tras subir una tanda), anota el color de esas recetas. Con un mismo personaje se obtiene toda la curva al subir.
3. `analyze colors` devuelve, por receta, el intervalo donde cambia a amarillo, verde y gris y su distancia al requisito.

**Resultado:** H1 se acepta si el naranja coincide con `req_skill`; H2 se acepta si los offsets (amarillo − req, verde − req, gris − req) son constantes o dependen solo de una variable conocida. Si no, los umbrales se miden receta por receta.
**Esfuerzo:** ninguno extra: solo mirar la ventana mientras subes (≈ 5 min por profesión).

## 4. M2 · Probabilidad de skill-up
**Qué anotar** (`templates/crafts.csv`): tandas de crafteos **sin cambio de color**: habilidad inicial, color, crafteos y puntos ganados.

- Usa la receta **más barata** de cada color (consultar la sonda de precios) y crafteos en tandas de 10–20 para no cruzar umbrales.
- Celdas y tamaño de muestra (95 %; ver SP-04 §3):

| Celda | Color | Tramo | Mínimo (±0,15) | Recomendado (±0,10) |
|-------|-------|-------|---------------:|--------------------:|
| 1 | amarillo | 1–75 | 43 | 97 |
| 2 | verde | 1–75 | 43 | 97 |
| 3 | amarillo | 76–150 | 43 | 97 |
| 4 | verde | 76–150 | 43 | 97 |
| 5 | naranja (control, debe dar ≈ 100 %) | cualquiera | 20 | 20 |
| 6 | gris (control, debe dar ≈ 0 %) | cualquiera | 20 | 20 |

**Total:** ≈ 210 crafteos (mínimo) a ≈ 430 (recomendado). Los crafteos que de todas formas haces para subir cuentan: basta anotarlos.
**Análisis:** `analyze crafts` da `p̂`, su intervalo de Wilson y los crafteos por punto (`1/p̂`). Se contrasta con la fórmula una vez medidos los umbrales (M1). Si el intervalo de una celda excluye la predicción, la fórmula no vale para Forever y se usa la `p̂` empírica por tramo.
**Nota:** dentro de un color `p` varía con la habilidad; por eso se registra la habilidad inicial y se agrupa por tramo.

## 5. M3 · Entrenadores y M4 · Vendedores
- **M3** (`templates/trainers.csv`): al visitar un entrenador, abre su lista y anota receta, habilidad requerida y costo. Cubre recetas sin patrón y el costo de aprenderlas.
- **M4** (`templates/vendors.csv`): al ver un vendedor de patrones, anota patrón y precio. Cada fila resuelve la «fuente» de un patrón de los 1.834 de la API.
- Prioridad: profesiones que vas a subir y tiendas de tu zona; no hace falta recorrer el mundo.

## 6. Orden de ejecución
1. **Hoy/mañana:** M1 con tu profesión actual (sin costo extra).
2. **Mientras subes:** M2, anotando las tandas por color.
3. **Al pasar por un NPC:** M3 y M4.
4. **Cada fin de semana:** me pasas los CSV (pegados o adjuntos); corro `analyze`, actualizo SP-04 y ajusto los parámetros del optimizador.

## 7. Criterios de salida
- H1 y H2 aceptadas o rechazadas con datos de ≥ 15 recetas (M1).
- `p̂` con semiancho ≤ 0,15 en las celdas 1–4 y controles coherentes (M2).
- Tabla de entrenadores para al menos las profesiones medidas (M3).
- Decisión documentada: reglas de umbrales (o tabla por receta) y `p(color, tramo)`.

## 8. Riesgos
| Riesgo | Mitigación |
|--------|-----------|
| Tandas que cruzan el cambio de color | Tandas cortas; anotar el color antes de cada tanda |
| Sesgo por pocas recetas | Recetas de distinto requisito y profesión |
| Parche que cambia los valores | Fecha y build en cada fila; repetir una celda tras un parche |
| Muestra pequeña | Reportar siempre el intervalo, nunca solo `p̂` |

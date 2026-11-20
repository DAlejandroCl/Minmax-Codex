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

## 1b. Hallazgos del catálogo generado (2026-11-19)
Con `recipes.csv` (2.493 recetas):
- **287 recetas están en la categoría «SEASON OF DISCOVERY»** (Leatherworking 80, Blacksmithing 66, Tailoring 54, Enchanting 37, Engineering 28, Alchemy 15, Cooking 7). 134 tienen patrón; 153 no.
- **65 de las 66 parejas de recetas con el mismo nombre** son una variante SoD y la clásica (p. ej. *Lesser Arcane Elixir*: id 50023 SoD, req 190, y id 54549, req 120). Por eso **los CSV de medición usan `recipe_id`** además del nombre: el nombre solo es ambiguo.
- Las 696 recetas sin patrón se reparten así: 153 SoD y 543 clásicas (candidatas a entrenador, M3).
- 180 recetas de Enchanting no tienen ítem fabricado (son encantamientos): es esperado, no un error.
- **Decisión del product owner (2026-11-20): el ámbito excluye las recetas de Season of Discovery**; solo se incluyen las clásicas y las nuevas exclusivas de Forever. `build-csv` las filtra por la categoría «SEASON OF DISCOVERY» y las guarda en `data/excluded.csv` para auditoría (`--include-sod` las recupera). Resultado esperado: 2.206 recetas (2.493 − 287), 543 sin patrón y 1.663 con habilidad mínima; 133 patrones solo-SoD salen de `vendors.csv`.
- Límite del criterio: depende de que la API etiquete así a todas las recetas SoD. Si en el juego aparece una receta SoD fuera de esa categoría, se añade a la lista de exclusión (`EXCLUDED_CATEGORIES`) o por id.

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

## 9. Referencia externa: ruta de SkillUp (2026-11-20)
El product owner transcribió la ruta que calcula SkillUp para Leatherworking 148→300 (`tools/measure/reference/skillup-route-leatherworking-148.csv`):

| Tramo | Crafteos | Receta | Crafteos/punto |
|-------|---------:|--------|---------------:|
| 148–155 | 13 | Hillman's Cloak | 1,86 |
| 155–165 | 10 | Barbaric Shoulders | 1,00 |
| 165–195 | 36 | Barbaric Harness | 1,20 |
| 195–196 | 1 | Nightscape Headband | 1,00 |
| 196–197 | 4 | Barbaric Harness | 4,00 |
| 197–210 | 19 | Nightscape Headband | 1,46 |
| 210–240 | 48 | Nightscape Pants | 1,60 |
| 240–274 | 85 | Wicked Leather Gauntlets | 2,50 |
| 274–290 | 34 | Green Dragonscale Gauntlets | 2,13 |
| 290–300 | 10 | Blue Dragonscale Leggings | 1,00 |

(155: 10× Cured Heavy Hide es un material intermedio, no cuenta para la habilidad.) Total ≈ 260 crafteos para 152 puntos.

**Cómo se usa.** Son valores *calculados* por el addon con datos del cliente, no observados; por eso sirven como **prueba de validación** del optimizador (criterio de SP-05: igualar una guía publicada) y no como fuente del dataset (R-19, SP-07). Con `expectedCrafts` (Σ 1/p) se compara tramo a tramo cuando haya umbrales medidos.

**Qué no se puede deducir.** Cada tramo da una ecuación con dos incógnitas por receta (amarillo y gris). Ejemplo: *Wicked Leather Gauntlets* (requisito 235) da 85 crafteos en 240–274, que encajan con varias parejas (amarillo = req y gris = req + 45; o amarillo = req + 15 y gris = req + 40). Hace falta medir el color en el juego (M1) para fijarlos; la ruta sirve de contraste.

**Lecturas útiles ya.** Barbaric Shoulders da 1,0 crafteos/punto en 155–165 (naranja en todo el tramo); *Barbaric Harness* cuesta 4 crafteos por el punto 196→197 (casi gris) y SkillUp cambia a *Nightscape Headband* en ese punto, lo que confirma que el optimizador cambia de receta cuando `p` cae.

### 9b. Lo que muestran las capturas de SkillUp (2026-11-20)
Pantalla de Leatherworking, habilidad 148/225, objetivo 300: la ruta completa está en `reference/skillup-route-steps-leatherworking-148.csv` y los reactivos en `reference/skillup-route-reagents-leatherworking-148.csv`.

- **Rangos de profesión como pasos de la ruta.** SkillUp incluye «Train Artisan at 200» (5 oro) y los segmentos «Expert 150–225» y «Artisan 225–300». El optimizador necesita modelar el **entrenamiento de rango** (habilidad y, en el juego clásico, nivel de personaje mínimo; no verificado en Forever) como coste y requisito, no solo los crafteos (RN-04).
- **Entrenar cada receta tiene coste** («Train Barbaric Shoulders», «Train Nightscape Pants»…) y los patrones comprables aparecen como paso («Buy Pattern: Wicked Leather Gauntlets», ≈ 1 oro 8 plata). Es el dato M3/M4 que buscamos; se puede verificar en el entrenador.
- **Requisito de estación**: *Blue Dragonscale Leggings* se fabrica «at Sewing Machine». La API de recetas no trae ningún campo de ese tipo (nuevo hueco de R-18); hay que confirmar en el juego qué recetas lo exigen.
- **Origen de reactivos**: SkillUp marca cada reactivo como `vendor` o `AH` (Fine/Silken/Rune Thread y Salt de vendedor; Black Dye y Heavy Leather de subasta). Con el catálogo de la API podemos comprobar los totales: Σ (crafteos × cantidad por receta) debe dar 126 Fine Thread, 232 Silken Thread, 173 Rune Thread, 85 Black Dye, 30 Salt y 705 Heavy Leather.
- **Costes**: el coste total que muestra («Needs 2795 oro») usa precios de Auctionator del usuario, por lo que no son comparables con otra casa de subastas. La ruta más cara son los tramos 274–300 (≈ 2.500 oro de 2.795).

### 9c. Validación del catálogo contra SkillUp (2026-11-20)
`verify-route` calculó los reactivos de la ruta con las recetas de la API (crafteos de SkillUp × cantidad por receta, descontando los intermedios) y **coincidió exactamente en los 6 reactivos visibles** (Fine Thread 126, Salt 30, Silken Thread 232, Rune Thread 173, Black Dye 85, Heavy Leather 705; diferencia 0).

- **Conclusión:** los ids de receta, los reactivos y sus cantidades del catálogo de la API son correctos para estas 9 recetas, y los crafteos por tramo de SkillUp son coherentes con ellos. Es evidencia fuerte para R-18 (reactivos) y un caso de prueba para `packages/optimizer`.
- **No cubierto:** la ventana de SkillUp muestra solo los primeros 6 reactivos (hay más abajo). El catálogo añade Heavy Hide 10, Iron Buckle 40, Thick Leather 772, Rugged Leather 1.640, Green Dragonscale 1.020, Cured Rugged Hide 54 y Blue Dragonscale 360; falta una captura con el resto de la lista para comprobarlos.
- **Sigue abierto:** los umbrales de color (M1) y las probabilidades (M2): esta validación confirma recetas y cantidades, no `p`.

### 9d. Lista de compras completa: 13 de 13 reactivos coinciden (2026-11-20)
Con las capturas de la lista de compras de SkillUp (`reference/skillup-route-reagents-leatherworking-148.csv`), **los 13 reactivos de la ruta coinciden con el catálogo** que calculó `verify-route`: los 6 anteriores más Heavy Hide 10, Thick Leather 772, Iron Buckle 40, Rugged Leather 1.640, Cured Rugged Hide 54, Green Dragonscale 1.020 y Blue Dragonscale 360. Quedan validadas las recetas, cantidades y crafteos de la ruta completa 148→300.

**Qué enseñan los precios** (Auctionator del usuario, total 2.780 oro):

| Reactivo | Cantidad que falta | Coste | Parte del total |
|----------|-------------------:|------:|----------------:|
| Cured Rugged Hide | 54 | 2.025 oro (37,5 oro c/u) | 73 % |
| Rugged Leather | 1.639 | 266 oro | 10 % |
| Blue Dragonscale | 360 | 252 oro | 9 % |
| Green Dragonscale | 1.020 | 81 oro 50 plata | 3 % |
| Resto (9 reactivos) | — | ≈ 76 oro | 3 % |

- **Oportunidad para el optimizador:** el 73 % del coste es comprar *Cured Rugged Hide* en la subasta. Existe una receta de entrenador «Cured Rugged Hide» (está entre las 543 sin patrón), así que habría que comprobar si fabricarla con materiales más baratos reduce el coste. Es justo lo que SkillUp no parece valorar (no hay precio de la materia prima en su lista) y lo que nuestra guía debe resolver con el precio de cada intermedio y con detección de precios atípicos (R-04).
- **Origen de cada reactivo:** SkillUp separa «Vendor» (Fine/Silken/Rune Thread, Salt) de «Auction house» (el resto), y exporta una lista para Auctionator. Nuestra guía debería producir un listado equivalente.
- **Casa de subastas:** los precios son de su reino y de su casa; los nuestros salen de la API por casa de subastas (SP-03), por lo que no serán idénticos.

### 9e. Receta de Cured Rugged Hide (2026-11-20)
`recipe-info` sobre el catálogo: receta **#10756 «Cured Rugged Hide»** (Leatherworking, categoría Reagents, sin patrón → entrenador): **1 Rugged Hide + 1 Refined Deeprock Salt → 2 Cured Rugged Hide**.

- La ruta necesita 54 → **27 crafteos** = 27 Rugged Hide + 27 Refined Deeprock Salt.
- Comprar cuesta 37,5 oro c/u = **75 oro por crafteo** (2 unidades). Fabricar compensa si `precio(Rugged Hide) + precio(Refined Deeprock Salt) < 75 oro`. Ejemplo ilustrativo (no medido): con 5 + 10 oro por crafteo, 27 crafteos cuestan 405 oro y la ruta bajaría de 2.780 a ≈ 1.160 oro.
- Falta: precio de ambos materiales en la casa de subastas del usuario (y si el Rugged Hide se puede conseguir despellejando, ya que el usuario sube Skinning) y la habilidad requerida de la receta (no está en la API: es de entrenador, M3).

### 9f. Precios reales: la hipótesis de fabricar era errónea; el problema es un precio desactualizado (2026-11-20)
Precios observados por el usuario (`reference/prices-observed-2026-11-20.csv`): Rugged Hide 5 plata, Refined Deeprock Salt 63 oro, **Cured Rugged Hide 1 oro 15 plata**.

| Opción para 54 Cured Rugged Hide | Coste |
|----------------------------------|------:|
| Precio usado por SkillUp (37,5 oro c/u) | 2.025 oro |
| Comprar al precio actual (1,15 oro c/u) | **62,1 oro** |
| Fabricar (27 crafteos × (0,05 + 63) oro) | 1.701 oro |

- **Corrección de lo dicho en 9e:** fabricar *no* compensa (el Refined Deeprock Salt cuesta 63 oro). La oportunidad no era fabricar, sino que **SkillUp usó un precio obsoleto** (la propia pantalla avisa «rescan to update old prices»).
- **Efecto:** el coste de la ruta pasa de ≈ 2.780 a **≈ 817 oro** (2.780,1 − 2.025 + 62,1), una reducción del 71 %, solo por actualizar un precio.
- **Requisitos que se derivan para nuestra guía:**
  1. Mostrar la **antigüedad** de cada precio y avisar cuando un precio se aparta mucho del resto (R-04).
  2. Calcular el coste de comprar N unidades recorriendo las ofertas (profundidad del mercado), no solo el precio mínimo: 54 unidades a 1,15 oro supone que existan 54 ofertas a ese precio. Esto no está medido; la API de subastas (SP-03) entrega todas las ofertas por casa y permite calcularlo.
  3. Comparar siempre **comprar vs fabricar** cada intermedio con precios vigentes y elegir el más barato.

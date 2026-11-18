# SP-1 · Datos estáticos del juego

**Estado:** catálogo y cobertura de ítems medidos (2026-11-17); decisión sobre umbrales y fuentes pendiente · **Riesgos:** R-02, R-03, R-10, R-17, R-18

## 1. Qué cambió
La propuesta original era extraer datos de archivos del cliente. Desde el lanzamiento, `static-forever-{region}` sirve datos del juego y se puede fijar por versión. Es la vía más simple y la de menor riesgo legal ([SP-07](SP-07-legal.md)), pero **no cubre todo lo que necesita el optimizador** (ver §3).

## 2. Resultados medidos (región `us`, 2026-11-17)

### 2.1 Catálogo completo (`probe catalog`)

| Hecho verificado | Detalle |
|------------------|---------|
| Namespace fijado a build | `static-1.60.1_70399-forever-us` aparece en los enlaces: se puede versionar por build (ADR-005) |
| Profesiones | 12 reales: Tailoring (197), Cooking (185), Leatherworking (165), Skinning (393), Enchanting (333), Mining (186), Blacksmithing (164), Engineering (202), Fishing (356), Alchemy (171), Herbalism (182), First Aid (129). `Test Profession [DNT]` (2933) se excluye |
| Skill tiers | **Un solo tier por profesión**, que lista todas sus recetas (Tailoring: «1–75», 471 recetas). El tier no indica el nivel de cada receta |
| Recetas | **2.493 únicas**, todas descargadas, 0 fallos |
| Reactivos | 8.419 líneas de reactivo (`reagent` + `quantity`) en 2.493 recetas; todas las recetas traen `reagents` |
| Producto | `crafted_item` en 2.310 de 2.493; las otras 183 no producen un ítem (p. ej. encantamientos). `crafted_quantity.value` en 2.484; `minimum`/`maximum` en 9 recetas |
| Otros campos | `description` en 300 recetas; `rank` en 210 recetas, **todas con valor 1** (muestras: IDs altos, p. ej. 52639 «Fish Bowl», con `description` «Craft a …» y productos de ID ≥ 279960; parecen recetas nuevas de Forever). Con un único valor no sirve, por ahora, para ordenar nada; podría tener sentido cuando se abran más rangos; `media`, `_links` |

### 2.2 Cobertura de ítems (`probe items`)

2.703 ítems distintos (reactivos y productos de todas las recetas).

| Grupo | Total | 404 | % |
|-------|------:|----:|--:|
| Reactivos | 589 | 22 | **3,7 %** |
| Productos | 2.301 | 328 | **14,3 %** |

(Algunos ítems son a la vez reactivo y producto, por eso la suma supera 2.703.)

- La cifra comunitaria de ≈ 43 % de 404 se refería a **todos los ítems de una casa de subastas**; para los ítems de recetas la cobertura es mucho mejor, y para reactivos casi total.
- Los ítems que sí responden (2.358) traen: `name`, `level`, `required_level`, `quality`, `item_class`, `item_subclass`, `inventory_type`, `is_stackable`, `max_count`, **`purchase_price`**, **`purchase_quantity`** y **`sell_price`**. `sell_price` es el precio de venta a vendedor (sirve para el valor de recuperación). `purchase_price` es el precio de compra del ítem, pero **no demuestra que un NPC lo venda** (corregido el 2026-11-17; ver [SP-03](SP-03-precios.md)); tampoco indican qué vendedor ni dónde.
- Los 404 incluyen IDs nuevos (≥ 210000) y varios antiguos; los productos sin ítem deben mostrarse como «sin resolver».

## 3. Hueco principal (R-18, **parcialmente cubierto** por los patrones: ver §3b, «Medición 3»)

En las 2.493 recetas **no aparece** ningún campo de:

- umbrales de dificultad (naranja/amarillo/verde/gris),
- habilidad mínima o nivel requerido para aprender,
- fuente de obtención (entrenador, vendedor, subasta, drop, reputación).

Consecuencias:

- No se puede calcular `p(s,r)` con la API sola ([SP-04](SP-04-skillup.md)).
- No se puede saber dónde se compra un pattern ni su precio fijo, base del optimizador (ADR-010). `purchase_price` del ítem pattern, si existe, da el precio pero no la fuente.
- El orden de las recetas dentro de una profesión no está en los datos: hay que reconstruirlo.

Límites de esta conclusión: además de profesión, tier, receta e ítem se exploraron 37 endpoints candidatos (ver §3b). No apareció ningún endpoint de NPC, vendedor, entrenador ni zona con datos visibles, pero hay una vía indirecta para los patterns (ítems de tipo receta).

## 3b. Cobertura por feature (`probe discover`, 2026-11-17, región `us`)

Resultado por estado HTTP; el contenido de cada detalle falta por inspeccionar.

| Feature | Endpoint | Resultado |
|---------|----------|-----------|
| Clases y talentos | `playable-class/index` | 200, **9 clases** (+ detalle) |
| | `playable-specialization/index` | 200, **27 especializaciones** (+ detalle) |
| | `playable-race/index` | 200, 10 razas |
| | `power-type/index` | 200, 6 tipos |
| | `talent-tree/index` | 200, **27 árboles de talentos** (`spec_talent_trees`) |
| | `talent/index` | 200, **652 talentos** (+ detalle) |
| | `pvp-talent/index` | 200 sin lista detectada |
| | `spell/{id}` | 404 con un ID de receta (el ID de receta no coincide con el de hechizo) |
| BiS y fuentes | `item-set/index` | 200, **163 sets** |
| | `item-class/index` | 200, 13 clases de ítem |
| | `reputation-faction/index`, `reputation-tiers/index` | 200, 56 facciones y 1 tabla de rangos |
| | `creature-family`, `creature-type` | 200, 27 y 13 |
| | `journal-expansion`, `journal-instance`, `journal-encounter`, `quest` | 200 **sin lista detectada** (vacíos o con otra forma) |
| | `quest-category`, `quest-area` | 404 |
| | `item/{id}` | 200; trae `appearances` y `preview_item` |
| Patterns y vendedores | `search/item?name.en_US=Pattern` | 200, **100 resultados** (tamaño de página) |
| | `search/spell?name.en_US=Bolt` | 200, 3 resultados |
| | `search/creature`, `search/journal-encounter` | 200 **sin resultados visibles** |
| | `search/recipe` | 404 |
| Armory (medios) | `media/item/{id}`, `media/profession/{id}` | 200 (`assets`) |
| | `media/spell/{id}` | 404 |
| Otros | `region`, `connected-realm`, `pvp-season` (estático y dinámico), `token` | 404: coherente con la ausencia de reinos |

Lectura:

- **Talentos:** hay datos para construir árboles por especialización (27 árboles, 652 talentos).
- **BiS:** hay sets de ítems y reputaciones, pero **no hay tablas de botín** (diario de instancias y jefes sin contenido visible). La lista BiS seguirá siendo editorial.
- **Patterns:** no hay NPC ni vendedores (el diario y `search/creature` devuelven vacío). Sí hay **ítems de clase «Recipe» (id 9)**: el primer resultado de `search/item` fue «Pattern: Fine Leather Boots» (subclase = profesión, `purchase_price` 100, nivel 15). Como el nombre contiene el de la receta, se pueden enlazar por nombre (`probe patterns`); esto da el precio del patrón en subasta, pero **no dónde se aprende**.
  - **Medición 1 (2026-11-17):** 1.000 ítems de clase 9 (cifra sospechosamente redonda: igual al tamaño de página, `pageCount` = 1; se repite pidiendo páginas adicionales). Por subclase: Leatherworking 184, Blacksmithing 174, Tailoring 165, Book 132, Enchanting 97, Engineering 88, Alchemy 81, Cooking 72, First Aid 6, Fishing 1. Prefijos: Pattern 349, Plans 170, Recipe 152, Formula 96, Schematic 92. «Book» (tomos, librams, grimorios) no enseña recetas de profesión.
  - **Enlace por nombre:** 839 de 1.000 se enlazaron con una receta del catálogo (844 de 2.493 recetas, 34 %); 50 son ambiguos. Los no enlazados incluyen libros y nombres con distinta puntuación (p. ej. «Recipe: Transmute Iron to Gold» frente a «Transmute: Iron to Gold»); el enlace se mejoró ignorando la puntuación.
  - **Lectura provisional:** solo ≈ un tercio de las recetas tiene un ítem-patrón; el resto se aprende por otra vía (entrenador, misión o conocida de inicio), que la API no distingue.
  - **Medición 2 (2026-11-17):** la búsqueda **está limitada a 1.000 resultados** (`resultCountCapped: true`; la página 2 llega vacía), así que los 1.000 ítems eran un tope, no el total. Sin los 132 libros quedan 868 patrones de profesión, de los que **852 enlazan con una receta** (857 de 2.493 recetas, 34 %); 16 no enlazan, entre ellos varios «Recipe: Elixir of …» y «Schematic: …» cuyo nombre no coincide con el de la receta del catálogo. Las cifras son parciales hasta consultar por subclase.
  - **`preview_item` no viene en la búsqueda** (`previewKeys` vacío), solo en `item/{id}`. `probe patterns` ahora consulta por subclase (para sortear el tope) y, con `--details`, pide el detalle de cada patrón.
  - **Medición 3 (2026-11-17, consulta por subclase + detalle de cada patrón):** ninguna subclase llegó al tope. Hay **1.972 ítems de clase «Recipe»**, de los que 138 son libros y **1.834 son patrones de profesión** (Leatherworking 485, Blacksmithing 377, Tailoring 356, Enchanting 172, Engineering 167, Alchemy 139, Cooking 118, First Aid 17, Fishing 3). Se descargó el detalle de los 1.834 sin fallos.
    - **Habilidad mínima: el 100 % de los patrones trae `requirements.skill`** con profesión, `level` y texto («Requires Leatherworking (65)» para «Pattern: Fine Leather Boots»). Distribución por tramo de 25: 1–25: 19 · 26–50: 58 · 51–75: 97 · 76–100: 116 · 101–125: 112 · 126–150: 116 · 151–175: 123 · 176–200: 137 · 201–225: 169 · 226–250: 186 · 251–275: 203 · **276–300: 498**.
    - **Otros requisitos:** 184 patrones exigen reputación (facción y nivel), 118 exigen una habilidad previa (`requirements.ability`), 969 tienen ligadura (`binding`). El `preview_item` incluye además el ítem fabricado y sus reactivos (`recipe`, en 1.678) y el hechizo que enseña (`spells`, en 201: fórmulas de encantamiento).
    - **Enlace con recetas:** 1.784 de 1.834 enlazan por nombre; **1.788 de 2.493 recetas (≈ 72 %) tienen un patrón**. Los 50 sin enlazar son ítems nuevos de Forever (IDs ≥ 251735, p. ej. «Pattern: Beastculler's Adaptive Vest») cuyo nombre no coincide con el de la receta. Se añadió el enlace por **id del ítem fabricado** (`recipe.item.item.id`), más fiable que el nombre.
    - **Consecuencia para R-18:** para ≈ 72 % de las recetas ya hay **habilidad mínima** de forma oficial. Siguen sin dato: los umbrales amarillo/verde/gris, **dónde se obtiene cada patrón** y la habilidad de las ≈ 705 recetas sin patrón (entrenador u otra vía). Hipótesis por validar en SP-4: la habilidad del patrón equivale al umbral naranja de la receta.
- **Diario y criaturas:** `journal-expansion`, `journal-instance`, `journal-encounter` y `pvp-talent` devuelven solo `_links`; `search/creature` y `search/journal-encounter` devuelven una página sin resultados. No hay datos de jefes, instancias ni criaturas.
- **Misiones:** `quest/index` trae las claves `categories`, `areas` y `types`; las rutas `quest-category` y `quest-area` que probé daban 404 porque en la API van como `quest/category/index` y similares (por probar).
- **Iconos:** `media/item` entrega `assets`; antes de usarlos revisa la política de contenido ([SP-07](SP-07-legal.md)).

## 4. Opciones para cubrir el hueco

| Opción | Cubre | Costo / riesgo |
|--------|-------|----------------|
| A. Medición en el juego (SP-4): muestreo de skill-ups por receta y nivel | Umbrales | Trabajo manual repetitivo; resultado propio y legítimo |
| B. Curación editorial con nivel de confianza (R-10) | Fuentes de patterns, entrenadores | Esfuerzo humano; auditable |
| C. Guías y bases comunitarias como referencia de contraste (no como fuente copiada) | Validación | Licencias y exactitud variables |
| D. Consultar a Blizzard por campos faltantes | Todo | Sin garantía de respuesta |
| E. Extraer del cliente | Todo | **Solo tras leer el EULA** ([SP-07](SP-07-legal.md)); no recomendado mientras haya alternativas |
| F. Explorar más endpoints (`--path`) | Posible fuente | Barato; probar antes de invertir en A/B |

Recomendación provisional: **F primero** (barato), luego **A + B** combinadas, con **D** en paralelo. Mientras tanto el MVP puede entregar: costo de materiales por receta con precios de subasta y de vendedor, sin ruta de subida optimizada por probabilidad.

## 5. Árbol de decisión

- **F encuentra campos de dificultad/fuentes** → ETL sobre la API; R-18 se cierra.
- **F no encuentra nada** → A + B; el optimizador usa una tabla propia versionada con confianza por dato.
- **Blizzard añade campos** → la tabla propia se valida contra ellos.
- **La API cambia o se restringe** → los artefactos por build ya generados siguen sirviéndose; se revisa ADR-005.

## 6. Pendiente
- Vigilar `rank`: hoy es siempre 1 (210 recetas); revisar tras cada parche si aparecen otros valores.
- Probar endpoints adicionales (NPC, vendedor, zona, spell) con `--path`.
- Dataset de 1–2 profesiones generado por un ETL reproducible y 20 recetas verificadas contra el juego.

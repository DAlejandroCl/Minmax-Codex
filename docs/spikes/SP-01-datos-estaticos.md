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
| Otros campos | `description` en 300 recetas; `rank` en 210 (las tres primeras muestras son recetas de IDs altos, p. ej. 52639 «Fish Bowl», con `rank: 1` y una `description` «Craft a …», y producen ítems de ID ≥ 279960; parecen recetas nuevas de Forever con rangos, pero la distribución de valores no está medida); `media`, `_links` |

### 2.2 Cobertura de ítems (`probe items`)

2.703 ítems distintos (reactivos y productos de todas las recetas).

| Grupo | Total | 404 | % |
|-------|------:|----:|--:|
| Reactivos | 589 | 22 | **3,7 %** |
| Productos | 2.301 | 328 | **14,3 %** |

(Algunos ítems son a la vez reactivo y producto, por eso la suma supera 2.703.)

- La cifra comunitaria de ≈ 43 % de 404 se refería a **todos los ítems de una casa de subastas**; para los ítems de recetas la cobertura es mucho mejor, y para reactivos casi total.
- Los ítems que sí responden (2.358) traen: `name`, `level`, `required_level`, `quality`, `item_class`, `item_subclass`, `inventory_type`, `is_stackable`, `max_count`, **`purchase_price`**, **`purchase_quantity`** y **`sell_price`**. `purchase_price` es el precio de compra a vendedor (cuando existe) y `sell_price` el de venta a vendedor: sirven para el valor de recuperación y para reactivos de vendedor. No indican **qué** vendedor ni dónde.
- Los 404 incluyen IDs nuevos (≥ 210000) y varios antiguos; los productos sin ítem deben mostrarse como «sin resolver».

## 3. Hueco principal (R-18, confirmado para estos endpoints)

En las 2.493 recetas **no aparece** ningún campo de:

- umbrales de dificultad (naranja/amarillo/verde/gris),
- habilidad mínima o nivel requerido para aprender,
- fuente de obtención (entrenador, vendedor, subasta, drop, reputación).

Consecuencias:

- No se puede calcular `p(s,r)` con la API sola ([SP-04](SP-04-skillup.md)).
- No se puede saber dónde se compra un pattern ni su precio fijo, base del optimizador (ADR-010). `purchase_price` del ítem pattern, si existe, da el precio pero no la fuente.
- El orden de las recetas dentro de una profesión no está en los datos: hay que reconstruirlo.

Límites de esta conclusión: se probaron los endpoints de profesión, tier, receta e ítem. **No** se probaron otros posibles (NPC, vendedor, zona, spell, búsqueda), que podrían existir sin estar en los índices que conocemos.

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
- Medir la distribución de `rank` y confirmar si distingue rangos de una misma receta o si son recetas nuevas de Forever.
- Probar endpoints adicionales (NPC, vendedor, zona, spell) con `--path`.
- Dataset de 1–2 profesiones generado por un ETL reproducible y 20 recetas verificadas contra el juego.

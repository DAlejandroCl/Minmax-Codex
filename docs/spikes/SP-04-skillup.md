# SP-4 · Probabilidad de skill-up por color de dificultad

**Estado:** guía actualizada con los datos de la API (2026-11-18); requiere medición en el juego · **Riesgos:** R-13, R-14, R-18

## 1. Pregunta
¿Cuál es `p(s, r)` (probabilidad de ganar un punto al craftear la receta `r` con habilidad `s`) para cada color, y de dónde salen los umbrales de color y la habilidad de las recetas de entrenador?

## 2. Qué se sabe y qué no

**Se sabe**
- RN-04: habilidad 1–300 con rangos 75/150/225/300.
- La API estática **no expone umbrales de color en ninguna receta** ([SP-01](SP-01-datos-estaticos.md) §3).
- Los ítems-patrón sí traen la **habilidad mínima** (`requirements.skill.level`): 1.797 de 2.493 recetas (72,1 %) tienen ese dato, incluidos ejemplos como «Fine Leather Boots» = 65. Mining (2 de 17), First Aid (16 de 32) y Engineering (168 de 275) son las más incompletas.

**Hipótesis por validar**
- H1. La habilidad del patrón equivale al umbral **naranja** de la receta (por validación contra el color observado en el juego).
- H2. Los umbrales amarillo, verde y gris se pueden derivar de la habilidad mínima con una regla fija, o hay que medirlos receta por receta.

**No verificado**
- Los valores de `p` para amarillo y verde en Forever.
- La habilidad de las 696 recetas sin patrón (entrenador u otra vía).

El optimizador trata `p` y los umbrales como **parámetros configurables** (ADR-010), por lo que este spike calibra datos, no código.

## 3. Método A: muestreo manual (probabilidad `p`)
1. Elige recetas baratas que estén en amarillo y verde para tu habilidad actual (y alguna naranja de control).
2. Crafteas la misma receta N veces **sin cambiar de color** y registras si subió o no la habilidad.
3. Anota en una tabla:

| Fecha | Profesión | Receta | Habilidad inicial | Color | Crafteos | Subidas |
|-------|-----------|--------|-------------------|-------|----------|---------|

4. Estima `p̂ = subidas / crafteos` por color y por tramo de habilidad.

**Tamaño de muestra:** para un intervalo de ±0,10 al 95 % con `p ≈ 0,5` hacen falta ≈ 96 crafteos por celda (`n = 1,96² · 0,25 / 0,10²`). Con ±0,15 bastan ≈ 43. Agrupa por color si no hay tiempo de muestrear por tramo.

## 4. Método B: validar umbrales con el color observado (H1 y H2)
Con una profesión en el juego, en la ventana de profesión cada receta se muestra con su color para tu habilidad actual.

1. Elige 10–20 recetas **con patrón** (habilidad mínima conocida por la API, ver `recipe-requirements.json`) de rangos distintos.
2. Anota, para cada receta, tu habilidad y el color que muestra.
3. Contrasta con H1: una receta con requisito `R` debe verse naranja cuando tu habilidad es `R` (o muy cerca) y cambiar de color al subir.
4. Anota las habilidades en las que cambia a amarillo, verde y gris. Con 10–20 recetas se puede comprobar si la distancia entre umbrales sigue una regla fija (H2).

Resultado esperado: una regla `umbrales(R)` o la constancia de que hay que medir receta por receta.

## 5. Método C (propuesta): addon de recolección
Un addon propio (complemento del ADR-013) que, con un clic, vuelque a `SavedVariables`:

- **Color de cada receta** a la habilidad actual del personaje (permite acotar umbrales con muchos personajes y niveles).
- **Lista del entrenador**: habilidad requerida y costo de cada receta que enseña (cubre las recetas sin patrón).
- **Inventario de vendedores**: qué patterns venden y a qué precio (cubre la «fuente» de cada patrón).

Se importaría con el flujo de archivos ya previsto (ADR-002/011). **Por verificar antes de invertir:** qué funciones del cliente de Forever 1.60.1 exponen estos datos (en la beta los addons usan APIs modernas con respaldo a las clásicas), y que el uso esté permitido por la política de addons de Blizzard.

## 6. Criterios de salida
- Función `p(color)` (o `p(color, tramo)`) documentada con su intervalo de confianza.
- H1 y H2 confirmadas o refutadas, con la regla de umbrales o la decisión de medirlos por receta.
- Plan para la habilidad de las recetas sin patrón y para la fuente de los patrones (Método C o curación manual).
- Comparación con al menos una guía publicada de costo/crafteos para una profesión.

## 7. Uso posterior
Los valores se cargan como datos versionados por build (RN-01) y alimentan los tests de `packages/optimizer` (H-013/H-014).

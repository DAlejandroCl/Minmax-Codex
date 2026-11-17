# SP-4 · Probabilidad de skill-up por color de dificultad

**Estado:** guía lista, requiere medición en el juego · **Riesgos:** R-13, R-14

## 1. Pregunta
¿Cuál es `p(s, r)` (probabilidad de ganar un punto al craftear la receta `r` con habilidad `s`) para cada color, y de dónde salen los umbrales de color?

## 2. Qué se sabe y qué no
- Se sabe (RN-04): habilidad 1–300 con rangos 75/150/225/300.
- **No verificado:** los valores de `p` para amarillo y verde en Forever, ni si la API de recetas expone los umbrales (se comprueba en SP-1). El optimizador trata `p` como **parámetro configurable** (ADR-010), por lo que este spike calibra datos, no código.

## 3. Método de muestreo
1. Elige recetas baratas que estén en amarillo y verde para tu habilidad actual (y alguna naranja de control).
2. Crafteas la misma receta N veces **sin cambiar de color** y registras si subió o no la habilidad.
3. Anota en una tabla:

| Fecha | Profesión | Receta | Habilidad inicial | Color | Crafteos | Subidas |
|-------|-----------|--------|-------------------|-------|----------|---------|

4. Estima `p̂ = subidas / crafteos` por color y por tramo de habilidad.

**Tamaño de muestra:** para un intervalo de ±0,10 al 95 % con `p ≈ 0,5` hacen falta ≈ 96 crafteos por celda (`n = 1,96² · 0,25 / 0,10²`). Con ±0,15 bastan ≈ 43. Agrupa por color si no hay tiempo de muestrear por tramo.

## 4. Criterios de salida
- Función `p(color)` (o `p(color, tramo)`) documentada con su intervalo de confianza.
- Confirmación de si el color depende de umbrales por receta (API o tooltip) y de dónde se leen.
- Comparación con al menos una guía publicada de costo/crafteos para una profesión.

## 5. Uso posterior
Los valores se cargan como datos versionados por build (RN-01) y alimentan los tests de `packages/optimizer` (H-013/H-014).

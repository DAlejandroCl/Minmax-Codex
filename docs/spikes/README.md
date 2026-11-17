# Spikes de la Fase 0

> Última actualización: **2026-11-17**. Cada spike convierte un supuesto en un hecho y termina con un informe y una decisión. Los criterios de salida vienen de [07 §4](../07-fuentes-de-datos-y-viabilidad.md).

| ID | Pregunta | Estado | Documento | Siguiente paso |
|----|----------|--------|-----------|----------------|
| SP-1 | ¿Cómo obtener datos estáticos de forma reproducible y legítima? | **Medido**: 2.493 recetas con reactivos y 3,7 % de reactivos en 404; sin umbrales ni fuentes en ninguna (R-18 confirmado) | [SP-01](SP-01-datos-estaticos.md) | Probar más endpoints; decidir cómo cubrir el hueco (SP-4 + curación) |
| SP-2 | ¿Qué cubre la API de personajes y qué solo un addon? | **Reorientado** | [SP-02](SP-02-personajes-api-vs-addon.md) | Comparar API vs addon con un personaje real |
| SP-3 | ¿Cuál es la fuente primaria de precios? | **Casi validado**: 4 rulesets × 15 casas; casa real con 96.465 publicaciones y 84.286 de commodities; 78,6 % de los reactivos de recetas con precio en una casa | [SP-03](SP-03-precios.md) | Medir cadencia cada hora y cobertura en otras casas; decidir ADR-013 |
| SP-4 | ¿Cómo se calcula el skill-up por color? | **Guía lista** (requiere medición en el juego) | [SP-04](SP-04-skillup.md) | Muestreo in-game |
| SP-5 | ¿El optimizador iguala/mejora guías publicadas? | **Bloqueado** por SP-1 y SP-4 | — | — |
| SP-6 | ¿Astro + islas o SPA? | Pendiente | — | Prototipo de una página de entidad + calculadora |
| SP-7 | Legal: términos y política de contenido | **Revisión parcial**: Términos de la API leídos; faltan EULA y política de fan content | [SP-07](SP-07-legal.md) | Confirmaciones con Blizzard |

## Cambio de situación (2026-11-16)

La premisa de [07](../07-fuentes-de-datos-y-viabilidad.md) y de ADR-002 ("no hay API pública para Forever") quedó **desactualizada**: desde el 5–7 de noviembre la API de Battle.net sirve datos estáticos, perfiles de personaje y subastas de Forever, aunque **sin documentación oficial**. Esto afecta a SP-1, SP-2 y SP-3 y motiva la propuesta [ADR-013](../11-justificacion-de-decisiones-de-ingenieria.md#adr-013--api-first-con-addon-como-complemento-propuesta), **pendiente de tu aprobación**.

## Herramienta

`tools/api-probe/` ejecuta una sonda secuencial y de bajo volumen contra la API (ver su cabecera). Requiere credenciales de [develop.battle.net](https://develop.battle.net/access/clients) en `.env` (ignorado por git).

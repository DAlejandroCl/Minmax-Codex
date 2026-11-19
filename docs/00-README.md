# Wiki Forever — Documentación de planificación (SDLC)

> **Estado:** v0.2 (MVP y ADRs aprobados) · **Fecha:** 2026-11-16 · **Autor:** Diego (DevACL) · **Fase SDLC:** 0–1 (Descubrimiento y Análisis)
> Nombre de trabajo: **Wiki Forever** (puede cambiar).

Web app fullstack e interactiva para **World of Warcraft: Forever**: armory conectado a tus personajes, profesiones, talentos, listas BiS y guía de subida de profesiones al **menor costo posible**, con la meta a largo plazo de convertirse en una **wiki por clase** orientada al *min-maxing*.

## Índice

| # | Documento | Qué responde |
|---|-----------|--------------|
| 01 | [Visión y alcance](01-vision-y-alcance.md) | ¿Qué construimos, para quién, qué entra y qué no? |
| 02 | [Stakeholders y personas](02-stakeholders-y-personas.md) | ¿Quién usa y quién decide? |
| 03 | [Requerimientos](03-requerimientos.md) | RF, RNF, reglas de negocio, restricciones, trazabilidad |
| 04 | [Casos de uso](04-casos-de-uso.md) | Actores, catálogo y especificaciones detalladas |
| 05 | [Modelo de dominio y datos](05-modelo-de-dominio-y-datos.md) | Entidades, ER, algoritmos centrales |
| 06 | [Arquitectura y ADRs](06-arquitectura.md) | Stack, contenedores, decisiones de diseño |
| 07 | [Fuentes de datos y viabilidad](07-fuentes-de-datos-y-viabilidad.md) | ¿De dónde salen los datos? ¿Es viable? Spikes |
| 08 | [Riesgos](08-riesgos.md) | Registro de riesgos y mitigaciones |
| 09 | [Roadmap y backlog](09-roadmap-y-backlog.md) | Fases, épicas, historias iniciales |
| 10 | [Calidad y DevOps](10-calidad-y-devops.md) | Testing, CI/CD, Definition of Done |
| 11 | [Justificación de decisiones de ingeniería](11-justificacion-de-decisiones-de-ingenieria.md) | ¿Por qué cada decisión? Alternativas, trade-offs, condiciones de revisión |
| — | [Spikes de la Fase 0](spikes/README.md) | Informes y guías de SP-1…SP-7 |

## Convenciones

- **IDs**: `RF-<MÓDULO>-NN` (funcional), `RNF-NN` (no funcional), `RN-NN` (regla de negocio), `CU-NN` (caso de uso), `R-NN` (riesgo), `ADR-NNN` (decisión de arquitectura).
- **Prioridad**: MoSCoW (Must / Should / Could / Won't *por ahora*).
- **Release**: `MVP`, `R2`, `R3`, `R4`, `R5` (ver [09](09-roadmap-y-backlog.md)).
- Las cifras marcadas como *propuesta* o *estimación* deben validarse en los spikes de la Fase 0.
- Diagramas en **Mermaid** (se renderizan en GitHub).

## Hallazgo clave que condiciona todo el plan

> **Actualizado en Fase 0 (2026-11-16):** la versión inicial de este documento decía que no existía API de Blizzard para Forever. **Ya existe**, aunque sin documentación oficial: datos estáticos, perfiles de personaje y subastas (desde el 5–7 de noviembre). Ver [07](07-fuentes-de-datos-y-viabilidad.md), los [spikes](spikes/README.md) y el ADR-013 (aceptado el 2026-11-18).

La API de Forever es **no documentada** y sus Términos limitan la retención de datos y la monetización ([SP-07](spikes/SP-07-legal.md)). Por eso el plan:

1. entrega valor **sin necesidad de conectar personajes** desde el MVP (calculadora de profesiones y base de datos),
2. propone **API-first con addon como complemento y respaldo** (ADR-013, aceptado el 2026-11-18; reemplaza parcialmente a ADR-002), y
3. aísla la API tras una capa con contratos probados, porque puede cambiar sin aviso.

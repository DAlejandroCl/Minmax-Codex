# 07 · Fuentes de datos y viabilidad

> Investigación realizada el **2026-11-16**. WoW Forever lleva ~12 días en el mercado: **todo lo de esta página debe re-verificarse** antes de tomar decisiones irreversibles.

## 1. Resumen ejecutivo

| Necesidad | Fuente candidata | Estado | Veredicto |
|-----------|------------------|--------|-----------|
| Recetas, ítems, trainers, umbrales de skill | Datos extraídos del cliente (build 1.60.1) | Otros sitios ya lo hacen; método y licitud por confirmar | **Viable, pendiente SP-1/SP-7** |
| Personajes (equipo, talentos, profesiones) | Addons exportadores + `SavedVariables` | Existen (Forever Armory, WFA Armory Exporter, ForeverDB Uploader) | **Viable (ADR-002)** |
| Personajes vía API de Blizzard | Battle.net Profile API | Sin evidencia de espacio de nombres para Forever | **No viable hoy; vigilar** |
| Precios de subasta oficial | Battle.net Auction House API | Un proyecto comprobó el 2026-10-28 que no existía namespace de Forever; podría llegar sin listados, como en otras versiones | **No viable hoy; vigilar** |
| Precios de subasta alternativos | Escaneos in-game de usuarios; feeds comunitarios | Ya usado por herramientas existentes | **Viable, calidad variable (SP-3)** |
| BiS / talentos recomendados | Curación editorial + datos de loot | Contenido humano necesario | **Viable, esfuerzo editorial** |

## 2. Hallazgos por tema

### 2.1 El juego
- Lanzamiento el 4 de noviembre de 2026; versión de cliente 1.60.1; nivel máximo 60; incluido con la suscripción de WoW.
- **Rulesets** (Normal, PvP, Roleplaying) reemplazan la elección tradicional de reino. Sin embargo, listados de la beta mostraban reinos con nombres propios: **confirmar cuál es la clave de mercado real** (ruleset, región, reino) antes de modelar `market`.
- Instalación del cliente en carpeta tipo `_classic_beta_` (según notas de un addon); los addons usan APIs modernas (`C_QuestLog`, `C_Item`…) con *fallback* a las clásicas.
- Los personajes requieren **nombre y apellido** (relevante para `character`).

### 2.2 Profesiones
- Fuentes públicas reportan 12–13 profesiones (9 primarias, secundarias incluidas Cooking, First Aid, Fishing), skill máximo 300 con cuatro rangos, y entre ~2.100 y ~2.500 recetas con **cientos nuevas** (884–945 según la fuente). **Las cifras no coinciden**: usar el dataset propio como verdad y reportar discrepancias.
- Existen patterns BoP y vendors "Merchant's Favor"; no toda receta se desbloquea con el rango (patrones, fórmulas, reputación).
- Algunas guías comunitarias admiten que fuentes de trainer/vendor son *"assumed until seen"*: **la validación in-game es parte del trabajo**.
- Competencia directa ya existe (bases de datos de recetas, calculadoras con precios de subasta, guías 1–300). Ver diferenciación en [01 §5](01-vision-y-alcance.md).

### 2.3 Personajes
- Addons como *Forever Armory* y *WFA Armory Exporter* exportan equipo, stats, talentos y transmog; *ForeverDB* ofrece uploader y código de compartición; los datos se escriben al salir del juego o con `/reload`.
- Hay un *bug* conocido del cargador de `SavedVariables` en la beta que afecta a algunos addons: tratar el formato de datos como inestable.

### 2.4 Subasta / precios
- La API de Blizzard para otras versiones expone subastas por reino conectado y *commodities* con actualización periódica (inicialmente horaria). Para Forever **no se encontró** espacio de nombres equivalente a fecha de investigación.
- Otras versiones del juego sirven un índice de subasta sin listados: es posible que Forever se comporte igual.

## 3. Estrategia de datos

1. **Estático (build)**: ETL desde datos del cliente → validación → artefactos por build.
2. **Personajes**: importación por archivo de addon (ADR-002).
3. **Precios**: modelo multi-fuente con prioridad (oficial > escaneo reciente > comunitario > manual) y **siempre** mostrando edad y origen.
4. **Editorial**: BiS, talentos y guías como contenido versionado con autores y fecha.

## 4. Spikes de la Fase 0

| ID | Pregunta | Entregable | Criterio de salida |
|----|----------|-----------|--------------------|
| SP-1 | ¿Cómo obtener datos estáticos de forma reproducible y legítima? | Dataset de 1–2 profesiones (recetas, reactivos, fuentes, umbrales) + script ETL | 20 recetas verificadas manualmente contra el juego/DB comunitaria |
| SP-2 | ¿Qué exporta un addon en 1.60.1 y en qué formato? | Formato `v1` documentado + archivo real de un PJ + parser | Equipo + talentos + profesiones de 1 PJ parseados y validados |
| SP-3 | ¿Cuál es la fuente primaria de precios? | Informe de opciones + recheck del namespace Battle.net | Decisión documentada con fuente y frecuencia de actualización |
| SP-4 | ¿Cómo se calcula el skill-up por color en Forever? | Función `p(s,r)` y su validación | Error < umbral acordado frente a muestreo in-game o guías |
| SP-5 | ¿El optimizador iguala/mejora guías publicadas? | Prototipo `planProfession` para 2 profesiones | Costo ≤ guía de referencia en ≥ 80 % de casos |
| SP-6 | ¿Astro + islas o SPA? | Prototipo de 1 página de entidad + calculadora | LCP, SEO y complejidad medidos |
| SP-7 | Legal: términos de Blizzard, uso de datos/iconos/marcas, política de contenido de fans | Checklist de cumplimiento | Aprobado antes de publicar |

## 5. Vigilancia continua

- Re-verificar semanalmente si aparece espacio de nombres de Forever en la API de Battle.net (Game Data y Profile).
- Seguir cambios de formato de addons exportadores y del cliente tras cada parche.

## Referencias consultadas (2026-11-16)

- [Mobalytics — WoW Forever explicado](https://mobalytics.gg/wow-forever/guides/wow-forever-explained)
- [Wikipedia — World of Warcraft: Forever](https://en.wikipedia.org/wiki/World_of_Warcraft:_Forever)
- [Warcraft Wiki — World of Warcraft: Forever](https://warcraft.wiki.gg/wiki/World_of_Warcraft:_Forever)
- [Zockify — WoW Forever (rulesets, lanzamiento)](https://www.zockify.com/forever/)
- [CurseForge — Forever Armory](https://www.curseforge.com/wow/addons/forever-armory)
- [CurseForge — WFA Armory Exporter](https://www.curseforge.com/wow/addons/wfa-armory-exporter)
- [ForeverDB — Armory](https://foreverdb.net/armory)
- [GitHub — goldbook issue #67 (Auction API para Forever)](https://github.com/jkc-be/goldbook/issues/67)
- [Battle.net — Game Data APIs (Classic)](https://community.developer.battle.net/documentation/world-of-warcraft-classic/game-data-apis)
- [GitHub — StoryTracker (notas de compatibilidad 1.60)](https://github.com/ninepointlabs/wow-storytracker-addon/releases)
- [GitHub — ForeverSVFix (bug de SavedVariables)](https://github.com/nobewayo/ForeverSVFix/releases)
- [Metabot — Profesiones de WoW Forever](https://metabot.gg/en/wow-forever/professions)
- [RankedBoost — Profesiones de WoW Forever](https://rankedboost.com/world-of-warcraft/forever/professions/)
- [Timesaver — Calculadora de profesiones](https://timesaver.gg/tools/wow-forever/professions)
- [Conquest Capped — Base de datos de recetas](https://conquestcapped.com/guides/wow-forever/wow-forever-recipes/)

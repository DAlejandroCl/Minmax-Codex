# 01 · Visión y alcance

## 1. Contexto

World of Warcraft: Forever es una rama permanente de WoW ambientada en el primer año del juego original, con nivel máximo 60, nuevas zonas, quests, mazmorras y recetas. Lanzó el **4 de noviembre de 2026** (cliente 1.60.1 al momento de investigar). Mantiene profesiones con habilidad 1–300 en cuatro rangos (Apprentice 75, Journeyman 150, Expert 225, Artisan 300) y añade cientos de recetas nuevas; las cifras exactas varían según la fuente (≈2.100–2.500 recetas totales).

Es un juego nuevo, con datos en movimiento (parches, beta recién terminada) y un ecosistema de herramientas en formación. Esa combinación es a la vez **oportunidad** (mercado sin dominador claro) y **riesgo** (datos inestables, sin API oficial).

## 2. Problema

Los jugadores que quieren optimizar su personaje deben saltar entre muchas webs y addons: una para guías de profesiones, otra para BiS, otra para talentos, y ninguna conoce realmente **su** personaje. Las guías de profesiones suelen ser rutas estáticas o calculadoras genéricas que no consideran lo que el jugador ya sabe, ya tiene o puede comprar.

## 3. Visión

> Ser el lugar donde un jugador de WoW Forever **ve su personaje, lo compara contra lo óptimo y sabe exactamente qué hacer a continuación** — y que esa base de conocimiento crezca hasta ser la wiki de referencia por clase.

## 4. Objetivos

| ID | Objetivo | Indicador (propuesta) |
|----|----------|-----------------------|
| OBJ-1 | Generar rutas de subida de profesión de costo mínimo verificable | Ruta 1→300 calculada en < 2 s; costo ≤ al de guías de referencia en ≥ 80 % de los casos de prueba |
| OBJ-2 | Mostrar el personaje del usuario (armory, profesiones, talentos) | Importación completa en < 60 s desde el archivo exportado |
| OBJ-3 | Cuantificar la distancia al óptimo (BiS / build) | Score por slot y total, explicable |
| OBJ-4 | Construir una wiki por clase mantenible | 9 clases con página base al finalizar R4 |
| OBJ-5 | Datos confiables y trazables | 100 % de los datos con build de origen y fuente |

## 5. Propuesta de valor y diferenciación

Ya existen herramientas que cubren partes del problema (bases de datos de recetas, calculadoras de profesiones, armories comunitarios alimentados por addons). Competir en "tener las mismas páginas" no es una estrategia. La diferenciación propuesta:

1. **Consciente del personaje**: las recomendaciones parten de *tu* skill, *tus* recetas conocidas y *tu* equipo.
2. **Transparente**: cada resultado explica el porqué (costo esperado, probabilidad de skill-up, fuente del precio y su frescura).
3. **Optimización real**: modelo de costo esperado con patterns adquiribles (NPC/subasta) amortizados, no solo "la receta más barata por nivel".
4. **Del dato a la guía**: el mismo modelo de datos alimenta calculadoras, comparaciones y wiki.
5. **Calidad de ingeniería**: accesible (WCAG 2.1 AA), bilingüe ES/EN, rápido y probado.

## 6. Alcance

### Dentro del alcance (en fases)
- Base de datos navegable: ítems, hechizos, recetas, profesiones, clases, talentos, NPCs/vendors, fuentes de obtención.
- Calculadora/guía de subida de profesiones de costo mínimo (con y sin patterns de compra).
- Importación de personajes desde datos exportados por addon; armory, profesiones, talentos.
- Listas BiS por clase/spec/fase y comparación personaje vs BiS.
- Wiki por clase con contenido editorial versionado.
- Cuentas de usuario, privacidad de personajes, i18n ES/EN.

### Fuera del alcance (por ahora)
- Cliente de juego, addon con UI in-game compleja (solo un exportador mínimo).
- Simulador de combate/DPS (*Won't* inicial; posible línea futura).
- Mensajería social, foros, guilds/raid planner.
- App móvil nativa (se diseña responsive/PWA-friendly).
- Monetización.

## 7. Definición de MVP

El MVP **no depende de conectar personajes** (para no bloquearse por la viabilidad de datos):

1. Base de datos de recetas/ítems/profesiones con búsqueda y tooltips.
2. **Calculadora de subida de profesiones** (rango de skill A→B, estrategia, lista de compras, patterns opcionales, precios con frescura y override manual).
3. i18n ES/EN, accesible, desplegado.

La conexión de personajes llega en **R2**; BiS y talentos en **R3**; wiki en **R4** (detalle en [09](09-roadmap-y-backlog.md)).

## 8. Supuestos

| ID | Supuesto | Validación |
|----|----------|------------|
| S-1 | Es posible obtener datos estáticos del juego (recetas, ítems, trainers) de forma legítima y reproducible | Spike SP-1 |
| S-2 | Un addon puede exportar equipo, talentos y profesiones a `SavedVariables` en el cliente Forever | Spike SP-2 (ya hay addons que lo hacen) |
| S-3 | Se puede obtener una señal de precios suficiente (escaneos de usuarios o fuente comunitaria) | Spike SP-3 |
| S-4 | El cálculo de skill-up por dificultad es derivable de los datos del cliente | Spike SP-4 |
| S-5 | La comunidad hispanohablante valora una herramienta ES-first | Validación informal en comunidades |

## 9. Restricciones

- Desarrollo **individual**, tiempo parcial → alcance incremental, prioridades estrictas.
- Presupuesto mínimo → tiers gratuitos (Vercel Hobby, Supabase free) con sus límites.
- Stack del autor: **TypeScript, React 19, Node 22, Express 5, PostgreSQL, Tailwind v4, TanStack, Zustand, i18next, Vitest, Playwright, axe-core, GitHub Actions, pnpm + Turborepo**.
- Cumplimiento con términos de Blizzard y políticas de contenido de fans (revisar antes de publicar; ver [R-02](08-riesgos.md)).

## 10. Criterios de éxito del proyecto

- El MVP resuelve el caso "subir X profesión barato" mejor o igual que una guía estática de referencia, con explicación.
- Un usuario puede importar un personaje y ver armory + profesiones sin soporte manual.
- Los datos de cada pantalla muestran su build y fecha.
- Cobertura de pruebas y accesibilidad verificables en CI.

## 11. Glosario

| Término | Significado |
|---------|-------------|
| BiS | *Best in Slot*: mejor ítem posible por slot |
| Min-maxing | Optimizar al máximo un personaje en función de un objetivo |
| Pattern / fórmula / plano | Ítem que enseña una receta |
| Skill-up | Aumento de skill de profesión al craftear |
| Color de dificultad | Naranja/amarillo/verde/gris: probabilidad decreciente de skill-up |
| AH | Auction House (casa de subastas) |
| Ruleset | Modo de juego de Forever (Normal, PvP, Roleplaying) que reemplaza la elección tradicional de reino |
| SavedVariables | Archivos Lua donde el cliente persiste datos de addons |
| ETL | Extraer, transformar, cargar (pipeline de datos) |

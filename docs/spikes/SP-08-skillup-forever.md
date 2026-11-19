# SP-8 · Addon SkillUp (Forever) y alineación con ADR-013

**Estado:** investigación documental (2026-11-18); sin contacto con el autor · **Riesgos:** R-02, R-16, R-18, R-19 · **Depende de:** [SP-07](SP-07-legal.md)

## 1. Pregunta
Ya existe un addon para Forever que calcula porcentaje y color de cada receta y la ruta más barata para subir profesiones. ¿Qué datos y licencia usa, y cómo nos alineamos sin duplicar ni infringir?

## 2. Hallazgos (según CurseForge y GitHub; verificar en la fuente)
- **Autor/repositorio:** cjber, *SkillUp Forever*.
- **Licencia:** GPL-3.0-or-later en el repositorio; la página de CurseForge menciona LGPLv3 (inconsistencia por aclarar con el autor).
- **Origen de los datos:** tablas DB2 del cliente de Forever (`SkillLineAbility`, `SpellReagents`, `SpellEffect`) obtenidas vía wago.tools; además Skillet-Classic, CMaNGOS classic-db (GPL-3.0), LibPeriodicTable (LGPL-2.1) y, en el juego, QuestieDB y AtlasLoot.
- **Fórmula:** `p = (gris − skill) / (gris − amarillo)` para amarillo/verde; naranja = 100 %; gris = 0 %. Coste por punto = coste neto de reactivos / `p`.
- **Funciones:** color y % por receta, ruta mínima de coste, dónde conseguir cada receta, materiales y crafteos por receta, dónde entrena el NPC el siguiente rango.

## 3. Implicaciones
1. **Los umbrales existen en el cliente** (`SkillLineAbility`): confirma que se pueden obtener y valida la fórmula usada en SP-4. Resuelve H2 si se aceptan esos datos.
2. **Datos derivados del cliente dependen del EULA** (SP-07, sin leer). No se usarán hasta decidir.
3. **Copyleft:** copiar código o tablas de SkillUp obliga a licenciar lo derivado bajo GPL. Opciones: (a) no copiar y medir por nuestra cuenta (SP-4); (b) acordar con el autor un formato de intercambio; (c) publicar nuestro proyecto bajo GPL.
4. **Diferenciación:** SkillUp opera dentro del juego; nuestra app aporta web, comparación entre personajes, BiS, talentos y wiki por clase (R-05).
5. **Simulación:** los umbrales son entradas; los crafteos esperados son `Σ 1/p` (analítico); Monte Carlo solo para varianza y percentiles.

## 4. Opciones de alineación
| Opción | Descripción | Riesgo |
|--------|-------------|--------|
| A | Medir umbrales in-game (SP-4 A/B) y no usar datos de SkillUp | Lento; legalmente limpio |
| B | Pedir permiso al autor para importar sus tablas y respetar GPL | Depende de respuesta y EULA |
| C | Que SkillUp exporte `SavedVariables` que nuestra web importa (ADR-013, addon complementario) | Requiere acuerdo y formato `v1` |

## 5. Siguiente paso
Leer EULA/fan content (SP-07), escribir al autor (cjber) y decidir A/B/C.

## Fuentes
- CurseForge y repositorio de SkillUp Forever (cjber).

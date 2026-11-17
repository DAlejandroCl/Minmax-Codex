# SP-2 · Personajes: API de Battle.net frente a addon

**Estado:** reorientado, pendiente de ejecución · **Riesgos:** R-09, R-12, R-17

## 1. Qué cambió
ADR-002 asumía que solo un addon podía dar datos de personajes. Informes comunitarios (foro de Blizzard, 5–6 nov) indican que existe `profile-forever-{region}` con:

- **Funcionan:** equipo, especializaciones, profesiones, reputaciones, estadísticas, logros, apariencia, colecciones, encuentros, misiones, títulos, PvP, *mythic keystone* y medios.
- **Falla:** `hunter-pets` (404). Faltan `active_spec` y `active_title`.
- **Identidad sin reino:** nombre + apellido (slug `{nombre}-{apellido}`), con `surname` y `ruleset` en lugar de `realm`.
- **Disponibilidad:** el personaje aparece desde nivel 10 y tras cerrar sesión; el resumen de cuenta puede retrasarse 20–40 min; los medios pueden tardar horas.
- **Autenticación:** listar *tus* personajes requiere un **token de usuario** (`wow.profile`). La consulta pública por nombre figuraba como 404 en un informe del 5-nov (ver [issue #84](https://github.com/BradGroux/wow-forever-mission-control/issues/84)) y como funcional en el hilo del foro; hay que comprobarlo.

## 2. Qué no da la API (candidatos para el addon)
Inventario/banco, recetas conocidas con detalle, escaneos propios de subasta, datos de la sesión actual. **A confirmar con un personaje real.**

## 3. Matriz de cobertura a completar

| Dato | RF | ¿API? | ¿Addon? | Decisión |
|------|----|-------|---------|----------|
| Equipo y stats | RF-CHR-04 | ? | ? | |
| Talentos | RF-TAL-02 | ? (`specializations`) | ? | |
| Profesiones y skill | RF-PRO-10 | ? | ? | |
| Recetas conocidas | RF-PRO-10 | ? | ? | |
| Inventario y banco | RF-PRO-08 | ? | ? | |
| Reputaciones | RF-CHR-04 | ? | ? | |

## 4. Procedimiento
1. Con un personaje nivel ≥ 10 que haya cerrado sesión, consulta (con token de usuario si es necesario) los *sub-endpoints* anteriores y guarda solo la **forma** de las respuestas.
2. Instala un addon exportador existente (p. ej. Forever Armory o WFA Armory Exporter), sal del juego y revisa el `SavedVariables` generado.
3. Rellena la matriz y decide qué datos exigen el addon.
4. Pendiente de implementar: ampliar la sonda con `--character` para automatizar el paso 1.

## 5. Criterios de salida
Matriz completa y decisión documentada sobre el papel del addon (obligatorio, complementario u opcional). Esto determina el alcance de RF-CHR-01/02/07 y si ADR-009 requiere **vincular Battle.net** (token de usuario) además de la identidad.

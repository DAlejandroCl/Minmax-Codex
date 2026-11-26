# 12 · Armory y planificador de builds

> Estado: diseño (2026-11-25). Referencia de UX: el editor de equipo de wowsims.github.io. **Fuera de alcance: simulación de DPS** (ADR por documentar si se reabre).

## 1. Objetivo

Que un jugador vea su personaje y pruebe cambios (objetos, encantamientos, gemas, talentos) sin tocar el original, guarde cada prueba y las compare.

## 2. Alcance

| Dentro | Fuera |
| --- | --- |
| Ver personaje: equipo, talentos, encantamientos, gemas, profesiones, estadísticas | Simular DPS/HPS, rotaciones, buffs de banda |
| Editar una copia («prueba»): cambiar objeto, encantamiento, gema y talentos por ranura | Optimización automática de equipo |
| Guardar, renombrar, duplicar y borrar pruebas; comparar con el original | Compartir públicamente (R3) |
| Exportar/importar una prueba como JSON | Sincronizar con el juego |

## 3. Modelo de dominio

- `CharacterSnapshot` (ya existe): lo importado, inmutable.
- `Loadout`: `{ id, name, baseSnapshotTakenAt, equipment: EquippedItem[], talents: TalentAllocation, notes }`. Una **prueba** es un `Loadout` derivado de un snapshot.
- `TalentAllocation`: `{ [talentId]: rank }` validado contra el árbol (puntos máximos, requisitos de fila y de dependencia).
- `GearDelta`: diferencia de stats entre dos `Loadout` (reutiliza `summarizeGear`).

## 4. Pantalla (escritorio)

```
+--------------------------------------------------------------+
| Personaje · [Prueba ▾] [Guardar] [Duplicar] [Exportar]       |
+--------------------+-----------------------+-----------------+
| Equipo (ranuras)   | Selector (al elegir   | Estadísticas    |
| objeto/ench/gemas  | ranura): buscar,      | totales y delta |
|                    | filtrar, comparar     | vs original     |
+--------------------+-----------------------+-----------------+
| Pestañas: Equipo · Talentos · Profesiones · Pruebas guardadas |
+--------------------------------------------------------------+
```

En móvil: pestañas apiladas; el selector se abre como hoja inferior.

## 5. Persistencia

1. **v1:** `localStorage` (versionado, validado con Zod al leer; datos corruptos se descartan con aviso) + export/import JSON.
2. **R2:** cuentas y base de datos (docs/05); mismo esquema.

## 6. Datos que faltan (bloquean la versión real)

| Dato | Fuente prevista | Estado |
| --- | --- | --- |
| Objetos con stats, slot, calidad, ilvl | API Battle.net / ETL (H-011) | Pendiente |
| Encantamientos y gemas (efectos, ranuras compatibles) | Por confirmar (¿API o tablas externas?) | Pendiente, SP nuevo |
| Árboles de talentos de Forever | API de especializaciones | Pendiente |
| Equipo equipado de personajes reales | API de perfil (OAuth) | Pendiente |

## 7. Plan de entrega

1. **A1** Modelo `Loadout` + `TalentAllocation` y validación (datos sintéticos).
2. **A2** Almacén de pruebas (localStorage + Zod) y export/import.
3. **A3** Editor de ranura: selector de objeto, encantamiento y gemas.
4. **A4** Talentos: árbol interactivo con reglas de puntos.
5. **A5** Comparación de stats y delta contra el original.
6. **A6** Conexión a datos reales cuando existan.

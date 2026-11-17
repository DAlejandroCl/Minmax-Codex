# 03 · Requerimientos

Prioridad MoSCoW · Release: MVP, R2, R3, R4, R5 · Columna **CU** = trazabilidad con [04](04-casos-de-uso.md).

## 1. Requerimientos funcionales

### 1.1 Datos del juego (DAT)

| ID | Requerimiento | Prio | Rel | CU |
|----|---------------|------|-----|----|
| RF-DAT-01 | Catálogo navegable y buscable de ítems, hechizos, recetas, profesiones, clases, talentos, NPCs/vendors, zonas y fuentes de obtención | Must | MVP | CU-01, CU-02 |
| RF-DAT-02 | Todo dato está versionado por *build* del cliente; la UI muestra build y fecha de datos | Must | MVP | CU-16 |
| RF-DAT-03 | Pipeline ETL reproducible que valida cada entidad con esquemas Zod y rechaza datos inconsistentes | Must | MVP | CU-16 |
| RF-DAT-04 | Cada dato registra su origen (cliente / comunidad / manual) y nivel de confianza | Should | R2 | CU-16 |
| RF-DAT-05 | Changelog de datos entre builds (qué recetas/ítems cambiaron) | Could | R4 | CU-16 |
| RF-DAT-06 | Tooltips de ítem/hechizo reutilizables en toda la app | Must | MVP | CU-02 |

### 1.2 Precios (PRI)

| ID | Requerimiento | Prio | Rel | CU |
|----|---------------|------|-----|----|
| RF-PRI-01 | Modelo de precios con fuente, mercado (ruleset/región), timestamp y cantidad observada | Must | MVP | CU-17 |
| RF-PRI-02 | Mostrar mediana y rango de precio con indicador de frescura; marcar como *obsoleto* tras el umbral configurable | Must | MVP | CU-09 |
| RF-PRI-03 | El usuario puede sobrescribir precios manualmente (persistente por usuario o local si es anónimo) | Must | MVP | CU-10 |
| RF-PRI-04 | Ingesta de escaneos de subasta desde datos exportados por addon | Should | R2 | CU-17 |
| RF-PRI-05 | Integración con la API de Blizzard para subasta **si y cuando** exista para Forever | Could | R5 | CU-17 |

### 1.3 Profesiones (PRO)

| ID | Requerimiento | Prio | Rel | CU |
|----|---------------|------|-----|----|
| RF-PRO-01 | Listar profesiones y recetas con filtros por fuente (trainer, vendor, subasta, drop, quest, reputación), rango y nueva-en-Forever | Must | MVP | CU-01 |
| RF-PRO-02 | Generar ruta de subida de skill A→B minimizando el **costo esperado** | Must | MVP | CU-09 |
| RF-PRO-03 | Considerar patterns/fórmulas comprables a NPC o en subasta con costo de adquisición amortizado; permitir modo "solo trainer" | Must | MVP | CU-09 |
| RF-PRO-04 | Modelar probabilidad de skill-up por color de dificultad, configurable y derivada de los datos del cliente | Must | MVP | CU-09 |
| RF-PRO-05 | Respetar rangos (entrenar en 75/150/225), requisitos de reputación, facción y exclusiones BoP | Must | MVP | CU-09 |
| RF-PRO-06 | Lista de compras consolidada (cantidades, vendor/subasta, costo) copiable/exportable | Must | MVP | CU-09 |
| RF-PRO-07 | Estrategias: más barata, menos crafteos, sin patterns BoP, solo materiales de vendor | Should | MVP | CU-09 |
| RF-PRO-08 | Recetas intermedias (cadena de crafteo) y valoración de productos sobrantes | Should | R2 | CU-09 |
| RF-PRO-09 | Explicación por paso (por qué esta receta, costo/punto, probabilidad) | Should | MVP | CU-09 |
| RF-PRO-10 | Usar skill actual, recetas conocidas e inventario/bancos del personaje importado | Should | R2 | CU-09, CU-04 |
| RF-PRO-11 | Comparar dos rutas (con vs sin pattern) mostrando punto de equilibrio | Could | R3 | CU-09 |

### 1.4 Personajes (CHR)

| ID | Requerimiento | Prio | Rel | CU |
|----|---------------|------|-----|----|
| RF-CHR-01 | Importar personaje subiendo el archivo `SavedVariables` del addon exportador (parseo **sin ejecutar Lua**) | Must | R2 | CU-04 |
| RF-CHR-02 | Importar mediante código de texto compartido | Should | R2 | CU-05 |
| RF-CHR-03 | Gestionar múltiples personajes, historial de *snapshots* y refresco | Should | R2 | CU-13 |
| RF-CHR-04 | Armory: equipo, stats, nivel, raza/clase, profesiones, reputaciones | Must | R2 | CU-06, CU-08 |
| RF-CHR-05 | Personajes **privados por defecto**; opción de perfil público con URL compartible | Must | R2 | CU-14 |
| RF-CHR-06 | Eliminar un personaje y todos sus snapshots | Must | R2 | CU-19 |
| RF-CHR-07 | Addon exportador propio, mínimo y documentado | Should | R2 | CU-04 |
| RF-CHR-08 | Uploader automático de escritorio | Could | R5 | CU-05 |

### 1.5 Talentos (TAL)

| ID | Requerimiento | Prio | Rel | CU |
|----|---------------|------|-----|----|
| RF-TAL-01 | Visualizar árboles de talentos por clase | Must | R3 | CU-07 |
| RF-TAL-02 | Mostrar la distribución de talentos del personaje importado | Must | R3 | CU-07 |
| RF-TAL-03 | Builds recomendadas por spec/rol y diferencia contra la del personaje | Should | R3 | CU-07 |
| RF-TAL-04 | Compartir una build por URL/código | Could | R4 | CU-07 |

### 1.6 BiS (BIS)

| ID | Requerimiento | Prio | Rel | CU |
|----|---------------|------|-----|----|
| RF-BIS-01 | Listas BiS por clase/spec/fase/rol | Must | R3 | CU-11 |
| RF-BIS-02 | Cada ítem BiS indica cómo obtenerlo (drop, vendor, craft, quest, subasta) | Must | R3 | CU-11 |
| RF-BIS-03 | Perfiles de *stat weights* por spec, editables por el usuario, con score por ítem | Must | R3 | CU-11 |
| RF-BIS-04 | Comparación personaje vs BiS: diferencia por slot y score total | Must | R3 | CU-12 |
| RF-BIS-05 | Recomendación priorizada de upgrades (mayor mejora por esfuerzo/costo) | Should | R3 | CU-12 |
| RF-BIS-06 | Restricciones de equipamiento: 2H/dual wield, tipo de armadura, únicos, bonos de set | Should | R3 | CU-12 |

### 1.7 Wiki (WIK)

| ID | Requerimiento | Prio | Rel | CU |
|----|---------------|------|-----|----|
| RF-WIK-01 | Páginas por clase/spec con guías (rotación, talentos, equipo, profesiones sugeridas) | Must | R4 | CU-01 |
| RF-WIK-02 | Contenido en Markdown/MDX con historial de revisiones | Should | R4 | CU-15 |
| RF-WIK-03 | Flujo editorial (borrador → revisión → publicado) y roles | Should | R4 | CU-15 |
| RF-WIK-04 | Enlaces automáticos y tooltips a entidades del juego dentro del contenido | Should | R4 | CU-15 |

### 1.8 Usuarios y plataforma (USR / GEN / ADM)

| ID | Requerimiento | Prio | Rel | CU |
|----|---------------|------|-----|----|
| RF-USR-01 | Registro e inicio de sesión | Must | R2 | CU-03 |
| RF-USR-02 | Interfaz bilingüe ES/EN con cambio en caliente | Must | MVP | CU-18 |
| RF-USR-03 | Preferencias (tema, mercado, estrategia por defecto) | Should | R2 | CU-03 |
| RF-USR-04 | Exportar y eliminar todos los datos de la cuenta | Must | R2 | CU-19 |
| RF-GEN-01 | Búsqueda global con atajo ⌘/Ctrl+K | Should | MVP | CU-02 |
| RF-GEN-02 | URLs canónicas indexables (SEO) para entidades y guías | Must | MVP | CU-01 |
| RF-ADM-01 | Panel de administración: ejecutar/ver ingestas, builds activas, moderación | Should | R3 | CU-16 |

## 2. Requerimientos no funcionales

| ID | Categoría | Requerimiento | Métrica (propuesta) | Verificación |
|----|-----------|---------------|---------------------|--------------|
| RNF-01 | Rendimiento | Carga inicial rápida en móvil de gama media | LCP ≤ 2,5 s, CLS ≤ 0,1 | Lighthouse CI |
| RNF-02 | Rendimiento | Cálculo de ruta 1→300 | p95 ≤ 2 s en servidor; ≤ 500 ms con datos precargados en cliente | Benchmarks Vitest |
| RNF-03 | Accesibilidad | Cumplir WCAG 2.1 AA | 0 violaciones críticas/serias | axe-core en CI + Playwright |
| RNF-04 | i18n | ES/EN completos, formatos numéricos y de moneda (oro/plata/cobre) localizados | 100 % de claves traducidas | Script de claves en CI |
| RNF-05 | Seguridad | Mitigar OWASP Top 10; validación de entrada con Zod; *rate limiting*; cabeceras seguras | Sin hallazgos altos | Revisión + dependabot + tests |
| RNF-06 | Seguridad | Parseo de archivos subidos sin ejecutar código; límites de tamaño y forma | Fuzz/tests con archivos maliciosos | Vitest |
| RNF-07 | Privacidad | Datos de personaje privados por defecto; borrado efectivo | Borrado completo en ≤ 24 h | Tests E2E |
| RNF-08 | Fiabilidad | Disponibilidad de lectura pública | ≥ 99 % mensual (tier gratuito: mejor esfuerzo) | Monitoreo |
| RNF-09 | Integridad de datos | Datos con build y fuente; ETL idempotente | 100 % de filas con `build_id` | Constraints + tests |
| RNF-10 | Frescura | Precios mostrados con edad; umbral de obsolescencia configurable | Defecto: 24 h | Pruebas de UI |
| RNF-11 | Mantenibilidad | TypeScript estricto, lint, convenciones de commit | `strict: true`; CI bloquea | CI |
| RNF-12 | Testabilidad | Cobertura de lógica de dominio | ≥ 90 % en `optimizer` y `parsers`; ≥ 80 % global | Vitest coverage |
| RNF-13 | Observabilidad | Logs estructurados y métricas de ETL y API | Correlación por `requestId` | Revisión |
| RNF-14 | Portabilidad | Entorno reproducible local | `pnpm i && pnpm dev` + Docker Compose para BD | README |
| RNF-15 | Escalabilidad | Soportar crecimiento de lectura sin rediseño | Caché CDN + datos estáticos precomputados | Prueba de carga básica |
| RNF-16 | Legal | Contenido y marcas de Blizzard tratados conforme a sus políticas | Revisión previa al lanzamiento público | Checklist |

## 3. Reglas de negocio

| ID | Regla |
|----|-------|
| RN-01 | Todo cálculo referencia la **build de datos** con la que se hizo y la muestra al usuario. |
| RN-02 | Los costos se manejan internamente como **enteros en cobre** (100 cobre = 1 plata; 100 plata = 1 oro). Sin flotantes para dinero. |
| RN-03 | Un personaje solo puede tener **dos profesiones primarias**; las secundarias son independientes. |
| RN-04 | Skill de profesión ∈ [1, 300]; rangos de entrenamiento en 75, 150, 225 y 300. |
| RN-05 | Un precio sin observación reciente se muestra marcado como obsoleto y no se usa como "fuente confiable" salvo que el usuario lo acepte. |
| RN-06 | Los personajes son privados salvo decisión explícita del dueño. |
| RN-07 | El costo de un pattern comprable se **amortiza** en el cálculo solo sobre los crafteos que habilita y compara contra la alternativa sin él. |
| RN-08 | Los patterns BoP no comprables en subasta solo se consideran cuando el usuario los marca como disponibles o si su fuente es alcanzable por el personaje. |
| RN-09 | Los datos importados de addon se tratan como **no confiables** hasta validarse por esquema. |

## 4. Restricciones y dependencias

- Disponibilidad y formato de datos del cliente y de addons exportadores (ver [07](07-fuentes-de-datos-y-viabilidad.md)).
- Sin API oficial confirmada de personaje/subasta para Forever.
- Tiers gratuitos de hosting y base de datos.
- Un solo desarrollador.

## 5. Matriz de trazabilidad (resumen RF → CU → release)

| Capacidad | RF principales | CU | Release |
|-----------|----------------|----|---------|
| Base de datos navegable | RF-DAT-01/02/03/06, RF-GEN-02 | CU-01, CU-02, CU-16 | MVP |
| Calculadora de profesiones | RF-PRO-01…07, 09, RF-PRI-01…03 | CU-09, CU-10 | MVP |
| i18n y búsqueda | RF-USR-02, RF-GEN-01 | CU-18, CU-02 | MVP |
| Cuentas y personajes | RF-USR-01/03/04, RF-CHR-01…07 | CU-03, CU-04, CU-05, CU-13, CU-14, CU-19 | R2 |
| Armory y profesiones del PJ | RF-CHR-04, RF-PRO-10 | CU-06, CU-08 | R2 |
| Talentos | RF-TAL-01…03 | CU-07 | R3 |
| BiS y comparación | RF-BIS-01…06 | CU-11, CU-12 | R3 |
| Wiki por clase | RF-WIK-01…04 | CU-01, CU-15 | R4 |
| Integración oficial / uploader | RF-PRI-05, RF-CHR-08 | CU-05, CU-17 | R5 |

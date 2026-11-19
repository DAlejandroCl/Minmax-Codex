# 11 · Justificación de decisiones de ingeniería

> **Estado:** v1.0 · **Fecha:** 2026-11-16 · **Aprobado por el product owner:** MVP y ADRs propuestas en los documentos 06 y 09.
> Este documento es el **registro de razonamiento** del proyecto: explica *por qué* cada decisión es la más apropiada para este tipo de proyecto, qué alternativas se descartaron, qué se sacrifica y bajo qué condiciones se revisa.

## 1. Método

### 1.1 Qué tipo de proyecto es (y por qué condiciona todo)

| Característica | Consecuencia de ingeniería |
|----------------|----------------------------|
| **Content-heavy y read-mostly**: miles de entidades públicas (ítems, recetas, hechizos) que cambian por parche, no por usuario | Renderizado estático, caché agresiva, datos versionados por build |
| **Interactivo en puntos concretos**: calculadora, armory, comparación vs BiS | Interactividad localizada (islas) y cálculo en cliente |
| **Núcleo algorítmico** (optimización de costo, scoring) | Lógica pura, aislada, probada con propiedades |
| **Datos de origen no controlado** (cliente del juego, addons, precios de terceros) | Validación en cada frontera; procedencia; tolerancia a datos obsoletos |
| **Sin API oficial para personajes/subasta** | Ingesta por archivo; diseño para sustituir la fuente sin reescribir |
| **Un desarrollador a tiempo parcial, presupuesto ≈ 0** | Pocas piezas móviles, tiers gratuitos, automatización fuerte, decisiones reversibles |
| **Producto que busca ser referencia (SEO, wiki)** | URLs canónicas, SSG, accesibilidad y rendimiento medibles |

### 1.2 Cómo se decide
1. Se enuncian opciones reales (incluida "no hacer nada nuevo" y la más familiar al autor).
2. Se puntúa con criterios ponderados **específicos de la decisión**. Las puntuaciones son un *juicio de ingeniería razonado*, no una medición: sirven para hacer explícito el razonamiento y detectar márgenes estrechos (que se validan con spikes).
3. Se registran consecuencias, **reversibilidad** y **condiciones de revisión**.
4. Preferencia por decisiones **reversibles y baratas de cambiar**; las irreversibles exigen evidencia previa (spikes).

### 1.3 Plantilla
`Contexto → Opciones → Evaluación → Decisión → Justificación → Consecuencias → Reversibilidad → Revisar si…`

## 2. Resumen de decisiones

| ADR | Decisión | Estado | Cambió respecto a la propuesta |
|-----|----------|--------|-------------------------------|
| 001 | Monorepo pnpm + Turborepo | Aceptada | No |
| 002 | Personajes por exportación de addon + importación de archivo | Aceptada (reemplazada parcialmente por ADR-013) | No |
| 003 | `optimizer` como paquete puro, ejecutado en Web Worker | Aceptada | No |
| 004 | Astro (SSG) + islas React | Aceptada, condicionada a SP-6 | No |
| 005 | Datos de juego versionados por build, servidos estáticos | Aceptada | No |
| 006 | Dinero como entero en cobre | Aceptada | No |
| 007 | **Drizzle ORM** (+ drizzle-kit) | Aceptada | **Resuelta** (antes abierta) |
| 008 | **Vercel (web + API) + GitHub Actions (jobs) + Postgres gestionado** | Aceptada | **Resuelta** |
| 009 | **Supabase Auth** (email/OAuth social); Battle.net OAuth diferido | Aceptada (ajustada por ADR-013) | **Resuelta** |
| 010 | **Optimizador: camino más corto en DAG de segmentos** | Aceptada | Nueva |
| 011 | **Parser Lua propio, sin evaluación** | Aceptada | Nueva |
| 012 | **Retención y agregación de precios** | Aceptada (ajustada por ADR-013) | Nueva |
| 013 | **API-first con addon como complemento** | **Aceptada (2026-11-18)** | Nueva (2026-11-16) |

---

## 3. Decisiones

### ADR-001 · Monorepo con pnpm workspaces + Turborepo
- **Contexto**: web, API, jobs, addon y varios paquetes compartidos (`shared`, `optimizer`, `lua-parser`, `ui`) que deben evolucionar juntos.
- **Opciones**: (a) varios repos; (b) monorepo pnpm + Turborepo; (c) monorepo con Nx.
- **Justificación**: los **esquemas Zod y tipos compartidos** son el contrato entre capas; con repos separados, cada cambio de contrato exige versionar y publicar paquetes. Un monorepo permite cambios atómicos (un PR toca esquema, API y UI) y reutilizar CI. Turborepo aporta caché de tareas sin curva adicional; el autor ya lo usa (cero coste de aprendizaje). Nx añade potencia que un proyecto de este tamaño no necesita.
- **Consecuencias**: (+) refactors seguros, una sola CI; (−) CI más compleja y repos más grandes; requiere disciplina de límites entre paquetes (reglas de importación).
- **Reversibilidad**: alta (los paquetes son independientes; se pueden extraer).
- **Revisar si**: el tiempo de CI supera ~10 min sin mejora por caché o aparecen equipos con ciclos de release distintos.

### ADR-002 · Conexión de personajes por exportación de addon + importación de archivo
- **Contexto**: no hay evidencia de API pública de Blizzard para personajes de Forever (ver [07](07-fuentes-de-datos-y-viabilidad.md)); el ecosistema usa addons que escriben `SavedVariables`.
- **Opciones**: (a) esperar API oficial; (b) **addon + archivo/código**; (c) scraping de armories de terceros; (d) uploader de escritorio desde el día 1.
- **Evaluación**: (a) bloquea el producto por un factor externo; (c) frágil y de dudosa licitud; (d) alto esfuerzo antes de validar demanda. (b) es la única opción con control propio, bajo coste y validable de inmediato.
- **Justificación**: aplica el principio de **reducir el riesgo mayor primero** (R-01). Además el parseo es **local en el navegador**, lo que mejora la privacidad: el servidor solo recibe datos ya validados y confirmados por el usuario.
- **Consecuencias**: (+) independencia de Blizzard, privacidad, testeable; (−) fricción para el usuario, datos tan frescos como el último `/reload`, mantenimiento de adaptadores por formato.
- **Reversibilidad**: alta: la frontera es un esquema de snapshot; una API oficial sustituye la fuente sin tocar el resto.
- **Revisar si**: aparece namespace de Forever en Battle.net (revisión semanal) o los formatos de addons cambian con frecuencia.

### ADR-003 · `optimizer` como paquete puro compartido, ejecutado en Web Worker
- **Contexto**: el cálculo es determinista y potencialmente costoso (cientos de recetas × 300 niveles); el usuario cambia parámetros y espera respuesta inmediata.
- **Opciones**: (a) calcular en el servidor; (b) **paquete puro ejecutable en cliente y servidor**; (c) microservicio dedicado.
- **Justificación**: una función pura `(datos, precios, opciones) → plan` es trivialmente testeable (incluidos tests de propiedades) y portable. Ejecutarla en un **Web Worker** evita bloquear el hilo de UI y elimina latencia de red y coste de servidor: el cómputo escala con los usuarios *gratis*. El mismo código puede ejecutarse en el servidor para validaciones o jobs.
- **Consecuencias**: (+) UX instantánea, coste cero de cómputo, un solo algoritmo; (−) hay que enviar al cliente los datos de recetas y precios (se mitiga con artefactos estáticos comprimidos y solo la profesión elegida).
- **Reversibilidad**: alta (la función no depende de dónde corre).
- **Revisar si**: el cálculo supera presupuesto en móviles de gama baja (RNF-02) → mover a servidor con caché por parámetros.

### ADR-004 · Astro (SSG) + islas React para contenido público
- **Contexto**: se requieren miles de páginas indexables (ítems, recetas, guías) y herramientas interactivas puntuales.
- **Opciones y evaluación** (peso entre paréntesis; puntuación 1–5; total sobre 100):

| Criterio | SPA Vite + prerender | **Astro + islas React** | Next.js |
|----------|:-:|:-:|:-:|
| SEO / generación estática (30) | 2 | **5** | 5 |
| Interactividad de la app (20) | 5 | 4 | 5 |
| Familiaridad del autor (20) | 5 | 4 | 2 |
| Simplicidad (un modelo de ruteo) (20) | 5 | 3 | 3 |
| Rendimiento de carga (10) | 3 | **5** | 4 |
| **Total** | **78** | **84** | **78** |

- **Decisión**: Astro con islas React; la parte altamente interactiva (calculadora, armory) se monta como isla con TanStack Query/Zustand.
- **Justificación**: el criterio decisivo es SEO y coste de renderizado de miles de páginas; Astro envía HTML estático y solo hidrata lo interactivo, mejorando LCP (RNF-01). Mantiene **React** como tecnología de UI, que es la que domina el autor, y Astro ya forma parte de su stack del portafolio.
- **Margen estrecho (84 vs 78)**: por eso la decisión está **condicionada al spike SP-6** (SEO, LCP y complejidad con un prototipo real).
- **Consecuencias**: (−) dos modelos mentales (contenido estático vs isla interactiva); estado compartido entre islas requiere un mecanismo explícito.
- **Reversibilidad**: media: los componentes React son reutilizables en una SPA; lo que cambia es el ruteo y el layout.
- **Revisar si**: SP-6 muestra que la complejidad supera el beneficio, o la mayoría de páginas acaban siendo islas pesadas.

### ADR-005 · Datos de juego versionados por build y servidos como artefactos estáticos
- **Contexto**: los datos de juego son idénticos para todos los usuarios y cambian solo con los parches.
- **Opciones**: (a) consultarlos siempre a la BD vía API; (b) **precomputarlos por build y servirlos desde CDN**; (c) híbrido.
- **Justificación**: es el caso clásico donde **estático gana**: lectura masiva, cambio infrecuente, cero necesidad de consulta dinámica. Elimina la BD de la ruta crítica de lectura (la hace resistente a las pausas del tier gratuito, ver ADR-008), habilita caché `immutable` (la URL incluye el build) y hace trivial el *rollback* (reapuntar a la build anterior). También da trazabilidad: cada cálculo referencia su build (RN-01).
- **Consecuencias**: (+) velocidad, coste, resiliencia; (−) paso de generación en el pipeline; los datos del usuario y los precios siguen siendo dinámicos (híbrido).
- **Reversibilidad**: alta.
- **Revisar si**: el tamaño de artefactos por profesión afecta la carga inicial → partición más fina o compresión Brotli.

### ADR-006 · Dinero como entero en cobre
- **Justificación**: la aritmética de coma flotante introduce errores de redondeo; para sumar costos de miles de crafteos es inaceptable. Enteros en cobre (100 cobre = 1 plata; 100 plata = 1 oro) son exactos, ordenables y se formatean en la capa de presentación (con localización, RNF-04).
- **Consecuencias**: costos esperados fraccionarios (p. ej. `costo/probabilidad`) se redondean **una sola vez** al final del cálculo y se muestran como estimación.
- **Reversibilidad**: media (afecta al modelo de datos); por eso se fija desde el inicio.

### ADR-007 · Acceso a datos: **Drizzle ORM** *(antes abierta)*
- **Contexto**: PostgreSQL con relaciones, `jsonb`, agregaciones de precios (percentiles) y migraciones controladas. El autor conoce Sequelize.
- **Opciones y evaluación**:

| Criterio | Sequelize | **Drizzle** | Kysely | Prisma |
|----------|:-:|:-:|:-:|:-:|
| Tipado de extremo a extremo (30) | 2 | **5** | 5 | 5 |
| Transparencia SQL / control de consultas (25) | 3 | **5** | 5 | 2 |
| Curva de aprendizaje / productividad (20) | 5 | 3 | 3 | 4 |
| Migraciones integradas (15) | 3 | 4 | 2 | 5 |
| Madurez y ecosistema (10) | 5 | 3 | 4 | 5 |
| **Total** | **66** | **85** | **81** | **81** |

- **Decisión**: Drizzle ORM con drizzle-kit para migraciones.
- **Justificación**: en un proyecto cuyo valor depende de la **corrección de datos tipados** (esquemas Zod ↔ tablas ↔ API), el tipado inferido desde el esquema de BD es el factor dominante; Sequelize es el que peor tipa en TypeScript (los modelos requieren declaraciones manuales propensas a divergir). Drizzle mantiene el SQL visible, importante para consultas de agregación y para depurar rendimiento en un plan gratuito con recursos limitados; Prisma oculta más SQL y añade un motor/generador. Se **reconoce el coste**: Sequelize es lo que el autor ya domina; se asume una curva de aprendizaje corta a cambio de menos defectos de tipos.
- **Mitigación**: el acceso a datos se encapsula tras **repositorios con interfaces**; la lógica de dominio no importa el ORM.
- **Reversibilidad**: media-alta (por la capa de repositorios; las migraciones SQL son portables).
- **Revisar si**: aparecen limitaciones bloqueantes (consultas no expresables) o la curva de aprendizaje retrasa más de una semana el MVP → Kysely como alternativa cercana.

### ADR-008 · Hosting: **Vercel (web + API) + GitHub Actions (jobs) + PostgreSQL gestionado** *(antes abierta)*
- **Contexto**: presupuesto ≈ 0, un desarrollador, lectura pública masiva (estática), escritura moderada (cuentas, personajes, precios), ETL y agregaciones periódicas.
- **Datos verificados (2026-11-16)**: Supabase Free: 500 MB de BD, 5 GB de egreso, 50.000 MAU de Auth, **proyectos pausados tras 1 semana de inactividad**, 2 proyectos activos. Vercel Functions: carga máxima de **4,5 MB** por petición/respuesta; en Hobby la duración máxima es 300 s; Hobby incluye 1.000.000 de invocaciones y 100 GB de transferencia rápida al mes.
- **Opciones y evaluación**:

| Criterio | **A. Vercel (web+API) + GH Actions + Postgres gestionado** | B. Vercel web + API en PaaS aparte | C. VPS propio (Docker) |
|----------|:-:|:-:|:-:|
| Costo (30) | **5** | 4 | 3 |
| Simplicidad operativa (30) | **5** | 3 | 2 |
| Rendimiento de lectura pública (15) | 4 | 3 | 3 |
| Aptitud para jobs/ETL (15) | 3 | 4 | 5 |
| Reversibilidad / lock-in (10) | 3 | 4 | 5 |
| **Total** | **87** | **71** | **64** |

- **Decisión**: web estática y API en Vercel; **ETL y agregación de precios como workflows programados de GitHub Actions** (ya usados por el autor, minutos gratuitos y logs); PostgreSQL gestionado (Supabase por ser la cuenta ya existente del autor).
- **Justificación y mitigaciones de límites**:
  - *Pausa de la BD gratuita*: la **lectura pública no depende de la BD** (ADR-005); además un job programado la mantiene activa. Un fallo de BD degrada cuentas/personajes, no la wiki.
  - *Límite de 500 MB*: se controla con la política de retención de precios (ADR-012).
  - *Límite de 4,5 MB por petición*: el snapshot importado se limita a ≤ 1 MB tras validar en cliente; no se suben archivos crudos al servidor.
  - *Jobs largos*: se ejecutan en GitHub Actions, no en funciones.
- **Verificación pendiente**: confirmar el despliegue de Express 5 como Vercel Function y las condiciones de uso de Hobby si algún día hay monetización; ambos se prueban en la Fase 0 (spike SP-6/H-001). La API se empaqueta también en contenedor (RNF-14) como salida.
- **Consecuencias**: (−) acoplamiento moderado a plataformas; límites de cuota que hay que monitorear.
- **Reversibilidad**: media-alta: Express + Postgres estándar + Docker permiten migrar a PaaS o VPS.
- **Revisar si**: las cuotas superan el 70 %, la latencia p95 de la API excede objetivos o el proyecto se monetiza.

### ADR-009 · Autenticación: **Supabase Auth** *(antes abierta)*
- **Contexto**: se necesita identidad para asociar personajes, preferencias y contenido editorial; la privacidad es crítica (RNF-07).
- **Opciones y evaluación**:

| Criterio | **Supabase Auth** | Auth propia (JWT + hash) | Solo Battle.net OAuth |
|----------|:-:|:-:|:-:|
| Seguridad (35) | 4 | 2 | 4 |
| Costo (15) | 5 | 5 | 5 |
| Esfuerzo de implementación (25) | **5** | 2 | 3 |
| Bajo acoplamiento (15) | 2 | 5 | 3 |
| Experiencia de usuario (10) | 4 | 3 | 2 |
| **Total** | **82** | **60** | **71** |

- **Decisión**: Supabase Auth (enlace mágico por email + proveedores sociales como Discord/Google); la API Express **verifica el JWT** y mapea al propio `user_id` de la base.
- **Justificación**: implementar autenticación propia (hash de contraseñas, recuperación, verificación, protección ante abuso) es un riesgo de seguridad desproporcionado frente al valor que aporta; delegarlo a un proveedor reduce superficie de ataque y trabajo. El tier gratuito (50.000 MAU) excede la escala esperada. **Battle.net OAuth** solo aportaría identidad (no datos de personajes de Forever mientras no exista el namespace) y obliga a registrar una app y manejar tokens; se **difiere a R5** como método adicional.
- **Mitigación del acoplamiento**: interfaz `AuthProvider` propia; tabla `user` con identificador interno y `provider_id` mapeado; sin lógica de negocio en reglas del proveedor.
- **Reversibilidad**: media (migrar usuarios requiere exportar identidades; el mapeo propio lo facilita).
- **Revisar si**: cambian los términos del plan gratuito o se necesita un proveedor de identidad específico.

### ADR-010 · Optimizador: camino más corto en un DAG de segmentos *(nueva)*
- **Contexto**: elegir qué receta craftear en cada nivel de skill minimizando el costo esperado, con **costos fijos** (comprar un pattern) y requisitos de rango/reputación.
- **Opciones**: (a) **voraz** por nivel (la receta más barata por punto en cada `s`); (b) **camino más corto en DAG** (nodos = niveles de skill; aristas = uso de una receta en un tramo `s1→s2`, con costo fijo + suma de costos por punto); (c) programación lineal entera (ILP).
- **Evaluación**:
  - (a) es simple pero **incorrecto con costos fijos**: puede comprar un pattern caro para usarlo pocos niveles, o ignorar uno que se amortiza a lo largo de 60 niveles.
  - (c) es el modelo más general (incluye reutilización de sobrantes entre recetas) pero requiere un solver, es pesado para el navegador y difícil de explicar paso a paso (RF-PRO-09).
  - (b) es **exacto bajo el supuesto de un único tramo contiguo por receta**, determinista, O(S·R·S) con poda por dominancia (viable en cliente) y produce naturalmente la explicación por tramos y el punto de equilibrio de un pattern.
- **Decisión**: (b).
- **Limitación conocida**: no modela la reutilización de sobrantes entre recetas distintas; se aborda con valoración de productos secundarios (RF-PRO-08) y se documenta.
- **Verificación**: pruebas de propiedades y **comparación con fuerza bruta** en instancias pequeñas; comparación con guías publicadas (SP-5).
- **Reversibilidad**: alta (el contrato `planProfession` no cambia si se sustituye el algoritmo).
- **Revisar si**: SP-5 muestra diferencias materiales frente a guías por la limitación de sobrantes → evaluar ILP en servidor.

### ADR-011 · Parser Lua propio, sin evaluación *(nueva)*
- **Contexto**: los archivos `SavedVariables` son **entrada no confiable** subida por usuarios (RN-09).
- **Opciones**: (a) ejecutar Lua en un intérprete embebido (WASM/JS); (b) expresiones regulares; (c) **parser propio restringido al subconjunto de literales de tabla**.
- **Justificación**: `SavedVariables` contiene asignaciones de datos (`Var = { ... }`), no lógica. Ejecutar código de usuario, aun en *sandbox*, abre superficie de ataque (bucles infinitos, consumo de memoria, escapes) que no aporta valor. Las regex son frágiles con anidamiento y cadenas. Un parser de literales es pequeño, auditable y permite **límites explícitos** (tamaño, profundidad, número de claves).
- **Consecuencias**: hay que cubrir casos límite (comentarios, cadenas largas, escapes, formatos numéricos, claves mixtas) con tests y fuzzing.
- **Reversibilidad**: alta (paquete aislado `lua-parser`).
- **Revisar si**: aparecen formatos con construcciones fuera del subconjunto de literales.

### ADR-012 · Retención y agregación de precios *(nueva)*
- **Contexto**: las observaciones de precio crecen rápido y la BD gratuita es de 500 MB.
- **Cálculo ilustrativo** (supuestos a validar en SP-3): 5.000 ítems comerciables × 3 mercados × 24 observaciones/día = **360.000 filas/día**; con ~100 bytes por fila ≈ 36 MB/día → el límite se alcanzaría en **~2 semanas** si se guardara todo.
- **Decisión**: conservar observaciones **crudas por 30 días como máximo (o menos)**, agregarlas por hora/día (mediana, percentiles, cantidad) y conservar solo los agregados históricos; limpieza automática por job programado; índices por `(item_id, market, observed_at)`.
- **Justificación**: el valor para el usuario está en el precio **vigente y su tendencia**, no en cada observación. La agregación reduce el almacenamiento en órdenes de magnitud sin afectar RF-PRI-02.
- **Reversibilidad**: alta; si se migra a un plan con más almacenamiento se puede ampliar la retención.
- **Revisar si**: SP-3 muestra volúmenes distintos o se necesitan series históricas más finas.
- **Actualización 2026-11-16**: la clave de mercado real es la casa de subastas y el volumen estimado es de ≈ 540.000 filas/día (ver [SP-03](spikes/SP-03-precios.md)); además los Términos de la API limitan la retención a 30 días ([SP-07](spikes/SP-07-legal.md)). Se revisará junto con ADR-013.

### ADR-013 · API-first con addon como complemento
> **Estado: ACEPTADA el 2026-11-18 por el product owner** (motivo: simplifica el trabajo y puede alinearse con el addon SkillUp existente, ver [SP-08](spikes/SP-08-skillup-forever.md)). Reemplaza parcialmente a ADR-002.

- **Contexto (nuevo, 2026-11-16)**: ADR-002 se aprobó con la premisa de que no había API para Forever. Desde el 5–7 de noviembre, informes comunitarios documentan que la API de Battle.net sirve datos estáticos (`static-forever`), perfiles de personaje (`profile-forever`, con token de usuario `wow.profile`) y subastas (`dynamic-forever`, desde el 2026-11-06), **sin documentación oficial** ([SP-01](spikes/SP-01-datos-estaticos.md), [SP-02](spikes/SP-02-personajes-api-vs-addon.md), [SP-03](spikes/SP-03-precios.md)).
- **Opciones**: (a) mantener ADR-002 tal cual (addon como vía principal); (b) **API-first, addon como complemento**; (c) solo API.
- **Decisión**: (b).
  - Datos estáticos y precios: ETL/jobs sobre la API oficial.
  - Personajes: consulta por API (token de usuario o consulta pública si funciona) y **addon/archivo para lo que la API no da** (se define en SP-02) y como respaldo si la API cambia.
  - RF-PRI-05 (integración oficial de subasta) pasa de *Could/R5* a **Must/MVP**; RF-PRI-04 (escaneo por addon) queda como respaldo.
- **Justificación**: la API es la fuente más fiable, fresca y de menor fricción para el usuario (sin instalar addon ni subir archivos), y evita los riesgos legales de extraer datos del cliente. Mantener el addon como complemento conserva independencia si Blizzard cambia o restringe la API (R-17).
- **Consecuencias**:
  - (+) Precios horarios oficiales, datos estáticos sin extracción, menos fricción de usuario.
  - (−) Dependencia de una API **no documentada** y de los Términos (retención de 30 días, sin *premium*, sin scraping; ver SP-07).
  - Requiere **vincular Battle.net (OAuth)** para listar los personajes del usuario → ADR-009 pasaría a: *Supabase Auth para identidad + flujo de vinculación Battle.net con almacenamiento cifrado del token*.
  - ADR-005 y ADR-012 se ajustan: refresco de artefactos y retención ≤ 30 días hasta confirmar el alcance de la regla.
  - El modelo de mercado cambia de `ruleset` a `auction_house_id` ([05](05-modelo-de-dominio-y-datos.md)).
- **Reversibilidad**: alta (el addon de ADR-002 sigue siendo el plan B funcional).
- **Revisar si**: Blizzard publica documentación oficial, restringe los endpoints o aclara los Términos.

---

## 4. Justificación del MVP (aprobado)

**Decisión**: el MVP es *base de datos navegable + calculadora de profesiones + i18n + despliegue*, **sin conexión de personajes**.

1. **Riesgo primero**: el mayor riesgo (R-01, sin API oficial) afecta a personajes y subasta. Un MVP que no depende de ellos evita que el cronograma dependa de un factor externo.
2. **Valor temprano y verificable**: la calculadora resuelve el caso de uso diferenciador (CU-09) sin necesidad de cuenta; permite validar demanda con tráfico real antes de invertir en cuentas e importación.
3. **Cimientos reutilizables**: el MVP construye lo que todo lo demás necesita (ETL versionado, modelo de entidades, sistema de diseño, i18n, CI). R2–R4 son extensiones, no reescrituras.
4. **Alcance acotado al autor**: ≈ 7–9 semanas a tiempo parcial, con gates de aprobación; reduce el riesgo de *scope creep* (R-06).
5. **Aprendizaje antes de compromiso**: los spikes SP-1…SP-7 convierten supuestos en hechos antes de las partes costosas.

**Qué se sacrifica**: el "wow" del armory conectado llega en R2; se compensa con precios con override manual y con la opción de introducir el skill actual a mano.

## 5. Principios transversales de ingeniería

| Principio | Aplicación |
|-----------|-----------|
| **Estático primero, dinámico donde hace falta** | ADR-004, 005 |
| **Núcleo puro, bordes impuros** | `optimizer`/`lua-parser` sin I/O; repositorios en los bordes |
| **Esquemas como contrato** (Zod) | Una definición valida ETL, API y UI |
| **Validar en cada frontera; no confiar en la entrada** | ADR-002, 011; RN-09 |
| **Inmutabilidad y procedencia** | Builds y snapshots inmutables; todo dato con fuente y fecha |
| **Reversibilidad** | Interfaces en bordes; contratos estables |
| **Medir antes de optimizar** | Presupuestos RNF-01/02; Lighthouse CI; benchmarks |
| **Accesibilidad y seguridad desde el diseño** | WCAG 2.1 AA en CI; límites y *rate limiting* |
| **Incrementos pequeños con aprobación** | Gates por fase; commits atómicos |

## 6. Mapa decisión → riesgo y requisito

| ADR | Riesgos mitigados | RNF / RF relacionados |
|-----|-------------------|-----------------------|
| 001 | R-07 | RNF-11, RNF-14 |
| 002 | R-01, R-08, R-12 | RF-CHR-01, RNF-06, RNF-07 |
| 003 | R-13 | RNF-02, RNF-12, RF-PRO-02 |
| 004 | R-05 | RF-GEN-02, RNF-01 |
| 005 | R-03, R-11 | RF-DAT-02, RNF-08, RNF-09 |
| 006 | R-13 | RN-02, RNF-04 |
| 007 | R-10 | RNF-09, RNF-11 |
| 008 | R-11, R-07 | RNF-08, RNF-15 |
| 009 | R-12 | RF-USR-01, RNF-05, RNF-07 |
| 010 | R-13, R-14 | RF-PRO-02/03/07/09, RNF-02 |
| 011 | R-08 | RF-CHR-01, RNF-06 |
| 012 | R-04, R-11 | RF-PRI-01/02, RNF-10 |

## 7. Gestión del cambio de decisiones

- Cada ADR tiene **condiciones de revisión** (arriba); se revisan al cierre de cada fase junto con el registro de riesgos ([08](08-riesgos.md)).
- Un cambio de decisión se registra como **nuevo ADR que sustituye** al anterior (no se reescribe la historia) y actualiza la tabla de [06](06-arquitectura.md).
- Las decisiones condicionadas (ADR-004, parte de ADR-008) quedan **abiertas a validación** hasta cerrar sus spikes.

## 8. Fuentes verificadas para esta revisión (2026-11-16)

- [Supabase — Precios (límites del plan gratuito)](https://supabase.com/pricing.md)
- [Vercel — Límites de Functions](https://examples.vercel.com/docs/functions/limitations)
- [Vercel — Plan Hobby](https://vercel.com/docs/plans/hobby)

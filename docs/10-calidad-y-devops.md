# 10 · Calidad y DevOps

## 1. Estrategia de pruebas

| Nivel | Herramienta | Alcance | Meta |
|-------|-------------|---------|------|
| Unitarias | **Vitest** | `optimizer`, `lua-parser`, utilidades de dinero, esquemas | ≥ 90 % en `optimizer` y `lua-parser` |
| Propiedades | **fast-check** (con Vitest) | Invariantes del optimizador y del parser | Ver propiedades en [05 §4.1](05-modelo-de-dominio-y-datos.md) |
| Componentes | Vitest + Testing Library | Componentes React del sistema de diseño | Estados, teclado, roles ARIA |
| Contrato | Zod + pruebas de API | Entradas/salidas de la API y esquemas compartidos | Sin *drift* front/back |
| Integración | Vitest + BD de prueba (Postgres en contenedor) | Repositorios, importación, borrado | Transacciones y restricciones |
| ETL / datos | Archivos *golden* en `data/` | Transformaciones y validaciones | Cambios de salida requieren revisión explícita |
| E2E | **Playwright** (multi-navegador) | CU-09, CU-04, CU-12 y alternos clave | Flujos críticos verdes en CI |
| Accesibilidad | **axe-core** (+ Playwright) | Todas las rutas principales | 0 violaciones críticas/serias (RNF-03) |
| Rendimiento | Lighthouse CI + benchmarks Vitest | LCP/CLS y tiempo del optimizador | RNF-01, RNF-02 |
| Seguridad | `pnpm audit`, Dependabot, pruebas de límites | Dependencias, subida de archivos | Sin hallazgos altos |

**Datos de prueba**: fixtures pequeñas y deterministas (no el dataset completo) + un dataset de referencia para pruebas de regresión del optimizador contra guías publicadas.

## 2. Pipeline de CI/CD (GitHub Actions)

| Workflow | Disparador | Pasos |
|----------|-----------|-------|
| `ci` | PR y push a `main` | Instalar (caché pnpm) → lint → typecheck → unit/props → build (Turborepo con caché) |
| `e2e` | PR | Levantar app + BD → Playwright → axe → subir trazas/reportes |
| `coverage` | PR | Reporte de cobertura con umbrales por paquete |
| `lighthouse` | PR a `main` y semanal | Lighthouse CI sobre rutas clave |
| `data-etl` | Manual / programado | ETL a `staging` → reporte de diferencias → artefacto para revisión |
| `deploy` | Merge a `main` | Despliegue web/API; migraciones controladas |
| `deps` | Semanal | Dependabot + auditoría |

**Reglas**: la rama `main` está protegida; CI en verde obligatorio; migraciones de BD revisadas y reversibles; la promoción de datos a `active` es un paso **manual** (CU-16).

## 3. Entornos

| Entorno | Propósito | Datos |
|---------|-----------|-------|
| Local | Desarrollo | Fixtures + BD en Docker |
| Preview (por PR) | Revisión | Build `staging` de datos |
| Producción | Público | Build `active` |

Configuración por variables de entorno; secretos solo en el gestor de la plataforma; `.env.example` versionado.

## 4. Flujo de trabajo en Git

- Ramas cortas por historia: `feat/…`, `fix/…`, `docs/…`, `chore/…`.
- **Conventional Commits** (`feat(optimizer): …`, `docs: …`).
- **Un cambio de archivo = un commit**, con `git add <archivo>` y `git commit` individuales y mensaje descriptivo.
- PRs pequeños con descripción, enlace a historia (`H-0xx`) y checklist de DoD.
- Versionado semántico para releases públicos; *changelog* generado desde commits.

## 5. Definition of Done

- [ ] Criterios de aceptación cumplidos y demostrables.
- [ ] Pruebas unitarias/propiedades/E2E según corresponda; cobertura sobre umbral.
- [ ] axe sin violaciones críticas; navegación por teclado verificada.
- [ ] i18n ES/EN completa (sin claves faltantes).
- [ ] Tipos estrictos, lint limpio, sin `any` injustificados.
- [ ] Sin vulnerabilidades altas; límites de entrada validados.
- [ ] Documentación y ADR actualizados si hubo decisión.
- [ ] Datos con `build_id` y fuente (si aplica).
- [ ] Revisado y desplegado en *preview*.

## 6. Calidad de datos

- Esquemas Zod obligatorios en la frontera del ETL; integridad referencial verificada.
- Reporte de diferencias entre builds antes de promover.
- Verificación muestral in-game documentada (qué se verificó y cuándo).
- Canal de reporte de errores por entidad ("esta receta/fuente está mal") → bandeja para el admin.

## 7. Observabilidad y operación

- Logs JSON con `requestId`, nivel y contexto; sin datos personales.
- Métricas de ETL (filas leídas/aceptadas/rechazadas, duración) y de API (latencia, errores).
- Alertas: ETL fallido, frescura de precios por encima del umbral, errores 5xx sostenidos.
- Procedimiento de rollback: reactivar la build de datos anterior; revertir despliegue.

## 8. Accesibilidad como requisito de diseño

- Tokens de color con contraste AA en claro/oscuro; foco visible; tamaños táctiles.
- Tablas y resultados de la calculadora con semántica correcta y lectura por lector de pantalla.
- Los colores de dificultad (naranja/amarillo/verde/gris) **nunca** son el único indicador: se acompañan de texto/icono.
- Animaciones respetan `prefers-reduced-motion`.

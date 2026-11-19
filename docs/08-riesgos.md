# 08 · Registro de riesgos

Probabilidad (P) e Impacto (I): 1 (bajo) – 5 (alto). Exposición = P × I. Revisar al cierre de cada fase.

| ID | Riesgo | P | I | Exp. | Mitigación | Disparador / señal | Plan B |
|----|--------|---|---|------|------------|--------------------|--------|
| R-01 | ~~No existe API de personajes/subasta~~ **Actualizado 2026-11-16:** la API existe desde el 5–7 de nov pero es parcial, con cobertura aún por medir (consulta pública de personajes, ítems 404) | 3 | 4 | **12** | ADR-013 (aceptado 2026-11-18): API-first con addon como complemento; MVP sin personajes; SP-1/SP-2 miden la cobertura | Cambios de respuesta o 404 nuevos | ADR-002: addon + archivo; override manual de precios |
| R-02 | Obtención/uso de datos del cliente, iconos o marcas contraria a términos de Blizzard | 3 | 5 | **15** | SP-7 antes de publicar; evitar redistribuir assets protegidos; enlaces/atribución; revisar política de fan content | Advertencia o requerimiento del titular | Reducir a datos derivados propios; retirar assets |
| R-03 | Volatilidad de datos por parches (juego recién lanzado, "higher-level content opens later") | 5 | 3 | **15** | Datos versionados por build; ETL idempotente; changelog; pruebas *golden* | Parche semanal | Banner de "datos en revisión" |
| R-04 | Escasez/baja calidad de datos de precios | 4 | 4 | **16** | Mostrar edad y confianza; override manual; ingesta por addon; outliers | Muchos precios obsoletos | Precios sugeridos estáticos + manuales |
| R-05 | Competencia consolidada (DBs, calculadoras, armories) | 4 | 3 | **12** | Diferenciación: personaje-consciente, transparencia, wiki por clase; ES-first | Cuota de uso baja | Enfocar nicho: min-max por clase |
| R-06 | Alcance excesivo (scope creep) | 4 | 4 | **16** | MVP estricto; backlog priorizado; gates de aprobación entre fases | Fases que exceden +50 % de estimación | Recortar R4/R5 |
| R-07 | Capacidad de un solo desarrollador a tiempo parcial | 4 | 3 | **12** | Incrementos pequeños; automatización CI; reutilizar paquetes del portafolio | Velocidad < 60 % del plan | Replanificar fechas, no calidad |
| R-08 | Importación de archivos maliciosos (parseo, DoS) | 3 | 4 | **12** | Parser sin eval; límites; fuzzing; validación doble | Anomalías en logs | Deshabilitar importación y usar solo código |
| R-09 | Cambios de formato de addons de terceros | 4 | 3 | **12** | Adaptadores versionados; formato propio `v1`; pruebas con muestras | Imports fallidos | Priorizar addon propio |
| R-10 | Datos incorrectos (ej. fuente de trainer "asumida") | 4 | 3 | **12** | Marcar confianza; verificación in-game; reportes de usuarios | Reportes de error | Retirar entrada hasta verificar |
| R-11 | Límites de tiers gratuitos (BD pausable, ancho de banda, funciones) | 3 | 3 | **9** | Datos estáticos en CDN; consultas ligeras; monitoreo; ADR-008 | Cuotas al 70 % | Migrar a plan de pago bajo o auto-hospedaje |
| R-12 | Privacidad de datos de personajes y cuentas | 2 | 5 | **10** | Privado por defecto; mínimo dato; borrado efectivo; sin PII innecesaria | Incidente o solicitud de borrado | Procedimiento de respuesta documentado |
| R-13 | Optimizador incorrecto o poco confiable | 3 | 4 | **12** | Property tests; comparación con fuerza bruta y guías; explicación por paso | Reportes de rutas absurdas | Etiquetar como "beta"; modo comparación |
| R-14 | Cambio de mecánicas (skill-up, rangos) por parches | 3 | 3 | **9** | Parámetros como datos configurables; SP-4 | Divergencia in-game | Ajuste rápido de parámetros |
| R-15 | Interés decae en el juego | 2 | 4 | **8** | Mantener valor como caso de estudio y arquitectura reutilizable a otros juegos | Caída de jugadores | Generalizar el motor de datos |
| R-16 | Los Términos de la API restringen el diseño: retención de datos ≤ 30 días, sin funciones *premium* basadas en la API, sin scraping, borrado a petición, atribución sin marcas en título/URL (según resumen; verificar texto original) | 4 | 4 | **16** | [SP-07](spikes/SP-07-legal.md): retención configurable (≤ 30 días por defecto), regenerado mensual de artefactos, política de privacidad, consulta pública a Blizzard | Aclaración negativa de Blizzard o aviso de incumplimiento | Priorizar datos del usuario (archivos de addon) y overrides manuales; reducir el histórico |
| R-17 | La API de Forever es **no documentada** y puede cambiar, restringirse o retirarse sin aviso; además usar endpoints no documentados puede chocar con las cláusulas 2.14/2.16 | 4 | 3 | **12** | Capa de acceso aislada con tipos Zod por endpoint; tests de contrato con respuestas guardadas; vigilancia de cambios; plan B de addon | Esquemas que dejan de validar; 404/403 repentinos | ADR-002 (addon) y precios manuales |
| R-18 | La API estática **no expone umbrales de dificultad, habilidad mínima ni fuentes de obtención** (**confirmado** en las 2.493 recetas y los tiers de la sonda del 2026-11-17; ningún endpoint de NPC, vendedor o zona con datos en 37 candidatos probados): el optimizador no puede calcular `p(s,r)` ni modelar patterns comprables solo con la API. **Mitigado en parte (2026-11-17):** los ítems-patrón traen la habilidad mínima de 1.797 de 2.493 recetas (72,1 %); faltan umbrales de color, la fuente de cada patrón y la habilidad de 696 recetas (sobre todo de entrenador) | 4 | 4 | **16** | Explorar ítems de tipo receta (`search/item`, `preview_item`) para enlazar patterns con recetas; SP-4 mide umbrales en el juego; curación editorial con nivel de confianza; consulta a Blizzard ([SP-01 §4](spikes/SP-01-datos-estaticos.md)) | Ningún campo de dificultad/fuente en los endpoints probados | Tabla editorial verificada en el juego; extraer del cliente solo tras leer el EULA ([SP-07](spikes/SP-07-legal.md)) |

## Top 5 a gestionar desde ya

1. **R-16** → cerrar SP-07 (leer EULA y texto original de los Términos) y consultar a Blizzard; condiciona retención y monetización.
2. **R-04** → la subasta oficial mitiga la escasez de precios; validar cobertura con la sonda (SP-3).
3. **R-06** → definición de MVP congelada y aprobación por fases.
4. **R-18 / R-01 / R-17** → R-18 está confirmado: decidir cómo cubrir umbrales y fuentes (SP-1 §4), medir el resto de la cobertura (SP-2) y aislar la API tras una capa con tests de contrato.
5. **R-03** → arquitectura por builds desde el primer commit.

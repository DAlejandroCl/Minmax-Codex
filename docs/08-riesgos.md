# 08 · Registro de riesgos

Probabilidad (P) e Impacto (I): 1 (bajo) – 5 (alto). Exposición = P × I. Revisar al cierre de cada fase.

| ID | Riesgo | P | I | Exp. | Mitigación | Disparador / señal | Plan B |
|----|--------|---|---|------|------------|--------------------|--------|
| R-01 | No existe API oficial de personajes/subasta para Forever | 5 | 4 | **20** | ADR-002 (addon + archivo); precios multi-fuente; MVP sin personajes | Recheck semanal del namespace | Uploader propio; alianzas con exportadores existentes |
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

## Top 5 a gestionar desde ya

1. **R-01** → MVP sin dependencia de personajes + SP-2/SP-3.
2. **R-04** → decisión de fuente de precios en Fase 0.
3. **R-06** → definición de MVP congelada y aprobación por fases.
4. **R-02** → checklist legal antes de cualquier despliegue público.
5. **R-03** → arquitectura por builds desde el primer commit.

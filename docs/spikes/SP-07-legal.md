# SP-7 · Revisión legal y de términos

**Estado:** parcial · **Fecha:** 2026-11-16 · **Riesgos:** R-02, R-16

> No es asesoría legal. Es un resumen técnico para decidir el diseño. El resumen de los Términos de la API se obtuvo mediante lectura automática del texto; **verifica el texto original** antes de publicar.

## 1. Documentos

| Documento | Estado |
|-----------|--------|
| [Términos de uso de la API de desarrolladores de Blizzard](https://www.blizzard.com/en-us/legal/a2989b50-5f16-43b1-abec-2ae17cc09dd6/blizzard-developer-api-terms-of-use) | Leído (resumen abajo) |
| [Blizzard End User License Agreement](https://www.blizzard.com/en-us/legal/fba4d00f-c7e4-4883-b8b9-1b4500a402ea/blizzard-end-user-license-agreement) | **Pendiente** (relevante para extraer datos de archivos del cliente) |
| Política de contenido de fans / uso de marcas y arte | **Pendiente** de localizar y leer |

## 2. Obligaciones relevantes de los Términos de la API (según resumen)

| Sección | Regla | Impacto en el proyecto |
|---------|-------|------------------------|
| 2.2 | Sin niveles *premium* de pago que desbloqueen funciones que usan la API; sin donaciones previas al acceso ni anuncios obligatorios | **Sin monetización de funciones basadas en la API.** Se confirma el alcance "Won't monetizar" |
| 2.8, 2.9 | Sin marketing/anuncios con los datos; sin vender o ceder los datos | No revender ni exponer una API pública de los datos |
| 2.13, 4 | Identificar a Blizzard como fuente sin sugerir afiliación; **sin marcas de Blizzard en el título o la URL de la aplicación** | Nombre y dominio sin "WoW"/"Warcraft"; aviso de no afiliación (ya en el README). El nombre del repositorio es solo código, pero conviene considerar renombrarlo |
| 2.18 | **Retención máxima de 30 días** para datos de la API; en WoW, borrar personajes que ya no existen | Condiciona ADR-005, ADR-012 y el histórico de *snapshots* (RF-CHR-03). Ver §3 |
| 2.17 | Máx. 36.000 llamadas/hora; sin servicios de terceros para multiplicar peticiones | La ingesta (≈ 15–30 llamadas/h) cabe con holgura |
| 2.15, 11.3 | Política de privacidad coherente con la de Blizzard; no recolectar contraseñas; **borrar datos del jugador cuando lo pida** | Política de privacidad obligatoria; RF-USR-04/RF-CHR-06 pasan a requisito legal |
| 2.12, 2.14.1 | Clave de API confidencial; medidas de seguridad y aviso a Blizzard en 24 h ante accesos no autorizados | Secretos solo en variables de entorno; procedimiento de incidentes |
| 2.14, 2.16 | Prohibido hacer ingeniería inversa o interferir con las API y **hacer scraping fuera del uso autorizado** | **Riesgo:** los endpoints de Forever no están documentados; ver §4 |
| 2.3, 2.6 | Contenido adecuado al ESRB del juego; no dirigido a menores de 13 | Sin contenido ofensivo; edad mínima en los términos del sitio |
| 10, 11 | Blizzard puede cambiar los términos y suspender el acceso sin aviso | Plan B de datos (override manual, addon) |

## 3. Conflictos con las decisiones actuales

1. **Retención de 30 días (2.18)** frente a:
   - **ADR-005** (artefactos estáticos de juego versionados por build): si los datos de juego derivados de la API cuentan como "datos de la API", habría que **refrescarlos al menos cada 30 días**; el pipeline ya es reproducible, así que se puede programar un regenerado mensual.
   - **ADR-012** (agregados históricos de precios): los agregados podrían contar como datos derivados; por prudencia, el diseño debe permitir **configurar la retención** y arrancar en ≤ 30 días hasta aclararlo.
   - **RF-CHR-03** (historial de snapshots): los snapshots obtenidos de la API estarían sujetos al límite; los importados por el usuario desde su propio archivo de addon son datos del usuario, no de la API.
2. **Sin premium (2.2)** exige que cualquier monetización futura excluya funciones alimentadas por la API.

## 4. Preguntas abiertas para Blizzard o el foro de desarrolladores

1. ¿Los datos *derivados y agregados* (medianas de precio, índices estáticos) cuentan para el límite de 30 días?
2. ¿Los endpoints de Forever pueden usarse en aplicaciones de producción mientras no estén documentados?
3. ¿Qué atribución concreta se espera para los datos de juego?

Un hilo en el foro de API de Blizzard (con el caso de uso y estas preguntas) sirve como registro público de la consulta. Hay un hilo previo de otro desarrollador sobre la sección 2(b) sin respuesta visible de Blizzard, así que no conviene depender de una respuesta rápida.

## 5. Extracción de datos de archivos del cliente
Con `static-forever` disponible, **no se recomienda** extraer datos de archivos del cliente: añade riesgo con el EULA (sin leer aún) y complejidad. Solo se considerará para huecos que la API no cubra y **después** de leer el EULA.

## 6. Checklist previo a publicar
- [ ] Leer el EULA y la política de contenido de fans.
- [ ] Texto original de la sección 2.18 confirmado.
- [ ] Nombre y dominio sin marcas de Blizzard; aviso de no afiliación y atribución de fuente en el sitio.
- [ ] Política de privacidad y procedimiento de borrado.
- [ ] Iconos/imágenes: usar solo los servidos por la API con atribución, o arte propio.
- [ ] Sin funciones de pago basadas en datos de la API.

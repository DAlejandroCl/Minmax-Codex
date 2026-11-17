# 02 · Stakeholders y personas

## 1. Stakeholders

| Stakeholder | Interés | Influencia | Notas |
|-------------|---------|-----------|-------|
| Product owner / desarrollador (Diego) | Producto útil, caso de estudio de ingeniería para el portafolio DevACL | Alta | Decide alcance y prioridades |
| Jugadores (usuarios finales) | Optimizar personaje y gastar menos oro | Alta | Ver personas |
| Contribuyentes de contenido (futuro) | Publicar guías por clase | Media | Requieren flujo editorial |
| Autores de addons / herramientas | Compatibilidad de formatos de exportación | Media | Posible colaboración |
| Blizzard Entertainment | Términos de uso, propiedad intelectual, posible API | Alta (externa) | No es cliente; condiciona legalidad y datos |
| Proveedores de infraestructura (Vercel, Supabase, GitHub) | Límites de tier gratuito | Media | Restricción técnica |

## 2. Personas

### P1 — "Nico", jugador de profesiones económico
- **Perfil**: casual-regular, 1–2 personajes, poco oro al inicio.
- **Objetivo**: subir una profesión sin gastar de más.
- **Dolores**: guías que asumen oro abundante; no sabe si comprar un pattern vale la pena.
- **Necesita**: ruta barata, lista de compras, saber *cuándo* un pattern se amortiza.
- **Casos clave**: CU-09, CU-10, CU-02.

### P2 — "Valeria", raider min-maxer
- **Perfil**: raider, varios personajes, conoce stats y BiS.
- **Objetivo**: saber qué falta a su personaje y qué upgrade rinde más.
- **Dolores**: comparar manualmente equipo contra listas; datos dispersos.
- **Necesita**: importar personaje, gap vs BiS, build recomendada.
- **Casos clave**: CU-04, CU-06, CU-07, CU-11, CU-12.

### P3 — "Tomás", theorycrafter / editor de wiki
- **Perfil**: experto de una clase.
- **Objetivo**: publicar guías correctas y mantenerlas por parche.
- **Dolores**: wikis desactualizadas, edición sin control de versiones.
- **Necesita**: editor, revisiones, enlaces automáticos a entidades del juego.
- **Casos clave**: CU-15, CU-11.

### P4 — "Admin" (Diego)
- **Objetivo**: mantener datos al día tras cada parche con mínimo esfuerzo y detectar anomalías.
- **Casos clave**: CU-16, CU-17.

## 3. Mapa persona → release

| Persona | MVP | R2 | R3 | R4 |
|---------|-----|----|----|----|
| P1 Nico | ✔ núcleo | ✔ skill actual | | |
| P2 Valeria | | ✔ importa PJ | ✔ BiS/talentos | |
| P3 Tomás | | | | ✔ editor |
| P4 Admin | ✔ ETL básico | ✔ | ✔ | ✔ moderación |

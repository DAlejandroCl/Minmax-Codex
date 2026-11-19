# Minmax Codex

Web app interactiva para **World of Warcraft: Forever**: armory conectado a tus personajes, profesiones, talentos, listas BiS y guías de subida de profesiones al menor costo posible, con la meta de convertirse en una wiki por clase orientada al min-maxing.

> Proyecto no afiliado a Blizzard Entertainment. Los nombres y marcas pertenecen a sus titulares.

**Estado:** Fase 0 (descubrimiento). Toda la planificación está en [`docs/`](docs/00-README.md).

## Requisitos

- Node.js 22 (`.nvmrc`)
- pnpm 10 (`corepack enable` instala la versión fijada en `packageManager`)

## Comandos

```bash
pnpm install        # instalar dependencias
pnpm lint           # ESLint
pnpm typecheck      # TypeScript estricto
pnpm test           # Vitest
pnpm build          # compilar paquetes
pnpm format         # Prettier
```

## Estructura

```
packages/shared/    # Esquemas Zod, tipos y utilidades de dinero (cobre)
tools/api-probe/    # Sonda exploratoria de la API de Forever (spikes SP-1/SP-3)
docs/               # Planificación SDLC, ADRs y spikes
```

`apps/web`, `apps/api`, `apps/jobs`, `packages/optimizer` y `packages/lua-parser` se añadirán en el MVP (ver [roadmap](docs/09-roadmap-y-backlog.md)).

## Flujo de trabajo

- Ramas cortas, **Conventional Commits** y un commit por cambio de archivo.
- `main` protegida: CI en verde (formato, lint, tipos, tests, build) antes de fusionar.
- Secretos solo por variables de entorno; nunca en el repositorio (`.env.example` documenta las variables).

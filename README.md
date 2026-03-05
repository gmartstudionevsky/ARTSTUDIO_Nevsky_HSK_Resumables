# ARTSTUDIO Consumables

Skeleton monorepo bootstrap for the ARTSTUDIO Consumables web application.

## Stack

- Next.js (App Router) + TypeScript
- TailwindCSS
- Minimal shadcn/ui-compatible base components
- ESLint + Prettier

## Project structure

- `src/app` — routes and API handlers
- `src/components` — reusable UI and layout components
- `src/lib` — constants, env parsing, shared utilities
- `src/styles` — global styles and Tailwind entrypoint
- `public` — static assets placeholders
- `docs` — documentation area

## Commands

- `npm i`
- `npm run dev`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run format`
- `npm run format:check`

## Health checks

- `GET /health` — health status page
- `GET /api/health` — JSON health endpoint

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
- `public` — static assets and PWA files
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

## PWA

- Manifest: `src/app/manifest.ts`
- Service worker: `public/sw.js`
- Icons: `public/icons/icon-192.svg`, `public/icons/icon-512.svg`, `public/favicon.svg`
- Offline fallback page: `/offline`

Проверка installability:

1. Запустите `npm run dev`.
2. Откройте DevTools → Application → Manifest и убедитесь, что manifest загружен.
3. В Application → Service Workers проверьте, что `sw.js` зарегистрирован.
4. Вкладка Network → Offline, затем откройте `/stock` — должна открыться `/offline`.

## Дизайн-токены и шрифты

- Токены и тема: `src/styles/tokens.css`
- Безопасное подключение локальных шрифтов: `src/styles/fonts.css`
- Инструкция по шрифтам: `docs/fonts.md`
- Папка для локальных файлов: `public/fonts/`

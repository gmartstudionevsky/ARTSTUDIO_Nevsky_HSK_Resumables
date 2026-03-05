# Шрифты: локальное подключение

По умолчанию проект использует system stack через CSS variables.

## Какие файлы можно добавить

Положите в `public/fonts/`:
- `Circe.woff2`
- `Circe-Bold.woff2`
- `HistoryPro.woff2`

## Как подключить

1. Откройте `src/styles/fonts.css`.
2. Раскомментируйте или добавьте блоки `@font-face` с файлами из `public/fonts`.
3. При необходимости обновите `--font-sans` и `--font-display` в `src/styles/tokens.css`.

Пример:

```css
@font-face {
  font-family: 'Circe';
  src: url('/fonts/Circe.woff2') format('woff2');
  font-display: swap;
  font-weight: 400;
  font-style: normal;
}
```

В проекте не используется `next/font/google`, чтобы сборка не зависела от сети.

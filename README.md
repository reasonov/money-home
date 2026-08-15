# money-home

PWA для учёта расходов и доходов по счетам, с планированием покупок.

**Спецификация для разработки:** [docs/SPEC.md](docs/SPEC.md)  
**Настройка агентов / MCP:** [docs/AGENT_SETUP.md](docs/AGENT_SETUP.md)

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
npm run test:unit
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```

## Deploy (GitHub Pages)

Репозиторий: [reasonov/money-home](https://github.com/reasonov/money-home)  
Сайт после деплоя: https://reasonov.github.io/money-home/

Деплой через GitHub Actions (`.github/workflows/deploy.yml`) при push в `main`.

1. Закоммить изменения и запушь `main` (`git push -u origin main`).
2. Settings → Pages → Source: **GitHub Actions**.
3. Дождись успешного workflow.

Локальная production-сборка с тем же `base`, что в CI:

```sh
VITE_BASE_PATH=/money-home/ npm run build
```

Версия в шапке (`v1`, `v2`, …) берётся из major в `package.json` (`1.0.0` → `v1`). Для следующего релиза подними major (`2.0.0` → `v2`).

Secrets для сборки: `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`.
# Supabase proxy (Cloudflare Worker)

Обход блокировок `*.supabase.co` (часто мобильный интернет в РФ): браузер ходит на `*.workers.dev`, Worker проксирует на проект Supabase.

## Деплой

1. Аккаунт на [Cloudflare](https://dash.cloudflare.com) (бесплатного хватает).
2. Из корня репозитория:

```sh
npm run proxy:login
npm run proxy:deploy
```

3. Скопируй URL воркера вида `https://money-home-supabase-proxy.<subdomain>.workers.dev`.
4. Подставь его в env вместо прямого Supabase URL:

```
VITE_SUPABASE_URL=https://money-home-supabase-proxy.<subdomain>.workers.dev
VITE_SUPABASE_ANON_KEY=...тот же anon key...
```

Локально — `.env.local`, для GitHub Pages — secret `VITE_SUPABASE_URL`, затем redeploy.

5. Проверка с LTE:

`https://<worker-url>/auth/v1/health`

Должен ответить (хотя бы JSON с ошибкой API key), а не таймаут.

## Локальный прогон воркера

```sh
npm run proxy:dev
```

Временно укажи в `.env.local` `VITE_SUPABASE_URL=http://127.0.0.1:8787` (только для проверки с того же устройства).

## Заметки

- Ссылки подтверждения email из писем Supabase по-прежнему ведут на `*.supabase.co`. Если и они недоступны с LTE — отключите confirm email в Auth или используйте VPN для клика по письму.
- Anon / service_role ключи не меняются.
- Лимит free tier Cloudflare Workers: ~100k запросов/сутки.

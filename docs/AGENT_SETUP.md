# Agent setup

Документ для человека: MCP и env. Агенту не читать, пока задача не про настройку Cursor/MCP.

## Docs

- Product: [SPEC.md](./SPEC.md) — читать секцию под задачу, не файл целиком
- Cursor rules: `.cursor/rules/`
- Cursor skills: `.cursor/skills/`

## Supabase MCP (optional)

Нужен для запросов схемы, RLS и SQL из Cursor. Секреты в репозиторий не коммитить.

1. Создай проект на [supabase.com](https://supabase.com) (если ещё нет).
2. Personal Access Token: Supabase Dashboard → Account → Access Tokens.
3. В Cursor: Settings → MCP → Add server (или project MCP config).
4. Используй официальный / community Supabase MCP ([supabase-community/supabase-mcp](https://github.com/supabase-community/supabase-mcp)).
5. Передай `SUPABASE_ACCESS_TOKEN` и при необходимости project ref через env MCP-сервера, не через `.env` фронтенда.

Клиент приложения использует только:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Шаблон: скопируй в `.env.local` (файл в `.gitignore` / `.cursorignore`). `service_role` в браузер не класть.

## Figma MCP

Уже доступен в Cursor для design-to-code. Для money-home не обязателен.

## Datadog MCP

Для этого проекта не используется.

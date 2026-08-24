---
name: user-stats
description: >-
  Queries the remote Supabase project and prints per-user operation stats
  in chat. Use when the user asks for статистика, пользователи, KPI,
  user stats, /stats, сколько операций, or activity by user.
---

# User stats

Сходить в **remote** Supabase и выдать статистику в чат. Только текст, без SQL, UUID, email и файлов.

## Данные

1. `project_id` из `supabase/config.toml` (`project_id = "..."`). Если файла нет — MCP `list_projects`.
2. MCP `execute_sql` (namespace `plugin-supabase-supabase`), один запрос:

```sql
select
  coalesce(nullif(trim(p.display_name), ''), 'Без имени') as name,
  count(t.id)::int as ops_total,
  count(t.id) filter (
    where (timezone('Europe/Moscow', t.created_at))::date
      = (timezone('Europe/Moscow', now()))::date
  )::int as ops_today
from public.profiles p
left join public.transactions t
  on t.created_by = p.user_id
 and t.status = 'posted'
group by p.user_id, p.display_name
order by ops_today desc, ops_total desc, name;
```

«Сегодня» — календарный день Europe/Moscow. Только `status = 'posted'`. Перевод — одна строка. Автодоход/авторасход входят, если есть `created_by`. Все профили, даже с нулём операций.

MCP недоступен или 401 — коротко сказать, что нужен логин Supabase MCP. Не выдумывать цифры.

## Формат ответа

Дата — сегодня, день и месяц по-русски. Пользователи — markdown-таблица, **одна строка на человека**. Не склеивать строки в абзац.

```
Пользователи — 24 авг 2026

Всего: 12 · писали сегодня: 2

| Пользователь | Всего | Сегодня |
| --- | ---: | ---: |
| Илья | 10 | 5 |
| Максим | 10 | 5 |
```

«Писали сегодня» — сколько строк с `ops_today > 0`. Имя — как в `display_name`, без правок. Профилей нет: `Пользователей нет.`

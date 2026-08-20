import { mkdirSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = process.env.CURSOR_PROJECT_DIR || join(dirname(fileURLToPath(import.meta.url)), '../..')
const REF = process.env.DUMP_PROJECT_REF || 'qegoivwsbvjhkemmcyqv'
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const OUT_DIR = process.env.DUMP_OUT_DIR || join(ROOT, 'supabase/backups')
const STAMP = join(OUT_DIR, '.last-dump')

if (!TOKEN) {
  console.error('skip dump: set SUPABASE_ACCESS_TOKEN in .env.local')
  process.exit(0)
}

function unwrap(payload) {
  if (Array.isArray(payload)) {
    return payload
  }
  if (payload && Array.isArray(payload.data)) {
    return payload.data
  }
  if (payload && Array.isArray(payload.result)) {
    return payload.result
  }
  throw new Error(`unexpected query response: ${JSON.stringify(payload).slice(0, 400)}`)
}

async function query(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })
  const text = await res.text()
  let payload
  try {
    payload = JSON.parse(text)
  } catch {
    throw new Error(`dump query ${res.status}: ${text.slice(0, 400)}`)
  }
  if (!res.ok) {
    throw new Error(`dump query ${res.status}: ${text.slice(0, 400)}`)
  }
  return unwrap(payload)
}

function quoteIdent(name) {
  return `"${String(name).replaceAll('"', '""')}"`
}

const tables = await query(`
  select table_schema, table_name
  from information_schema.tables
  where table_type = 'BASE TABLE'
    and (
      table_schema = 'public'
      or (table_schema = 'auth' and table_name in ('users', 'identities'))
    )
  order by table_schema, table_name
`)

const dump = {
  dumped_at: new Date().toISOString(),
  project_ref: REF,
  tables: {},
}

for (const table of tables) {
  const schema = table.table_schema ?? table.TABLE_SCHEMA
  const name = table.table_name ?? table.TABLE_NAME
  const qualified = `${quoteIdent(schema)}.${quoteIdent(name)}`
  const rows = await query(`select * from ${qualified}`)
  dump.tables[`${schema}.${name}`] = rows
}

mkdirSync(OUT_DIR, { recursive: true })
const tmp = join(OUT_DIR, 'data.json.tmp')
writeFileSync(tmp, `${JSON.stringify(dump, null, 2)}\n`)
renameSync(tmp, join(OUT_DIR, 'data.json'))
writeFileSync(STAMP, `${dump.dumped_at}\n`)
console.error(`dump finished ${dump.dumped_at}`)

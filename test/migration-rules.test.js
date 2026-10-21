import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
/**
 * Guard for the Supabase 2026-10-30 default-privilege change. Every new table needs RLS + explicit grants, every new
 * function a revoke from PUBLIC, every view security_invoker. Migrations created on/after 2026-10-22 are checked.
 * Rules + template: supabase/MIGRATION_RULES.md
 */
const REPO_REL = '..'
const MIGRATION_DIRS = ["supabase/migrations"]
const NUMBERED_AFTER = 7
const RULES_DOC = 'supabase/MIGRATION_RULES.md'
/** Files created before this guard that already fail. Each needs a reason; stale entries fail the test. */
const ACKNOWLEDGED = {}
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), REPO_REL)
const expect = (v) => ({ toEqual: (x) => assert.deepStrictEqual(v, x), toBe: (x) => assert.strictEqual(v, x) })

// ---- migration rules checker (shared logic; keep identical across repos) ----
const CUTOFF = 20261022 // files whose name starts with a date on/after this are checked; older are grandfathered

const ID = String.raw`(?:"[^"]+"|[A-Za-z_][\w$]*)`
const QID = String.raw`${ID}(?:\s*\.\s*${ID})?`

function norm(raw) {
  const last = raw.split('.').pop() || raw
  return last.replace(/"/g, '').trim().toLowerCase()
}

/** Replace -- and block comments with a space; leave strings and dollar-quoted bodies intact. */
function stripComments(sql) {
  let out = ''
  let i = 0
  while (i < sql.length) {
    const c = sql[i]
    const n = sql[i + 1]
    if (c === '-' && n === '-') {
      while (i < sql.length && sql[i] !== '\n') i++
      out += ' '
    } else if (c === '/' && n === '*') {
      const end = sql.indexOf('*/', i + 2)
      i = end === -1 ? sql.length : end + 2
      out += ' '
    } else if (c === "'") {
      let j = i + 1
      while (j < sql.length) {
        if (sql[j] === "'" && sql[j + 1] === "'") j += 2
        else if (sql[j] === "'") break
        else j++
      }
      out += sql.slice(i, j + 1)
      i = j + 1
    } else if (c === '$') {
      const m = /^\$[A-Za-z_]*\$/.exec(sql.slice(i, i + 40))
      if (m) {
        const end = sql.indexOf(m[0], i + m[0].length)
        const stop = end === -1 ? sql.length : end + m[0].length
        out += sql.slice(i, stop)
        i = stop
      } else {
        out += c
        i++
      }
    } else {
      out += c
      i++
    }
  }
  return out
}

/** Returns a list of human-readable violations for one migration file's SQL. */
function checkMigrationSql(raw) {
  const ignored = new Set([...raw.matchAll(/--\s*migration-rules:\s*ignore\s+(table|function|view|all)\b/gi)].map((m) => m[1].toLowerCase()))
  const skip = (k) => ignored.has('all') || ignored.has(k)
  const sql = stripComments(raw)
  const problems = []

  // ---- tables: RLS + service_role grant ----
  const rlsNames = new Set(
    [...sql.matchAll(new RegExp(String.raw`alter\s+table\s+(?:only\s+)?(?:if\s+exists\s+)?(${QID})\s+enable\s+row\s+level\s+security`, 'gi'))].map((m) => norm(m[1])),
  )
  const dynamicRls = /alter\s+table[^;]{0,160}?(%[IsL]|\|\|)[^;]{0,160}?enable\s+row\s+level\s+security/i.test(sql)
  let blanketGrant = false
  const grantNames = new Set()
  for (const m of sql.matchAll(/\bgrant\s+([^;]*?)\s+on\s+([^;]*?)\s+to\s+([^;]*)/gi)) {
    const roles = m[3].toLowerCase()
    if (!/\bservice_role\b/.test(roles) && !/%[IsL]/.test(roles)) continue
    const target = m[2].trim()
    if (/^all\s+tables\s+in\s+schema/i.test(target) || /^%|\|\|/.test(target) || /%[IsL]/.test(target)) {
      blanketGrant = true
      continue
    }
    if (/^(sequence|sequences|all\s+sequences|function|functions|all\s+functions|schema|database)\b/i.test(target)) continue
    const list = target.replace(/^(table|tables)\s+/i, '')
    for (const part of list.split(',')) {
      const mm = new RegExp(String.raw`^\s*(${QID})`).exec(part)
      if (mm) grantNames.add(norm(mm[1]))
    }
  }
  if (!skip('table')) {
    const tableRe = new RegExp(String.raw`\bcreate\s+(?:unlogged\s+)?table\s+(?:if\s+not\s+exists\s+)?(${QID})`, 'gi')
    const seen = new Set()
    for (const m of sql.matchAll(tableRe)) {
      const name = norm(m[1])
      if (seen.has(name)) continue
      seen.add(name)
      if (!rlsNames.has(name) && !dynamicRls) problems.push(`create table ${name}: no "alter table ${name} enable row level security" in this file`)
      if (!grantNames.has(name) && !blanketGrant) problems.push(`create table ${name}: no "grant ... on ${name} to service_role" in this file`)
    }
  }

  // ---- functions: revoke execute from public ----
  if (!skip('function')) {
    const revoked = new Set()
    let blanketRevoke = /alter\s+default\s+privileges[^;]*revoke\s+(?:all|execute)[^;]*on\s+functions\s+from[^;]*\bpublic\b/i.test(sql)
    for (const m of sql.matchAll(/\brevoke\s+(?:all|execute)[^;]*?\bon\s+((?:all\s+)?(?:functions|function|routines|routine|procedures|procedure)\b[^;]*?)\s+from\s+([^;]*)/gi)) {
      if (!/\bpublic\b/i.test(m[2]) && !/%[IsL]/.test(m[2])) continue
      if (/^all\s+/i.test(m[1]) || /%[IsL]|\|\|/.test(m[1])) {
        blanketRevoke = true
        continue
      }
      for (const f of m[1].matchAll(new RegExp(String.raw`(${QID})\s*\(`, 'g'))) revoked.add(norm(f[1]))
    }
    const fnRe = new RegExp(String.raw`\bcreate\s+(?:or\s+replace\s+)?(?:function|procedure)\s+(${QID})\s*\(`, 'gi')
    const seen = new Set()
    for (const m of sql.matchAll(fnRe)) {
      const name = norm(m[1])
      if (seen.has(name)) continue
      seen.add(name)
      if (!revoked.has(name) && !blanketRevoke) problems.push(`create function ${name}: no "revoke execute on function ${name}(...) from public" in this file`)
    }
  }

  // ---- views: security_invoker ----
  if (!skip('view')) {
    const invoker = new Set(
      [...sql.matchAll(new RegExp(String.raw`alter\s+view\s+(?:if\s+exists\s+)?(${QID})\s+set\s*\([^)]*security_invoker\s*=?\s*'?(?:on|true)'?`, 'gi'))].map((m) => norm(m[1])),
    )
    const viewRe = new RegExp(String.raw`\bcreate\s+(?:or\s+replace\s+)?(?:temp(?:orary)?\s+)?(?:recursive\s+)?view\s+(${QID})([^;]*?)\bas\b`, 'gi')
    const seen = new Set()
    for (const m of sql.matchAll(viewRe)) {
      const name = norm(m[1])
      if (seen.has(name)) continue
      seen.add(name)
      if (/\btemp(orary)?\s+/i.test(m[0].slice(0, 40))) continue
      const inline = /security_invoker\s*=?\s*'?(on|true)'?/i.test(m[2])
      if (!inline && !invoker.has(name)) problems.push(`create view ${name}: no security_invoker = on (inline "with (security_invoker = on)" or "alter view ${name} set (security_invoker = on)")`)
    }
  }
  return problems
}

/** "20261022g_x.sql", "20261025130000_x.sql", "2026-10-22-x.sql" -> 20261022; null if no date. */
function fileDate(name) {
  const m = /^(\d{4})-?(\d{2})-?(\d{2})/.exec(name)
  return m ? Number(m[1] + m[2] + m[3]) : null
}

/**
 * Is this migration file subject to the rules? Dated names: on/after CUTOFF. Undated numbered names
 * ("0029_x.sql"): only when the repo passes numberedAfter and the number is above it. Anything else is grandfathered.
 */
function isChecked(name, numberedAfter) {
  const d = fileDate(name)
  if (d !== null) return d >= CUTOFF
  const n = /^(\d{1,6})_/.exec(name)
  return n !== null && typeof numberedAfter === 'number' && Number(n[1]) > numberedAfter
}
// ---- end shared logic ----

/** Every checked migration file: { file, sql }. */
function checkedMigrations() {
  const out = []
  for (const dir of MIGRATION_DIRS) {
    const abs = path.join(REPO, dir)
    if (!fs.existsSync(abs)) continue
    for (const file of fs.readdirSync(abs).sort()) {
      if (!file.toLowerCase().endsWith('.sql') || !isChecked(file, NUMBERED_AFTER)) continue
      out.push({ file: dir + '/' + file, name: file, sql: fs.readFileSync(path.join(abs, file), 'utf8') })
    }
  }
  return out
}

describe('migration rules (Supabase 2026-10-30 convention)', () => {
  it('flags a table with no RLS and no service_role grant', () => {
    expect(checkMigrationSql('create table public.a (id int);').length).toEqual(2)
    expect(checkMigrationSql('CREATE TABLE IF NOT EXISTS "public"."a" (id int);\nalter table public.a enable row level security;').length).toEqual(1)
    expect(checkMigrationSql('create table x.a (id int); alter table x.a enable row level security; grant all on table x.a to service_role;')).toEqual([])
    expect(checkMigrationSql('create table a (id int); -- alter table a enable row level security;\ngrant all on a to service_role;').length).toEqual(1)
    expect(checkMigrationSql('create temp table a (id int);')).toEqual([])
  })

  it('flags a function with no revoke execute from public', () => {
    expect(checkMigrationSql('create function f(x int) returns int language sql as $$ select 1 $$;').length).toEqual(1)
    expect(checkMigrationSql('create or replace function s.f() returns int language sql as $$ select 1 $$;\nrevoke execute on function s.f() from public, anon;')).toEqual([])
    expect(checkMigrationSql('create function f() returns int language sql as $$ select 1 $$;\nrevoke all on function f() from anon;').length).toEqual(1)
    expect(checkMigrationSql('-- migration-rules: ignore function (replaces existing)\ncreate or replace function f() returns int language sql as $$ select 1 $$;')).toEqual([])
  })

  it('flags a view without security_invoker', () => {
    expect(checkMigrationSql('create or replace view v as select 1;').length).toEqual(1)
    expect(checkMigrationSql('create or replace view s.v with (security_invoker = on) as select 1;')).toEqual([])
    expect(checkMigrationSql('create view v as select 1; alter view v set (security_invoker = true);')).toEqual([])
    expect(checkMigrationSql('create view v with (security_invoker = off) as select 1;').length).toEqual(1)
  })

  it('only checks files created on or after the cutoff', () => {
    expect(isChecked('20261021z_old.sql')).toBe(false)
    expect(isChecked('20261022g_new.sql')).toBe(true)
    expect(isChecked('20261025130000_new.sql')).toBe(true)
    expect(isChecked('2026-10-22-new.sql')).toBe(true)
    expect(isChecked('2026-10-21-old.sql')).toBe(false)
    expect(isChecked('0030_numbered.sql', 29)).toBe(true)
    expect(isChecked('0029_numbered.sql', 29)).toBe(false)
    expect(isChecked('0030_numbered.sql')).toBe(false)
  })

  it('every migration created on or after 2026-10-22 follows the rules', () => {
    const failures = []
    const used = new Set()
    for (const { file, name, sql } of checkedMigrations()) {
      const problems = checkMigrationSql(sql)
      if (problems.length === 0) continue
      if (Object.prototype.hasOwnProperty.call(ACKNOWLEDGED, name)) {
        used.add(name)
        continue
      }
      failures.push(file + '\n' + problems.map((p) => '   - ' + p).join('\n'))
    }
    const stale = Object.keys(ACKNOWLEDGED).filter((n) => !used.has(n))
    if (stale.length) failures.push('ACKNOWLEDGED entries that no longer fail (remove them): ' + stale.join(', '))
    // The message says how to fix it; an empty string means every file passed.
    expect(failures.length ? 'Migration rules broken - see ' + RULES_DOC + '\n' + failures.join('\n') : '').toBe('')
  })
})

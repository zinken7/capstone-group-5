import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { affectedAreas, changedPaths } from './changes.mjs'
import { checkResults } from './results.mjs'

const none = { frontend: false, backend: false, services: false, infra: false, compose: false }
const all = Object.fromEntries(Object.keys(none).map((key) => [key, true]))

for (const [name, paths, expected] of [
  ['frontend only', ['frontend/src/App.tsx', 'frontend/package-lock.json'], { ...none, frontend: true }],
  ['backend only', ['backend/src/routes/map.ts'], { ...none, backend: true }],
  ['migration', ['backend/migrations/002.sql'], { ...none, backend: true }],
  ['seed data', ['backend/seed/reference/companies.json'], { ...none, backend: true }],
  ['services only', ['services/extractor/main.py'], { ...none, services: true }],
  ['service dependencies', ['services/extractor/requirements.txt'], { ...none, services: true }],
  ['infra only', ['infra/main.tf'], { ...none, infra: true }],
  ['multiple areas', ['frontend/a.ts', 'backend/b.ts', 'infra/main.tf'], { ...none, frontend: true, backend: true, infra: true }],
  ['documentation only', ['docs/api/README.md', 'frontend/README.md', 'backend/seed/README.md', 'services/README.md', 'infra/README.md'], none],
  ['shared compose', ['docker-compose.yml'], all],
  ['shared environment', ['.env.example'], all],
  ['shared npm config', ['.npmrc'], all],
  ['workflow', ['.github/workflows/lint.yml'], all],
  ['CI helper', ['.github/scripts/ci/changes.mjs'], all],
  ['backend container', ['backend/Dockerfile'], { ...none, backend: true, compose: true }],
  ['frontend environment', ['frontend/.env.example'], { ...none, frontend: true }],
  ['no changes', [], none],
]) {
  test(name, () => assert.deepEqual(affectedAreas(paths, 'pull_request'), expected))
}

test('push to main always selects the full suite', () => {
  assert.deepEqual(affectedAreas(['docs/README.md'], 'push'), all)
})

test('unknown events fail instead of skipping coverage', () => {
  assert.throws(() => affectedAreas([], 'unknown'))
})

test('git diff includes deleted and added paths for a rename, including whitespace', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ci-paths-'))
  const original = process.cwd()
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim()
  try {
    git('init', '-q')
    git('config', 'user.email', 'ci@example.invalid')
    git('config', 'user.name', 'CI test')
    writeFileSync(join(dir, 'old file'), 'content')
    git('add', '.')
    git('commit', '-qm', 'base')
    const base = git('rev-parse', 'HEAD')
    git('mv', 'old file', 'new file')
    git('commit', '-qm', 'move')
    const head = git('rev-parse', 'HEAD')
    process.chdir(dir)
    assert.deepEqual(changedPaths(base, head), ['new file', 'old file'])
  } finally {
    process.chdir(original)
    rmSync(dir, { recursive: true, force: true })
  }
})

test('invalid commit references fail closed', () => {
  assert.throws(() => changedPaths('', 'HEAD'))
})

function results(areas) {
  return {
    changes: { result: 'success', outputs: Object.fromEntries(Object.entries(areas).map(([key, value]) => [key, String(value)])) },
    ...Object.fromEntries(Object.entries({ frontend: 'frontend-lint', backend: 'backend-checks', services: 'services-checks', infra: 'infra-checks', compose: 'compose-config' })
      .map(([area, job]) => [job, { result: areas[area] ? 'success' : 'skipped' }])),
  }
}

test('required gate accepts full, partial and docs-only success', () => {
  for (const areas of [all, none, { ...none, frontend: true }]) checkResults(results(areas))
})

test('required gate rejects failed/cancelled detection and missing outputs', () => {
  for (const result of ['failure', 'cancelled', 'skipped']) {
    const needs = results(none)
    needs.changes.result = result
    assert.throws(() => checkResults(needs))
  }
  const needs = results(none)
  delete needs.changes.outputs.infra
  assert.throws(() => checkResults(needs))
})

test('required gate rejects failure, cancellation or unexpected skipping in every selected job', () => {
  for (const job of ['frontend-lint', 'backend-checks', 'services-checks', 'infra-checks', 'compose-config']) {
    for (const result of ['failure', 'cancelled', 'skipped']) {
      const needs = results(all)
      needs[job].result = result
      assert.throws(() => checkResults(needs))
    }
  }
})

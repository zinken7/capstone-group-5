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
  ['hyphenated shared compose', ['docker-compose-dev.yml'], all],
  ['underscored shared compose', ['compose_prod.yaml'], all],
  ['shared envrc', ['.envrc'], all],
  ['hyphenated root Dockerfile', ['Dockerfile-prod'], all],
  ['shared environment', ['.env.example'], all],
  ['shared npm config', ['.npmrc'], all],
  ['workflow', ['.github/workflows/lint.yml'], all],
  ['CI helper', ['.github/scripts/ci/changes.mjs'], all],
  ['backend container', ['backend/Dockerfile'], { ...none, backend: true, compose: true }],
  ['hyphenated backend Dockerfile', ['backend/Dockerfile-prod'], { ...none, backend: true, compose: true }],
  ['underscored service Dockerfile', ['services/foo/Dockerfile_dev'], { ...none, services: true, compose: true }],
  ['frontend Dockerfile suffix', ['frontend/DockerfileProd'], { ...none, frontend: true, compose: true }],
  ['nested runtime names are not root configuration', ['docs/compose-dev.yml', 'docs/.envrc', 'docs/Dockerfile-prod'], none],
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

test('git diff reads a complete path list larger than the default 1 MiB buffer', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ci-large-diff-'))
  const original = process.cwd()
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim()
  try {
    git('init', '-q')
    git('config', 'user.email', 'ci@example.invalid')
    git('config', 'user.name', 'CI test')
    git('commit', '--allow-empty', '-qm', 'base')
    const base = git('rev-parse', 'HEAD')
    const blob = execFileSync('git', ['hash-object', '-w', '--stdin'], {
      cwd: dir, input: '', encoding: 'utf8',
    }).trim()
    const paths = Array.from({ length: 12000 }, (_, i) => `backend/${String(i).padStart(5, '0')}-${'x'.repeat(90)}.ts`)
    assert.ok(Buffer.byteLength(paths.join('\0')) > 1024 * 1024)
    // Populate the Git index directly to avoid creating thousands of files.
    execFileSync('git', ['update-index', '--index-info'], {
      cwd: dir, input: paths.map((path) => `100644 ${blob}\t${path}\n`).join(''),
    })
    git('commit', '-qm', 'large diff')
    const head = git('rev-parse', 'HEAD')
    process.chdir(dir)
    assert.deepEqual(changedPaths(base, head), paths)
  } finally {
    process.chdir(original)
    rmSync(dir, { recursive: true, force: true })
  }
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

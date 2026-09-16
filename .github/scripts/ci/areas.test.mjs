import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

function repository(files, run) {
  const root = mkdtempSync(join(tmpdir(), 'ci-areas-'))
  try {
    execFileSync('git', ['init', '-q', root])
    for (const [file, content] of Object.entries(files)) {
      mkdirSync(dirname(join(root, file)), { recursive: true })
      writeFileSync(join(root, file), content)
    }
    execFileSync('git', ['add', '.'], { cwd: root })
    run(root)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

function check(area, root, env = {}) {
  return spawnSync('bash', [fileURLToPath(new URL(`./${area}.sh`, import.meta.url))], {
    cwd: root, encoding: 'utf8', env: { ...process.env, ...env },
  })
}

for (const area of ['services', 'infra']) {
  test(`${area}: documentation-only placeholder needs no invented toolchain`, () => {
    repository({ [`${area}/README.md`]: '# Planned' }, (root) => {
      const result = check(area, root)
      assert.equal(result.status, 0, result.stderr)
      assert.match(result.stdout, /documentation only/)
    })
  })

  test(`${area}: implementation without a CI entry point fails`, () => {
    repository({ [`${area}/main.py`]: 'print("example")' }, (root) => {
      const result = check(area, root)
      assert.equal(result.status, 1)
      assert.match(result.stderr, /ci\.sh/)
    })
  })

  test(`${area}: declared checks execute and their failures propagate`, () => {
    repository({ [`${area}/ci.sh`]: 'echo ran-declared-checks; exit 7' }, (root) => {
      const result = check(area, root)
      assert.equal(result.status, 7)
      assert.match(result.stdout, /ran-declared-checks/)
    })
  })
}

test('Terraform checks format once and init/validate each module without remote state', () => {
  repository({ 'infra/main.tf': '', 'infra/modules/example/main.tf.json': '{}' }, (root) => {
    const bin = join(root, 'bin')
    mkdirSync(bin)
    writeFileSync(join(bin, 'terraform'), '#!/usr/bin/env bash\nprintf "%s\\n" "$*" >> "$TF_LOG_FILE"\n', { mode: 0o755 })
    const log = join(root, 'calls')
    const result = check('infra', root, { PATH: `${bin}:${process.env.PATH}`, TF_LOG_FILE: log })
    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual(readFileSync(log, 'utf8').trim().split('\n'), [
      'fmt -check -recursive infra',
      '-chdir=infra init -backend=false -input=false',
      '-chdir=infra validate -no-color',
      '-chdir=infra/modules/example init -backend=false -input=false',
      '-chdir=infra/modules/example validate -no-color',
    ])
    writeFileSync(join(bin, 'terraform'), '#!/usr/bin/env bash\nexit 9\n', { mode: 0o755 })
    assert.equal(check('infra', root, { PATH: `${bin}:${process.env.PATH}` }).status, 9)
  })
})

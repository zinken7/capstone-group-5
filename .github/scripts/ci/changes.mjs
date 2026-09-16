import { execFileSync } from 'node:child_process'
import { appendFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export function affectedAreas(paths, eventName) {
  const areas = { frontend: false, backend: false, services: false, infra: false, compose: false }
  const all = () => Object.fromEntries(Object.keys(areas).map((area) => [area, true]))
  if (eventName === 'push') return all()
  if (eventName !== 'pull_request') throw new Error(`Unsupported CI event: ${eventName}`)

  for (const path of paths) {
    // Workflow and shared toolchain changes must exercise every CI path.
    if (path.startsWith('.github/workflows/') || path.startsWith('.github/scripts/ci/') ||
        /^(package(-lock)?\.json|\.nvmrc|\.node-version|\.npmrc)$/.test(path)) return all()

    // Root runtime configuration can affect every area as the stack grows.
    if (/^(docker-compose|compose)(\.[^/]+)?\.ya?ml$/.test(path) ||
        /^\.env(\.[^/]+)?$/.test(path) || /^(Dockerfile(\.[^/]+)?|\.dockerignore)$/.test(path)) return all()

    // Documentation anywhere in an area must not start application jobs.
    if (/\.(md|mdx|rst)$/i.test(path)) continue
    const area = path.split('/')[0]
    if (Object.hasOwn(areas, area)) areas[area] = true
    if (/^(frontend|backend|services)\/(.*\/)?(Dockerfile(\.[^/]+)?|\.dockerignore)$/.test(path)) {
      areas.compose = true
    }
  }
  return areas
}

export function changedPaths(base, head) {
  if (!/^[a-f0-9]{40}$/.test(base ?? '') || !/^[a-f0-9]{40}$/.test(head ?? '')) {
    throw new Error('Pull request base/head must be full commit SHAs')
  }
  // --no-renames includes both sides of a cross-area move. NUL delimiters
  // preserve filenames containing whitespace. No API pagination/file limit.
  return execFileSync('git', ['diff', '--name-only', '--no-renames', '-z', `${base}...${head}`, '--'],
    { encoding: 'utf8' }).split('\0').filter(Boolean)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const event = process.env.GITHUB_EVENT_NAME
  const paths = event === 'pull_request' ? changedPaths(process.env.PR_BASE_SHA, process.env.PR_HEAD_SHA) : []
  const areas = affectedAreas(paths, event)
  const output = Object.entries(areas).map(([area, affected]) => `${area}=${affected}`).join('\n')
  console.log(output)
  appendFileSync(process.env.GITHUB_OUTPUT, `${output}\n`)
}

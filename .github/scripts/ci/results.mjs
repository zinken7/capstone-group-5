import { pathToFileURL } from 'node:url'

export function checkResults(needs) {
  if (needs.changes?.result !== 'success') throw new Error('Change detection did not succeed')
  const jobs = {
    frontend: 'frontend-lint', backend: 'backend-checks', services: 'services-checks',
    infra: 'infra-checks', compose: 'compose-config',
  }
  for (const [area, job] of Object.entries(jobs)) {
    const selected = needs.changes.outputs[area]
    if (!['true', 'false'].includes(selected)) throw new Error(`Missing selection for ${area}`)
    const expected = selected === 'true' ? 'success' : 'skipped'
    if (needs[job]?.result !== expected) throw new Error(`${job}: expected ${expected}, got ${needs[job]?.result}`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  checkResults(JSON.parse(process.env.CI_NEEDS))
  console.log('All selected CI checks passed; unrelated jobs were skipped.')
}

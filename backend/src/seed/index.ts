import { parseArgs } from 'node:util'
import { Client } from 'pg'

import { config } from '../config.js'
import { assertFixturesAllowed, seedFixtures } from './fixtures.js'
import { loadSeed, SeedValidationError } from './load.js'
import { seedReference, type RowCounts } from './reference.js'

function printCounts(heading: string, counts: RowCounts): void {
  console.log(heading)
  for (const [table, count] of Object.entries(counts)) {
    console.log(`  ${table}: ${count}`)
  }
}

/**
 * `--reference` upserts the public catalogue, `--fixtures` reloads the
 * synthetic development data, and neither flag runs both. Every file is
 * validated before the first database call.
 */
async function seed(): Promise<void> {
  const { values } = parseArgs({
    options: {
      reference: { type: 'boolean', default: false },
      fixtures: { type: 'boolean', default: false },
    },
  })
  const runReference = values.reference || !values.fixtures
  const runFixtures = values.fixtures || !values.reference

  if (runFixtures) {
    assertFixturesAllowed()
  }

  const data = await loadSeed(runFixtures ? ['reference', 'fixtures'] : ['reference'])

  const client = new Client({
    connectionString: config.databaseUrl,
  })

  await client.connect()

  try {
    if (runReference) {
      printCounts('Reference data upserted', await seedReference(client, data))
    }

    if (runFixtures) {
      printCounts('Fixtures loaded', await seedFixtures(client, data))
    }
  } finally {
    await client.end()
  }
}

seed().catch((error: unknown) => {
  if (error instanceof SeedValidationError) {
    console.error(error.message)
  } else {
    console.error('Seed failed:', error)
  }
  process.exitCode = 1
})

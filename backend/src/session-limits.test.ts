import { randomUUID } from 'node:crypto'
import { Client } from 'pg'
import { describe, expect, it } from 'vitest'

import { config } from './config.js'
import { applySessionLimits } from './session-limits.js'
import { databaseNameOf } from './test/database-url.js'

const databaseName = databaseNameOf(config.databaseUrl)
// A role that may use the test database but does not own it; roles are shared by the whole server
const PROBE_ROLE = 'amem_session_limits_probe'

async function withClient<T>(connectionString: string, use: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString })
  await client.connect()
  try {
    return await use(client)
  } finally {
    await client.end()
  }
}

/** The limits a new session gets, which is what the API's connections see. */
async function limitsOfNewSession(connectionString: string): Promise<{ statement: string; idle: string }> {
  return withClient(connectionString, async (client) => {
    const { rows } = await client.query<{ statement: string; idle: string }>(
      "SELECT current_setting('statement_timeout') AS statement, current_setting('idle_in_transaction_session_timeout') AS idle",
    )
    return rows[0]!
  })
}

/** What a plain pg_dump and restore leaves: no database-level limits. */
async function removeDatabaseLimits(owner: Client): Promise<void> {
  const database = owner.escapeIdentifier(databaseName)
  await owner.query(`ALTER DATABASE ${database} RESET statement_timeout`)
  await owner.query(`ALTER DATABASE ${database} RESET idle_in_transaction_session_timeout`)
}

async function dropProbeRole(owner: Client): Promise<void> {
  const existing = await owner.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [PROBE_ROLE])
  if ((existing.rowCount ?? 0) === 0) return
  // Dropping the role also removes its per-database settings
  await owner.query(`REVOKE ALL ON DATABASE ${owner.escapeIdentifier(databaseName)} FROM ${PROBE_ROLE}`)
  await owner.query(`DROP ROLE ${PROBE_ROLE}`)
}

describe('applySessionLimits', () => {
  it('puts the limits back on a database restored without them', async () => {
    await withClient(config.databaseUrl, async (owner) => {
      try {
        await removeDatabaseLimits(owner)
        expect(await limitsOfNewSession(config.databaseUrl)).toEqual({ statement: '0', idle: '0' })

        expect(await applySessionLimits(owner)).toMatchObject({ scope: 'database', database: databaseName })
      } finally {
        await applySessionLimits(owner)
      }
    })

    expect(await limitsOfNewSession(config.databaseUrl)).toEqual({ statement: '15s', idle: '1min' })
  })

  it('sets the limits for its own role when the role does not own the database', async () => {
    const password = randomUUID()
    const probeUrl = new URL(config.databaseUrl)
    probeUrl.username = PROBE_ROLE
    probeUrl.password = password

    await withClient(config.databaseUrl, async (owner) => {
      await dropProbeRole(owner)
      await owner.query(`CREATE ROLE ${PROBE_ROLE} LOGIN PASSWORD ${owner.escapeLiteral(password)}`)
      await owner.query(`GRANT ALL PRIVILEGES ON DATABASE ${owner.escapeIdentifier(databaseName)} TO ${PROBE_ROLE}`)
      await removeDatabaseLimits(owner)
    })

    try {
      await withClient(probeUrl.toString(), async (probe) => {
        // Every privilege on the database is not enough for ALTER DATABASE
        await expect(
          probe.query(`ALTER DATABASE ${probe.escapeIdentifier(databaseName)} SET statement_timeout = '15s'`),
        ).rejects.toThrow(/must be owner of database/)

        expect(await applySessionLimits(probe)).toEqual({ scope: 'role', database: databaseName, role: PROBE_ROLE })
      })

      expect(await limitsOfNewSession(probeUrl.toString())).toEqual({ statement: '15s', idle: '1min' })
      // The owner's sessions are untouched: the limits cover the probe role only
      expect(await limitsOfNewSession(config.databaseUrl)).toEqual({ statement: '0', idle: '0' })
    } finally {
      await withClient(config.databaseUrl, async (owner) => {
        await dropProbeRole(owner)
        await applySessionLimits(owner)
      })
    }
  })
})

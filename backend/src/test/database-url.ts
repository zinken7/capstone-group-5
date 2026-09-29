/** A database is treated as a test database when it is named `test` or ends with `_test`. */
export function isTestDatabaseName(name: string): boolean {
  return name === 'test' || name.endsWith('_test')
}

export function databaseNameOf(connectionString: string): string {
  const name = new URL(connectionString).pathname.replace(/^\//, '')
  if (!name) {
    throw new Error('Database connection string has no database name')
  }
  return name
}

/**
 * Resolves the connection string the test suite uses.
 * TEST_DATABASE_URL wins when set; otherwise DATABASE_URL is used as-is when it already
 * names a test database, and its database name gets a `_test` suffix when it does not.
 */
export function resolveTestDatabaseUrl(env: {
  TEST_DATABASE_URL?: string | undefined
  DATABASE_URL?: string | undefined
}): string {
  const explicit = env.TEST_DATABASE_URL?.trim()
  if (explicit) return explicit

  const base = env.DATABASE_URL?.trim()
  if (!base) {
    throw new Error('DATABASE_URL or TEST_DATABASE_URL is required to run the tests')
  }

  const name = databaseNameOf(base)
  if (isTestDatabaseName(name)) return base

  const url = new URL(base)
  url.pathname = `/${name}_test`
  return url.toString()
}

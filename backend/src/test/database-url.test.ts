import { describe, expect, it } from 'vitest'

import { databaseNameOf, isTestDatabaseName, resolveTestDatabaseUrl } from './database-url.js'

const dev = 'postgresql://user:secret@localhost:5432/autonomous_mining'

describe('isTestDatabaseName', () => {
  it('accepts "test" and names ending in "_test"', () => {
    expect(isTestDatabaseName('test')).toBe(true)
    expect(isTestDatabaseName('autonomous_mining_test')).toBe(true)
  })

  it('rejects other names', () => {
    expect(isTestDatabaseName('autonomous_mining')).toBe(false)
    expect(isTestDatabaseName('testing')).toBe(false)
    expect(isTestDatabaseName('')).toBe(false)
  })
})

describe('databaseNameOf', () => {
  it('extracts the database name from a connection string', () => {
    expect(databaseNameOf(dev)).toBe('autonomous_mining')
  })

  it('throws when the connection string has no database name', () => {
    expect(() => databaseNameOf('postgresql://user:secret@localhost:5432/')).toThrow('no database name')
  })
})

describe('resolveTestDatabaseUrl', () => {
  it('appends _test to a development database name', () => {
    expect(resolveTestDatabaseUrl({ DATABASE_URL: dev })).toBe(
      'postgresql://user:secret@localhost:5432/autonomous_mining_test',
    )
  })

  it('keeps DATABASE_URL when it already names a test database', () => {
    const ci = 'postgresql://test:test@localhost:5432/test'
    expect(resolveTestDatabaseUrl({ DATABASE_URL: ci })).toBe(ci)
    expect(resolveTestDatabaseUrl({ DATABASE_URL: `${dev}_test` })).toBe(`${dev}_test`)
  })

  it('prefers TEST_DATABASE_URL when set', () => {
    const explicit = 'postgresql://user:secret@db:5432/other_test'
    expect(resolveTestDatabaseUrl({ DATABASE_URL: dev, TEST_DATABASE_URL: explicit })).toBe(explicit)
  })

  it('throws when neither variable is set', () => {
    expect(() => resolveTestDatabaseUrl({})).toThrow('DATABASE_URL or TEST_DATABASE_URL is required')
  })
})

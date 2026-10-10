import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

import { resolveTestDatabaseUrl } from './src/test/database-url'

// Same file config.ts loads; existing environment variables are not overridden
const environmentFile = fileURLToPath(new URL('../.env', import.meta.url))
if (existsSync(environmentFile)) {
  process.loadEnvFile(environmentFile)
}

export default defineConfig({
  test: {
    // Tests share one database, so run files serially to avoid clearing each other's data
    fileParallelism: false,
    // Never point the suite at the development database: derive a dedicated test database
    env: {
      DATABASE_URL: resolveTestDatabaseUrl(process.env),
      SESSION_SECRET: 'test-only-session-secret-0123456789abcdef',
    },
    globalSetup: ['./src/test/global-setup.ts'],
  },
})

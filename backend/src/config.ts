import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const environmentFile = fileURLToPath(new URL('../../.env', import.meta.url))

if (existsSync(environmentFile)) {
  process.loadEnvFile(environmentFile)
}

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name]

  if (!value) {
    throw new Error(`${name} is required`)
  }

  return value
}

function parsePort(value: string): number {
  const port = Number(value)

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`PORT must be an integer between 1 and 65535; received ${value}`)
  }

  return port
}

export const config = Object.freeze({
  databaseUrl: requiredEnvironmentVariable('DATABASE_URL'),
  port: parsePort(process.env.PORT ?? '3000'),
  // Read on first use, so the public API runs even where administrator
  // sign-in is not configured yet.
  get sessionSecret(): string {
    const secret = requiredEnvironmentVariable('SESSION_SECRET')
    if (secret.length < 32) {
      throw new Error('SESSION_SECRET must be at least 32 characters')
    }
    return secret
  },
  // Cookies are Secure everywhere except local development and tests over HTTP.
  get secureCookies(): boolean {
    return process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test'
  },
})

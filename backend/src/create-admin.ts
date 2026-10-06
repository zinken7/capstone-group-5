import { parseArgs } from 'node:util'

import { closeDatabase } from './database.js'
import { createAdmin } from './services/admin-auth.js'

const usage = 'Usage: npm run admin:create -- --email <email> [--root]'

/**
 * Creates an administrator with a temporary password, printed once. Root
 * administrators can only be created here, never from the application.
 */
async function main(): Promise<void> {
  const { values } = parseArgs({
    options: { email: { type: 'string' }, root: { type: 'boolean', default: false } },
  })
  const email = values.email?.trim()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error(usage)
    process.exitCode = 1
    return
  }

  const role = values.root ? 'root' : 'admin'
  const outcome = await createAdmin(email, role)
  if (outcome.kind === 'exists') {
    console.error(`An administrator with the email ${email} already exists`)
    process.exitCode = 1
    return
  }

  console.log(`Created ${role} administrator ${email.toLowerCase()}`)
  console.log(`Temporary password (shown once): ${outcome.temporaryPassword}`)
  console.log('It must be changed at first sign-in.')
}

main()
  .catch((error: unknown) => {
    console.error('Creating the administrator failed:', error)
    process.exitCode = 1
  })
  .finally(() => closeDatabase())

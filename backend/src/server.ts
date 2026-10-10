import app from './app.js'
import { config } from './config.js'
import { closeDatabase } from './database.js'

/** Upper bound for in-flight requests and pool shutdown before the process exits anyway. */
const SHUTDOWN_TIMEOUT_MS = 10_000

const server = app.listen(config.port, (error) => {
  if (error) {
    console.error('Failed to start API:', error)
    process.exitCode = 1
    return
  }

  console.log(`API listening on http://localhost:${config.port}`)
})

let shuttingDown = false

/** Stop accepting connections, let in-flight requests finish, release the pool, then exit. */
function shutdown(signal: NodeJS.Signals): void {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`Received ${signal}, shutting down`)

  const timer = setTimeout(() => {
    console.error(`Shutdown timed out after ${SHUTDOWN_TIMEOUT_MS}ms, exiting`)
    process.exit(1)
  }, SHUTDOWN_TIMEOUT_MS)
  timer.unref()

  server.close((closeError) => {
    void (async () => {
      let failed = false
      if (closeError) {
        failed = true
        console.error('Failed to close HTTP server:', closeError)
      }
      try {
        await closeDatabase()
        console.log('Database pool closed')
      } catch (databaseError) {
        failed = true
        console.error('Failed to close database pool:', databaseError)
      }
      process.exit(failed ? 1 : 0)
    })()
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

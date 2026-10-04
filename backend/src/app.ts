import express from 'express'

import mapRouter from './routes/map.js'
import registerRouter from './routes/register.js'
import sitesRouter from './routes/sites.js'
import { checkDatabaseHealth } from './database.js'

const app = express()

app.use(express.json())

app.get('/health', (_request, response) => {
  response.status(200).json({ status: 'ok' })
})

app.use('/api', mapRouter)
app.use('/api', sitesRouter)
app.use('/api', registerRouter)
app.get('/health/database', async (_request, response) => {
  try {
    const versions = await checkDatabaseHealth()

    response.status(200).json({
      status: 'ok',
      database: {
        status: 'connected',
        ...versions,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Database health check failed:', message)

    response.status(503).json({
      status: 'error',
      database: { status: 'unavailable' },
    })
  }
})

export default app

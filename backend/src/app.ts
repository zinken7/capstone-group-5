import express from 'express'
import type { NextFunction, Request, Response } from 'express'

import adminModerationRouter from './routes/admin-moderation.js'
import adminSessionRouter from './routes/admin-session.js'
import adminUsersRouter from './routes/admin-users.js'
import analyticsRouter from './routes/analytics.js'
import contributionsRouter from './routes/contributions.js'
import deploymentsRouter from './routes/deployments.js'
import mapRouter from './routes/map.js'
import referenceDataRouter from './routes/reference-data.js'
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
app.use('/api', analyticsRouter)
app.use('/api', referenceDataRouter)
app.use('/api', contributionsRouter)
app.use('/api', deploymentsRouter)
app.use('/api', adminSessionRouter)
app.use('/api', adminModerationRouter)
app.use('/api', adminUsersRouter)
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

// Body parser errors carry a 4xx status; answer them as JSON instead of the default HTML page
app.use((error: unknown, _request: Request, response: Response, next: NextFunction) => {
  const status = typeof error === 'object' && error !== null && 'status' in error ? error.status : undefined
  if (status === 400 || status === 413) {
    response.status(status).json({ error: status === 413 ? 'request body too large' : 'invalid JSON body' })
    return
  }
  next(error)
})

export default app

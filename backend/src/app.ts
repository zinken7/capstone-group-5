import express from 'express'

import mapRouter from './routes/map.js'
import sitesRouter from './routes/sites.js'

const app = express()

app.use(express.json())

app.get('/health', (_request, response) => {
  response.status(200).json({ status: 'ok' })
})

app.use('/api', mapRouter)
app.use('/api', sitesRouter)

export default app

import app from './app.js'
import { config } from './config.js'

app.listen(config.port, (error) => {
  if (error) {
    console.error('Failed to start API:', error)
    process.exitCode = 1
    return
  }

  console.log(`API listening on http://localhost:${config.port}`)
})

import app from './app.js'

const port = Number(process.env.PORT ?? 3000)

app.listen(port, (error) => {
  if (error) {
    console.error('Failed to start API:', error)
    process.exitCode = 1
    return
  }

  console.log(`API listening on http://localhost:${port}`)
})

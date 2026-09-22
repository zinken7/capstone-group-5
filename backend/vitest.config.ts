import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Tests share one database, so run files serially to avoid clearing each other's data
    fileParallelism: false,
  },
})

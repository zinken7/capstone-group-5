import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // 测试共用一个数据库，文件间串行执行避免互相清表 / Tests share one database, so run files serially to avoid clearing each other's data
    fileParallelism: false,
  },
})

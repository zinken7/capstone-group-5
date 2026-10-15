import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
  // Each test starts with this browser's storage empty
  window.localStorage.clear()
  window.sessionStorage.clear()
})
import { afterEach, describe, expect, it, vi } from 'vitest'

import { applyScrollbarWidth, measureScrollbarWidth } from './scrollbar'

afterEach(() => {
  vi.restoreAllMocks()
  document.documentElement.style.removeProperty('--scrollbar-width')
})

describe('scrollbar width', () => {
  it('is the space a scrolling box loses to its scrollbar', () => {
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(100)
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(85)

    expect(measureScrollbarWidth()).toBe(15)
    applyScrollbarWidth()
    expect(document.documentElement.style.getPropertyValue('--scrollbar-width')).toBe('15px')
  })

  it('is zero where scrollbars overlay the content, and leaves no probe behind', () => {
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(100)
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(100)

    expect(measureScrollbarWidth()).toBe(0)
    expect(document.body.children).toHaveLength(0)
  })
})

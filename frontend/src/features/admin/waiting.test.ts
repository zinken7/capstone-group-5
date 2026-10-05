import { describe, expect, it } from 'vitest'

import { formatWaiting } from './waiting'

const now = new Date('2026-10-05T12:00:00Z')

describe('formatWaiting', () => {
  it.each([
    ['2026-10-05T11:59:40Z', 'Just now'],
    ['2026-10-05T11:15:00Z', '45 min'],
    ['2026-10-05T09:00:00Z', '3 h'],
    ['2026-10-04T11:00:00Z', '1 day'],
    ['2026-09-30T12:00:00Z', '5 days'],
  ])('describes %s as %s', (iso, expected) => {
    expect(formatWaiting(iso, now)).toBe(expected)
  })

  it('never goes negative for a clock slightly ahead', () => {
    expect(formatWaiting('2026-10-05T12:00:30Z', now)).toBe('Just now')
  })
})

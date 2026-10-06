import { describe, expect, it } from 'vitest'

import { honeypotFilled } from './honeypot.js'

describe('honeypotFilled', () => {
  it('passes a body without the field, or with it left blank', () => {
    expect(honeypotFilled({ site_name: 'Roy Hill' })).toBe(false)
    expect(honeypotFilled({ website: '' })).toBe(false)
    expect(honeypotFilled({ website: '   ' })).toBe(false)
    expect(honeypotFilled({ website: null })).toBe(false)
  })

  it('flags a body with the field filled', () => {
    expect(honeypotFilled({ website: 'https://spam.example' })).toBe(true)
    expect(honeypotFilled({ website: 1 })).toBe(true)
    expect(honeypotFilled({ website: ['x'] })).toBe(true)
  })

  it('ignores bodies that are not objects', () => {
    expect(honeypotFilled(null)).toBe(false)
    expect(honeypotFilled([{ website: 'x' }])).toBe(false)
    expect(honeypotFilled('website=x')).toBe(false)
  })
})

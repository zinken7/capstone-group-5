import { describe, expect, it } from 'vitest'

import { toCsv } from './csv.js'

describe('toCsv', () => {
  it('writes a header row and data rows with CRLF line endings', () => {
    expect(toCsv(['id', 'name'], [[1, 'Roy Hill'], [2, 'Mount Whaleback']])).toBe(
      'id,name\r\n1,Roy Hill\r\n2,Mount Whaleback\r\n',
    )
  })

  it('quotes cells containing commas, quotes or line breaks', () => {
    expect(toCsv(['a', 'b', 'c'], [['x,y', 'say "hi"', 'two\nlines']])).toBe(
      'a,b,c\r\n"x,y","say ""hi""","two\nlines"\r\n',
    )
  })

  it('writes null as an empty cell', () => {
    expect(toCsv(['a', 'b'], [[null, 'x']])).toBe('a,b\r\n,x\r\n')
  })

  it('neutralises text that a spreadsheet would run as a formula', () => {
    expect(toCsv(['a'], [['=HYPERLINK("x")'], ['+1'], ['-2'], ['@SUM(A1)']])).toBe(
      'a\r\n"\'=HYPERLINK(""x"")"\r\n\'+1\r\n\'-2\r\n\'@SUM(A1)\r\n',
    )
  })

  it('leaves numbers unchanged', () => {
    expect(toCsv(['n'], [[-5]])).toBe('n\r\n-5\r\n')
  })
})

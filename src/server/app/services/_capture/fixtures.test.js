import { describe, expect, it } from 'vitest'

import { countriesOrigin, portsOfEntry } from './fixtures.js'

describe('#captured reference fixtures', () => {
  it('Should load countries-origin as { code, name, subDivisions } entries', () => {
    expect(countriesOrigin).toContainEqual({
      code: 'AT',
      name: 'Austria',
      subDivisions: []
    })
  })

  it('Should load ports-of-entry as { code, name, type } entries', () => {
    expect(portsOfEntry).toContainEqual({
      code: 'GB ABD',
      name: 'Aberdeen Harbour',
      type: 'seaport'
    })
  })

  it('Should hold the captured ports airports first, then seaports, then rail ports', () => {
    const PORT_TYPE_ORDER = ['airport', 'seaport', 'rail']
    const ranks = portsOfEntry.map(({ type }) => PORT_TYPE_ORDER.indexOf(type))

    expect(ranks).not.toContain(-1)
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
  })
})

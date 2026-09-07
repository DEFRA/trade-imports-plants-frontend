import { describe, expect, it } from 'vitest'

import { commodityTypes } from './index.js'

describe('#commodityTypes', () => {
  it('Should offer the three commodity types in the journey order', () => {
    expect(commodityTypes()).toEqual([
      'potatoes',
      'plants-for-planting',
      'wood-and-cut-trees'
    ])
  })

  it('Should refuse a caller that tries to extend the list', () => {
    expect(() => commodityTypes().push('bulbs')).toThrow(TypeError)
    expect(commodityTypes()).toHaveLength(3)
  })

  it('Should refuse a caller that tries to rewrite a value', () => {
    expect(() => {
      commodityTypes()[0] = 'bulbs'
    }).toThrow(TypeError)
    expect(commodityTypes()[0]).toBe('potatoes')
  })
})

import { describe, expect, it } from 'vitest'
import { isCopyLeaf, leaves } from '../../../../../../../shared/copy-leaves.js'
import { copy as en } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

describe('confirmation copy', () => {
  it.each([en, cy])('Should provide non-empty receipt copy', (copy) => {
    for (const { value } of leaves(copy)) {
      expect(isCopyLeaf(value)).toBe(true)
    }
  })
})

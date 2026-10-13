import { describe, expect, it } from 'vitest'
import { isCopyLeaf, leaves } from '../../../../../../../shared/copy-leaves.js'
import { copy as en } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

describe('declaration copy', () => {
  it.each([en, cy])(
    'Should contain non-empty copy and three plants statements',
    (copy) => {
      for (const { value } of leaves(copy)) {
        expect(isCopyLeaf(value)).toBe(true)
      }
      expect(copy.body).toHaveLength(3)
    }
  )

  it('Should name the confirmation group for screen readers', () => {
    expect(en.declarationLegend).toBe('Declaration confirmation')
    expect(cy.declarationLegend).toBe('Cadarnhad y datganiad')
  })
})

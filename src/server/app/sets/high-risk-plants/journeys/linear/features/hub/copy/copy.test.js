import { describe, expect, it } from 'vitest'

import { isCopyLeaf, leaves } from '../../../../../../../shared/copy-leaves.js'
import { GROUPS } from '../controller.js'
import { copy } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

describe('#copy', () => {
  it('Should hold a non-empty string or copy function at every leaf', () => {
    for (const { path, value } of leaves(copy)) {
      expect(isCopyLeaf(value), `${path} must be copy`).toBe(true)
    }
  })

  it('Should name the four numbered groups in the design order', () => {
    expect(Object.values(copy.groups)).toEqual([
      '1. About the consignment',
      '2. Arrival and destination',
      '3. Consignment parties',
      '4. Check and submit'
    ])
  })

  it('Should carry the spec Welsh for every group it names', () => {
    expect(Object.values(cy.groups)).toEqual([
      '1. Am y llwyth',
      '2. Cyrraedd a chyrchfan',
      '3. Partïon y llwyth',
      '4. Gwirio a chyflwyno'
    ])
  })

  it('Should caption every group the controller renders, and no other', () => {
    expect(Object.keys(copy.groups)).toEqual(GROUPS.map((group) => group.id))
  })

  it('Should leave the task-row copy empty until a section lands its row', () => {
    expect(copy.rows).toEqual({})
  })
})

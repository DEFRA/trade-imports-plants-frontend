/**
 * Allow-list drift guard.
 *
 * `gatedOnCategory` keys its allow-list on the obligation's own `name` —
 * `allowListed(category, () => categoriesRequiring(name), …)` — and
 * `categoriesRequiring` answers the frozen empty list for a key it does not
 * hold. So renaming an obligation, or renaming its `CATEGORIES_BY_LINE_FIELD`
 * key, on one side alone puts the field in scope for no category at all, and
 * every other test in the set stays green. This file holds the two sides in
 * step: the manifest's per-line names against the service's field list, and
 * every gate's allow-list against the service's categories.
 */

import { describe, expect, it } from 'vitest'

import { commodityLine, obligations } from './index.js'
import {
  categories,
  categoriesRequiring,
  lineFields
} from '../services/commodities/index.js'

const CATEGORY = 'category'
const QUANTITY = 'quantity'

const perLineObligations = obligations.filter(
  (obligation) => obligation.within === commodityLine
)

const gatedObligations = perLineObligations.filter(
  (obligation) => typeof obligation.applyTo === 'function'
)

const nameOf = (obligation) => obligation.name

describe('per-line obligations and the service field list', () => {
  it('Should name a service field on every per-line obligation but the category', () => {
    const unknown = perLineObligations
      .map(nameOf)
      .filter((name) => name !== CATEGORY)
      .filter((name) => !lineFields().includes(name))

    expect(
      unknown,
      'a per-line obligation whose name is not a service field is in scope for no category'
    ).toEqual([])
  })

  it('Should carry an obligation for every field the service asks for', () => {
    const declared = new Set(perLineObligations.map(nameOf))
    const missing = lineFields().filter((field) => !declared.has(field))

    expect(missing).toEqual([])
  })

  it('Should gate every per-line field except the quantity every line carries', () => {
    expect(gatedObligations.map(nameOf).toSorted()).toEqual(
      lineFields()
        .filter((field) => field !== QUANTITY)
        .toSorted()
    )
    const ungated = perLineObligations.find(
      (obligation) => obligation.name === QUANTITY
    )
    expect(ungated.applyTo).toBeUndefined()
  })
})

describe('every gate resolves to a real, non-empty allow-list', () => {
  for (const obligation of gatedObligations) {
    it(`Should scope ${obligation.name} to categories the service knows`, () => {
      const allowed = categoriesRequiring(obligation.name)

      expect(
        allowed.length,
        `${obligation.name} applies on no category`
      ).toBeGreaterThan(0)
      expect(
        allowed.filter((category) => !categories().includes(category)),
        `${obligation.name} names a category the service does not offer`
      ).toEqual([])
    })
  }
})

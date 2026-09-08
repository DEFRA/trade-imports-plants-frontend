/**
 * Allow-list drift guard.
 *
 * `gatedOnCategory` keys its allow-list on the obligation's own `name` —
 * `allowListed(category, () => categoriesRequiring(name), …)` — and
 * `categoriesRequiring` answers the frozen empty list for a key it does not
 * hold. So renaming an obligation, or renaming its `CATEGORIES_BY_LINE_FIELD`
 * key, on one side alone puts the field in scope for no category at all, and
 * every other test in the set stays green. This file holds the two sides in
 * step: the manifest's per-line names against the service's field list, every
 * gate's allow-list against the service's categories, and every gate's
 * allow-list against the categories a commodity type actually offers.
 *
 * The origin constraints are held here for the same reason. They are not a
 * gate — a gate cannot read `category`, which lives one frame down on each
 * commodity line — so nothing in the model would notice a category or a
 * country code drifting out of the origin block the countries service primes.
 */

import { describe, expect, it } from 'vitest'

import { commodityLine, obligations } from './index.js'
import {
  categories,
  categoriesFor,
  categoriesRequiring,
  commodityTypes,
  lineFields,
  originConstraints,
  originCountriesFor
} from '../services/commodities/index.js'
import { originCountries } from '../../../services/countries/index.js'

const CATEGORY = 'category'
const QUANTITY = 'quantity'
const SEED_POTATOES = 'seed-potatoes'
const NON_MEMBER_STATES = ['IS', 'LI', 'NO', 'CH']

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

describe('every gate reaches a category a notification can hold', () => {
  const offered = commodityTypes().flatMap((type) => [...categoriesFor(type)])

  for (const obligation of gatedObligations) {
    it(`Should scope ${obligation.name} to categories a commodity type offers`, () => {
      expect(
        categoriesRequiring(obligation.name).filter(
          (category) => !offered.includes(category)
        ),
        `${obligation.name} applies on a category no commodity type offers, so it can never come into scope`
      ).toEqual([])
    })
  }
})

describe('the origin constraints stay inside the service vocabulary', () => {
  const constrainedCategories = originConstraints().flatMap((constraint) => [
    ...constraint.categories
  ])

  it('Should bind only categories the service offers', () => {
    expect(
      constrainedCategories.filter(
        (category) => !categories().includes(category)
      ),
      'an origin constraint names a category no line can carry'
    ).toEqual([])
  })

  it('Should bind each category at most once', () => {
    expect(constrainedCategories).toHaveLength(
      new Set(constrainedCategories).size
    )
  })

  it('Should leave seed potatoes unconstrained', () => {
    // reg 24A(1)(a) scopes them to the whole Common SPS Area, which is every
    // country the origin block offers.
    expect(constrainedCategories).not.toContain(SEED_POTATOES)
    expect(originCountriesFor(SEED_POTATOES)).toEqual([])
    expect(
      categories().filter(
        (category) => !constrainedCategories.includes(category)
      ),
      'a category the service offers has no origin constraint'
    ).toEqual([SEED_POTATOES])
  })

  it('Should name only countries the origin block primes', () => {
    const offered = originCountries().map(({ value }) => value)
    for (const constraint of originConstraints()) {
      expect(
        constraint.countries.filter((code) => !offered.includes(code)),
        `${constraint.id} names a country the origin block does not offer`
      ).toEqual([])
    }
  })

  it('Should order the constraints narrowest first', () => {
    const countryCounts = originConstraints().map(
      (constraint) => constraint.countries.length
    )
    expect(countryCounts).toEqual(
      countryCounts.toSorted((left, right) => left - right)
    )
  })

  it('Should hold the origin block minus the four non-member states', () => {
    const euMemberStates = originConstraints().find(
      (constraint) => constraint.id === 'eu-member-states'
    )
    const offered = originCountries().map(({ value }) => value)

    expect([...euMemberStates.countries].toSorted()).toEqual(
      offered.filter((code) => !NON_MEMBER_STATES.includes(code)).toSorted()
    )
    expect(euMemberStates.countries).toHaveLength(27)
  })

  it('Should answer every constrained category from the constraint that binds it', () => {
    for (const constraint of originConstraints()) {
      for (const category of constraint.categories) {
        expect(originCountriesFor(category)).toBe(constraint.countries)
      }
    }
  })

  it('Should refuse a caller that tries to extend a constraint', () => {
    expect(() => originConstraints().push({ id: 'anywhere' })).toThrow(
      TypeError
    )
    expect(() => originConstraints()[0].countries.push('ZZ')).toThrow(TypeError)
  })
})

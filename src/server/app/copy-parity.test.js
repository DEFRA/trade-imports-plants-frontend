import { describe, expect, it } from 'vitest'

import { leaves, isCopyLeaf } from './shared/copy-leaves.js'
import { copyFor } from './shared/copy.js'
import {
  copy as sharedEn,
  validatorDefaults as validatorDefaultsEn
} from './shared/copy.en.js'
import {
  copy as sharedCy,
  validatorDefaults as validatorDefaultsCy
} from './shared/copy.cy.js'

// The per-feature scan — one pair per feature copy/ folder, plus the
// journey's section-caption pair — lands back here with the first
// high-risk-plants feature. The set has none, so the shared chrome and the
// validator defaults are the only pairs today.

// String leaves that may legitimately be byte-identical across en and cy
// (proper nouns, codes, reference formats). Keyed `${module}:${path}` —
// every addition must be justified here.
const IDENTICAL_ALLOWLIST = new Set([])

const kindOf = (value) => (typeof value === 'function' ? 'function' : 'string')

const modulePairs = [
  { name: 'shared', en: sharedEn, cy: sharedCy },
  {
    name: 'shared.validatorDefaults',
    en: validatorDefaultsEn,
    cy: validatorDefaultsCy
  }
]

describe('copy parity — cy mirrors en structurally', () => {
  it('Should give cy the same paths, leaf kinds and function arities as en', () => {
    for (const { name, en, cy } of modulePairs) {
      const enLeaves = new Map(
        leaves(en).map((leaf) => [leaf.path, leaf.value])
      )
      const cyLeaves = new Map(
        leaves(cy).map((leaf) => [leaf.path, leaf.value])
      )
      expect(
        [...cyLeaves.keys()].sort(),
        `${name}: cy paths must equal en paths`
      ).toEqual([...enLeaves.keys()].sort())
      for (const [leafPath, enValue] of enLeaves) {
        const cyValue = cyLeaves.get(leafPath)
        expect(
          kindOf(cyValue),
          `${name}: ${leafPath} leaf kind must match`
        ).toBe(kindOf(enValue))
        if (typeof enValue === 'function') {
          expect(
            cyValue.length,
            `${name}: ${leafPath} function arity must match`
          ).toBe(enValue.length)
        }
      }
    }
  })

  it('Should keep every cy leaf valid copy', () => {
    for (const { name, cy } of modulePairs) {
      for (const { path: leafPath, value } of leaves(cy)) {
        expect(isCopyLeaf(value), `${name}: ${leafPath} must be copy`).toBe(
          true
        )
      }
    }
  })

  it('Should translate every string leaf unless allowlisted as identical', () => {
    for (const { name, en, cy } of modulePairs) {
      const cyLeaves = new Map(
        leaves(cy).map((leaf) => [leaf.path, leaf.value])
      )
      for (const { path: leafPath, value: enValue } of leaves(en)) {
        if (
          typeof enValue !== 'string' ||
          IDENTICAL_ALLOWLIST.has(`${name}:${leafPath}`)
        ) {
          continue
        }
        expect(
          cyLeaves.get(leafPath),
          `${name}: ${leafPath} must be translated (or allowlisted)`
        ).not.toBe(enValue)
      }
    }
  })
})

describe('copy parity — the locale seam resolves cy', () => {
  it('Should resolve the cy module and interpolate through it', () => {
    const copy = copyFor(
      { en: validatorDefaultsEn, cy: validatorDefaultsCy },
      'cy'
    )
    expect(copy).toBe(validatorDefaultsCy)
    expect(copy.maxLength(10)).toBe(validatorDefaultsCy.maxLength(10))
    expect(copy.maxLength(10)).not.toBe(validatorDefaultsEn.maxLength(10))
  })

  it('Should fall back to en for an unknown locale', () => {
    expect(
      copyFor({ en: validatorDefaultsEn, cy: validatorDefaultsCy }, 'fr')
    ).toBe(validatorDefaultsEn)
  })
})

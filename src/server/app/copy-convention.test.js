import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { leaves, isCopyLeaf } from './shared/copy-leaves.js'
import { copy as sharedCopy, validatorDefaults } from './shared/copy.en.js'

const FEATURES_DIR = fileURLToPath(
  new URL('./sets/high-risk-plants/journeys/linear/features', import.meta.url)
)

const featureDirs = readdirSync(FEATURES_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)

describe('copy convention — the per-feature half', () => {
  // The set owns no features, so the per-feature checks cannot run. Left as a
  // comment they would stay absent silently: the suite would go green with the
  // first feature, asserting nothing about it. This fails instead.
  it('Should be restored once the set owns a feature', () => {
    expect(
      featureDirs,
      'the set now owns features — restore the per-feature copy-convention ' +
        'checks (a copy/ folder with copy.en.js, copy.cy.js and copy.test.js ' +
        'per feature, and no copy files at a feature root)'
    ).toEqual([])
  })
})

describe('copy convention — shared chrome', () => {
  it('Should carry the chrome namespaces in the shared module', () => {
    expect(Object.keys(sharedCopy)).toEqual(
      expect.arrayContaining([
        'layout',
        'errorSummary',
        'saveActions',
        'journeyStrip'
      ])
    )
  })

  it('Should carry the footer meta-link labels the layout renders', () => {
    expect(sharedCopy.layout.footer).toEqual({
      privacy: 'Privacy',
      cookies: 'Cookies',
      accessibility: 'Accessibility statement'
    })
  })

  it('Should keep every shared and validator-default leaf valid copy', () => {
    for (const { path: leafPath, value } of [
      ...leaves(sharedCopy),
      ...leaves(validatorDefaults)
    ]) {
      expect(isCopyLeaf(value), `${leafPath} must be copy`).toBe(true)
    }
  })
})

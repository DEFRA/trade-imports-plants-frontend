import { describe, expect, it } from 'vitest'

import { leaves, isCopyLeaf } from './shared/copy-leaves.js'
import { copy as sharedCopy, validatorDefaults } from './shared/copy.en.js'

// The per-feature half of this convention — every feature owning a copy/
// folder with copy.en.js, copy.cy.js and copy.test.js, and no copy files at
// a feature root — lands back here with the first high-risk-plants feature.
// The set has none, so only the shared chrome is checkable today.

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

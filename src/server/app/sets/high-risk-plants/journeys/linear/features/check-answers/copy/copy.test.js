import { describe, expect, it } from 'vitest'

import { useStubbedHighRiskPlantsJourney } from '../../../test-support.js'
import { driveHandler } from '../../../../../../../engine/test-support.js'

import * as checkAnswers from '../controller.js'
import { REVIEW_CARDS } from '../view-model/incomplete-cards.js'
import { copy } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

import { isCopyLeaf, leaves } from '../../../../../../../shared/copy-leaves.js'

describe('checkAnswers copy module', () => {
  it('Should interpolate the supplied day count into both timing rules', () => {
    expect(copy.late.potatoes(9)).toContain('9 days before')
    expect(copy.late.plantsAndWood(9)).toContain('9 days after')
  })

  it('Should write the date created line with the supplied date', () => {
    expect(copy.viewHeader.dateCreated('22 July 2026')).toBe(
      'Date created: 22 July 2026'
    )
  })

  it('Should write the date submitted line with the supplied date', () => {
    expect(copy.viewHeader.dateSubmitted('22 July 2026')).toBe(
      'Date submitted: 22 July 2026'
    )
  })

  it('Should have a non-empty string or function at every leaf', () => {
    for (const { path, value } of leaves(copy)) {
      expect(isCopyLeaf(value), `${path} must be copy`).toBe(true)
    }
  })

  it('Should name an unfinished-card error for every review card, and no other', () => {
    const ids = REVIEW_CARDS.map((card) => card.id)
    expect(Object.keys(copy.errors.cards)).toEqual(ids)
    expect(Object.keys(cy.errors.cards)).toEqual(ids)
  })
})

describe('GET checkAnswers — copy reaches the view', () => {
  useStubbedHighRiskPlantsJourney()

  it('Should supply the feature copy module and the shared chrome copy', async () => {
    const get = checkAnswers.routes.find(
      (route) => route.method === 'GET'
    ).handler
    const result = await driveHandler(get)
    expect(result.view.context.copy).toBe(copy)
    expect(result.view.context.pageTitle).toBe(result.journeyId)
    expect(result.view.context.sharedCopy.saveActions.saveAndContinue).toBe(
      'Save and continue'
    )
  })
})

import { beforeAll, describe, expect, it } from 'vitest'

import { installHighRiskPlantsJourney } from '../test-support.js'
import { commodityTypePage } from '../features/commodity-type/page.js'
import { commoditiesPage } from '../features/commodities/page.js'
import { RUN_STEPS, nextRunTarget } from './run.js'

const JOURNEY_ID = 'HRP-0001'

const scopeOf = (...names) => ({
  inScope: new Set(names),
  answered: () => true
})

const answering = (...names) => ({
  inScope: new Set(names),
  answered: (id) => names.includes(id)
})

describe('#RUN_STEPS — the opening run', () => {
  beforeAll(() => installHighRiskPlantsJourney())

  it('Should open on commodity-type and go on to the commodities list', () => {
    expect(RUN_STEPS.map((step) => step.id)).toEqual([
      commodityTypePage.id,
      commoditiesPage.id
    ])
  })

  it('Should target the commodity-type page while its gate passes', () => {
    expect(RUN_STEPS[0].target(scopeOf('commodityType'), JOURNEY_ID)).toBe(
      `/notifications/${JOURNEY_ID}/commodity-type`
    )
  })

  it('Should target the commodities page once a commodity type is answered', () => {
    expect(
      RUN_STEPS[1].target(
        answering('commodityType', 'commodityLines'),
        JOURNEY_ID
      )
    ).toBe(`/notifications/${JOURNEY_ID}/commodities`)
  })

  it('Should skip a step whose gate fails', () => {
    expect(RUN_STEPS[0].target(scopeOf(), JOURNEY_ID)).toBeNull()
  })

  it('Should skip the commodities page while the entry question is unanswered', () => {
    expect(
      RUN_STEPS[1].target(answering('commodityLines'), JOURNEY_ID)
    ).toBeNull()
  })
})

describe('#nextRunTarget', () => {
  beforeAll(() => installHighRiskPlantsJourney())

  it('Should send the entry question on to the commodities list', () => {
    expect(
      nextRunTarget(
        commodityTypePage.id,
        answering('commodityType', 'commodityLines'),
        JOURNEY_ID
      )
    ).toBe(`/notifications/${JOURNEY_ID}/commodities`)
  })

  it("Should fall through to the overview after the run's last step", () => {
    expect(
      nextRunTarget(
        commoditiesPage.id,
        answering('commodityType', 'commodityLines'),
        JOURNEY_ID
      )
    ).toBe(`/notifications/${JOURNEY_ID}`)
  })

  it('Should fall through to the overview while the entry question is unanswered', () => {
    expect(
      nextRunTarget(
        commodityTypePage.id,
        answering('commodityLines'),
        JOURNEY_ID
      )
    ).toBe(`/notifications/${JOURNEY_ID}`)
  })

  it('Should decline a step id the run does not hold', () => {
    expect(
      nextRunTarget('not-a-step', scopeOf('commodityType'), JOURNEY_ID)
    ).toBeNull()
  })
})

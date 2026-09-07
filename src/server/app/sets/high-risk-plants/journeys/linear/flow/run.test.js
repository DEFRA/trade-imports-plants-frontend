import { beforeAll, describe, expect, it } from 'vitest'

import { installHighRiskPlantsJourney } from '../test-support.js'
import { commodityTypePage } from '../features/commodity-type/page.js'
import { RUN_STEPS, nextRunTarget } from './run.js'

const JOURNEY_ID = 'HRP-0001'

const scopeOf = (...names) => ({
  inScope: new Set(names),
  answered: () => true
})

describe('#RUN_STEPS — the opening run', () => {
  beforeAll(() => installHighRiskPlantsJourney())

  it('Should open on commodity-type and hold no other step yet', () => {
    expect(RUN_STEPS.map((step) => step.id)).toEqual([commodityTypePage.id])
  })

  it('Should target the commodity-type page while its gate passes', () => {
    expect(RUN_STEPS[0].target(scopeOf('commodityType'), JOURNEY_ID)).toBe(
      `/notifications/${JOURNEY_ID}/commodity-type`
    )
  })

  it('Should skip a step whose gate fails', () => {
    expect(RUN_STEPS[0].target(scopeOf(), JOURNEY_ID)).toBeNull()
  })
})

describe('#nextRunTarget', () => {
  beforeAll(() => installHighRiskPlantsJourney())

  it("Should fall through to the overview after the run's only step", () => {
    expect(
      nextRunTarget(commodityTypePage.id, scopeOf('commodityType'), JOURNEY_ID)
    ).toBe(`/notifications/${JOURNEY_ID}`)
  })

  it('Should decline a step id the run does not hold', () => {
    expect(
      nextRunTarget('not-a-step', scopeOf('commodityType'), JOURNEY_ID)
    ).toBeNull()
  })
})

import { describe, expect, it } from 'vitest'
import { commit, submitJourney } from './index.js'
import { records, DRAFT, SUBMITTED } from './persistence/records.js'
import { configureReadyForCheckYourAnswers } from './read.js'
import { stubH, useFreshDraftJourney } from './test-support.js'
import {
  SET_ID,
  VALUE_ONE,
  VALUE_TWO
} from '../../../../test/fixtures/index.js'

describe('submitJourney freezes a ready journey and leaves a not-ready one in draft', () => {
  const journey = useFreshDraftJourney(SET_ID)

  it('Should mark the journey submitted, keep its committed fulfilment, and refuse later writes', async () => {
    configureReadyForCheckYourAnswers(SET_ID, () => true)
    await commit(journey.request(), stubH(), { scalarField: VALUE_ONE })
    const committed = (await records.load({ journeyId: journey.journeyId() }))
      .fulfilment

    const result = await submitJourney(journey.request(), stubH())

    expect(result.ok).toBe(true)
    expect(result.journey.status).toBe(SUBMITTED)
    expect(result.journey.submittedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(result.journey.fulfilment).toEqual(committed)
    await expect(
      commit(journey.request(), stubH(), { scalarField: VALUE_TWO })
    ).rejects.toThrow(/is submitted — writes blocked/)
  })

  it('Should return not ok and leave the journey in draft when it is not ready', async () => {
    configureReadyForCheckYourAnswers(SET_ID, () => false)
    await commit(journey.request(), stubH(), { scalarField: VALUE_ONE })

    const result = await submitJourney(journey.request(), stubH())

    expect(result.ok).toBe(false)
    expect(
      (await records.load({ journeyId: journey.journeyId() })).status
    ).toBe(DRAFT)
  })
})

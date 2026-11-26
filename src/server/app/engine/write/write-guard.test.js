import { beforeEach, describe, expect, it } from 'vitest'
import { commit, appendEntryAt, submitJourney } from './index.js'
import { records, SUBMITTED } from '../persistence/records.js'
import { configureReadyForCheckYourAnswers } from '../read.js'
import { stubH, useFreshDraftJourney } from '../test-support.js'
import {
  SELECTOR_BRAVO,
  SET_ID,
  VALUE_ONE
} from '../../../../../test/fixtures/index.js'

describe('Engine writes refuse unrecognised answer keys and submit accepts unknown stored fulfilment keys', () => {
  const journey = useFreshDraftJourney(SET_ID)

  beforeEach(() => {
    configureReadyForCheckYourAnswers(SET_ID, () => true)
  })

  it('Should reject a commit whose patch carries a typo of an obligation name', async () => {
    await expect(
      commit(journey.request(), stubH(), {
        scalarFeild: VALUE_ONE
      })
    ).rejects.toThrow(/"scalarFeild" at \(top level\).*commit/s)
  })

  it('Should reject an appended entry carrying an unrecognised key', async () => {
    await commit(journey.request(), stubH(), {
      itemCollection: [{ itemSelector: SELECTOR_BRAVO, itemCount: '1' }]
    })
    await expect(
      appendEntryAt(
        journey.request(),
        stubH(),
        ['itemCollection', 0, 'nestedCollection'],
        { nestedGatedFeildB: VALUE_ONE }
      )
    ).rejects.toThrow(
      /"nestedGatedFeildB" at itemCollection\[0\]\.nestedCollection\[0\]/
    )
  })

  it('Should accept legitimate writes untouched', async () => {
    const { answers } = await commit(journey.request(), stubH(), {
      scalarField: VALUE_ONE
    })
    expect(answers.scalarField).toBe(VALUE_ONE)
  })

  it('Should submit a journey whose stored fulfilment holds an unknown UUID key', async () => {
    await records.replaceFulfilment(journey.journeyId(), {
      'historic-obligation-uuid': VALUE_ONE
    })

    const result = await submitJourney(journey.request(), stubH())

    expect(result.ok).toBe(true)
    expect(
      (await records.load({ journeyId: journey.journeyId() })).status
    ).toBe(SUBMITTED)
  })
})

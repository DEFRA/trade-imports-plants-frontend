import { describe, expect, it } from 'vitest'
import { commit, submitJourney } from './index.js'
import { records, SUBMITTED } from './persistence/records.js'
import { configureReadyForCheckYourAnswers } from './read.js'
import {
  authenticatedActor,
  backendJourneyId,
  backendNotification,
  fetchMock,
  journeyRequest,
  stubH,
  useBackendRecords,
  useFreshDraftJourney
} from './test-support.js'
import { SET_ID, VALUE_ONE } from '../../../../test/fixtures/index.js'

describe('submitJourney submits a ready journey through the records store', () => {
  describe('on the stub records', () => {
    const journey = useFreshDraftJourney(SET_ID)

    it('Should return the ready journey submitted and store it as submitted', async () => {
      configureReadyForCheckYourAnswers(SET_ID, () => true)
      await commit(journey.request(), stubH(), { scalarField: VALUE_ONE })

      const result = await submitJourney(journey.request(), stubH())

      expect(result.ok).toBe(true)
      expect(result.journey.journeyId).toBe(journey.journeyId())
      expect(result.journey.status).toBe(SUBMITTED)
      expect(
        (await records.load({ journeyId: journey.journeyId() })).status
      ).toBe(SUBMITTED)
    })
  })

  describe('on the backend', () => {
    useBackendRecords(SET_ID)

    it('Should post the submit for the journey id with the signed-in actor', async () => {
      configureReadyForCheckYourAnswers(SET_ID, () => true)
      fetchMock.mockResponse(async (request) => ({
        body:
          request.method === 'POST'
            ? backendNotification({
                status: 'SUBMITTED',
                submittedAt: '2026-07-23T10:00:00'
              })
            : backendNotification()
      }))

      const result = await submitJourney(
        journeyRequest(backendJourneyId),
        stubH()
      )

      const submitRequests = fetchMock
        .requests()
        .filter((request) => request.method === 'POST')
      expect(submitRequests.map((request) => request.url)).toEqual([
        expect.stringMatching(
          new RegExp(`/notifications/${backendJourneyId}/submit$`)
        )
      ])
      expect(await submitRequests[0].json()).toEqual(authenticatedActor)
      expect(result.journey.journeyId).toBe(backendJourneyId)
      expect(result.journey.status).toBe(SUBMITTED)
    })
  })
})

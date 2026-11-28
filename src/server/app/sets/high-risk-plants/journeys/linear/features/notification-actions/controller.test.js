import { SET_ID } from '../../../../set.js'
import { describe, expect, it } from 'vitest'

import {
  dashboardPath,
  hubPath,
  pagePath
} from '../../../../../../shared/paths.js'
import { CYA_SLUG } from '../../../../../../shared/kit.js'
import { records } from '../../../../../../engine/persistence/records.js'
import { knownJourneysCookie } from '../../../../../../engine/journey.js'
import {
  backendJourneyId,
  expectOneLogged,
  fetchMock,
  journeyRequest,
  stubH,
  useBackendRecords
} from '../../../../../../engine/test-support.js'
import { useStubbedHighRiskPlantsJourney } from '../../test-support.js'
import { routes } from './controller.js'

const copyPost = routes[0].handler

const copyPayload = { concurrencyToken: '0' }

const emptyNotificationList = JSON.stringify({
  page: 1,
  size: 20,
  totalElements: 0,
  totalPages: 0,
  content: []
})

const backendAnsweringCopyWith = (copyResponse) =>
  fetchMock.mockResponse(async (request) => {
    if (request.url.includes('/copy')) {
      return copyResponse()
    }
    return {
      body: request.url.endsWith('/fulfilments')
        ? JSON.stringify({
            referenceNumber: backendJourneyId,
            fulfilments: [],
            status: 'SUBMITTED',
            created: '2026-07-23T09:00:00',
            submittedAt: '2026-07-23T10:00:00',
            concurrencyToken: 0
          })
        : emptyNotificationList
    }
  })

describe('copy notification action', () => {
  describe('against the stub store', () => {
    useStubbedHighRiskPlantsJourney()

    it('Should copy into a known new draft and redirect to its journey-scoped hub', async () => {
      const source = await records.create()
      const request = journeyRequest(source.journeyId, { payload: copyPayload })

      const response = await copyPost(request, stubH(request))

      const copiedJourneyId = response.redirect.split('/').at(-1)
      expect(response.redirect).toBe(hubPath(copiedJourneyId))
      expect(copiedJourneyId).not.toBe(source.journeyId)
      expect(await records.load({ journeyId: copiedJourneyId })).toMatchObject({
        status: 'draft'
      })
    })

    it('Should copy a known submitted notification into a new draft at its hub, register the copy and leave the source submitted', async () => {
      const source = await records.create()
      await records.submit(source.journeyId)
      const request = journeyRequest(source.journeyId, {
        payload: copyPayload,
        knownJourneyIds: [source.journeyId]
      })
      const h = stubH(request)

      const response = await copyPost(request, h)

      const copiedJourneyId = response.redirect.split('/').at(-1)
      expect(response.redirect).toBe(hubPath(copiedJourneyId))
      expect(copiedJourneyId).not.toBe(source.journeyId)
      expect(h.cookies[knownJourneysCookie()]).toContain(copiedJourneyId)
      expect(await records.load({ journeyId: copiedJourneyId })).toMatchObject({
        status: 'draft'
      })
      expect(await records.load({ journeyId: source.journeyId })).toMatchObject(
        { status: 'submitted' }
      )
    })

    it('Should redirect a source the session does not know to the dashboard and register no copy', async () => {
      const source = await records.create()
      const request = journeyRequest(source.journeyId, {
        payload: copyPayload,
        knownJourneyIds: []
      })
      const h = stubH(request)

      const response = await copyPost(request, h)

      expect(response.redirect).toBe(dashboardPath())
      expect(h.cookies).toEqual({})
      expectOneLogged(request.logger, {
        level: 'info',
        message: 'Copy refused',
        fields: {
          journeyId: source.journeyId,
          reason: 'not-found'
        }
      })
    })
  })

  describe('against the backend', () => {
    useBackendRecords(SET_ID)

    it('Should re-render the notification view at 500 after a recoverable backend failure', async () => {
      backendAnsweringCopyWith(() => ({
        body: 'Unavailable',
        status: 503,
        statusText: 'Service Unavailable'
      }))

      const request = journeyRequest(backendJourneyId, { payload: copyPayload })
      const response = await copyPost(request, stubH(request))

      expect(response.statusCode).toBe(500)
      expect(response.view).toBe(
        'high-risk-plants/journeys/linear/features/check-answers/template'
      )
      expect(response.context.recoverableError).toBe(true)
    })

    it('Should redirect to the source notification view with ?staleAction=1 on 409 STALE_CONCURRENCY_TOKEN from copy', async () => {
      backendAnsweringCopyWith(() => ({
        body: JSON.stringify({ code: 'STALE_CONCURRENCY_TOKEN' }),
        status: 409
      }))

      const request = journeyRequest(backendJourneyId, { payload: copyPayload })
      const response = await copyPost(request, stubH(request))

      expect(response.redirect).toBe(
        `${pagePath(backendJourneyId, CYA_SLUG)}?staleAction=1`
      )
      expectOneLogged(request.logger, {
        level: 'info',
        message: 'Copy refused as stale',
        fields: {
          journeyId: backendJourneyId,
          reason: 'stale-concurrency-token'
        }
      })
    })
  })
})

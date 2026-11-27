import { SET_BASE, SET_ID } from '../../../../set.js'
import { describe, expect, it } from 'vitest'

import { pagePath } from '../../../../../../shared/paths.js'
import { assembleFulfilments } from '../../../../../../bridge/assemble-fulfilments.js'
import { projectAnswers } from '../../../../../../bridge/fulfilments/index.js'
import { useStubbedHighRiskPlantsJourney } from '../../test-support.js'
import {
  AMEND,
  configureRecords,
  records,
  SUBMITTED
} from '../../../../../../engine/persistence/records.js'
import { knownJourneysCookie } from '../../../../../../engine/persistence/session.js'
import { store } from '../../../../../../engine/store.js'
import {
  expectOneLogged,
  expectOneSaveFallbackLogged,
  journeyRequest,
  requestAsSessionHoldingNoJourney,
  stubH,
  loggedBackendRefusal
} from '../../../../../../engine/test-support.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import * as cancelAmend from './controller.js'

const NOTIFICATION_VIEW_SLUG = 'notification-view'
const CANCEL_AMEND_REFUSED_MESSAGE = 'Cancel amend refused'

const { CANCEL_AMEND_REFUSAL } = cancelAmend
const get = cancelAmend.routes.find((route) => route.method === 'GET').handler
const post = cancelAmend.routes.find((route) => route.method === 'POST').handler

const startAmend = async () => {
  const journey = await store.create()
  await records.replaceFulfilment(
    journey.journeyId,
    assembleFulfilments({ producerIdentificationNumber: 'SubmittedRef' })
  )
  const submitted = await records.submit(journey.journeyId)
  await records.amend(journey.journeyId)
  await records.replaceFulfilment(
    journey.journeyId,
    assembleFulfilments({ producerIdentificationNumber: 'AmendedRef' })
  )
  return { journeyId: journey.journeyId, submittedAt: submitted.submittedAt }
}

describe('cancel amendment routes', () => {
  useStubbedHighRiskPlantsJourney()

  it('Should carry no status strip and no back link on the confirmation page', async () => {
    const { journeyId } = await startAmend()

    const response = await get(journeyRequest(journeyId), stubH())

    expect(response.context.journeyStrip).toBeNull()
    expect(response.context.backLink).toBeUndefined()
  })

  it('Should render the question as heading and title, with the link back targeting the notification view', async () => {
    const { journeyId } = await startAmend()
    const h = stubH()

    const response = await get(journeyRequest(journeyId), h)

    expect(response.view).toBe(
      'high-risk-plants/journeys/linear/features/cancel-amend/template'
    )
    expect(response.context).toMatchObject({
      pageTitle: 'Are you sure you want to cancel this amendment?',
      heading: 'Are you sure you want to cancel this amendment?',
      cancelAction: pagePath(journeyId, 'cancel-amend'),
      goBackHref: pagePath(journeyId, NOTIFICATION_VIEW_SLUG)
    })
  })

  it('Should cancel AMEND, restore the submitted content and redirect to the notification view at the address that marks the cancellation', async () => {
    const { journeyId, submittedAt } = await startAmend()

    const response = await post(journeyRequest(journeyId), stubH())

    expect(response).toEqual({
      redirect: `${pagePath(journeyId, NOTIFICATION_VIEW_SLUG)}?cancelled=1`
    })
    const restored = await records.load({ journeyId })
    expect(restored.status).toBe(SUBMITTED)
    expect(restored.submittedAt).toBe(submittedAt)
    expect(
      projectAnswers(restored.fulfilment).producerIdentificationNumber
    ).toBe('SubmittedRef')
  })

  it('Should send every non-amend state to the notification list without attempting the transition', async () => {
    const draft = await store.create()
    const submitted = await store.create()
    await records.submit(submitted.journeyId)

    expect(await get(journeyRequest(draft.journeyId), stubH())).toEqual({
      redirect: SET_BASE
    })
    expect(await post(journeyRequest(submitted.journeyId), stubH())).toEqual({
      redirect: SET_BASE
    })
    expect((await records.load({ journeyId: draft.journeyId })).status).toBe(
      'draft'
    )
    expect(
      (await records.load({ journeyId: submitted.journeyId })).status
    ).toBe(SUBMITTED)
  })

  it('Should log the refusal once with the journey id, its status and the reason', async () => {
    const submitted = await store.create()
    await records.submit(submitted.journeyId)
    const request = journeyRequest(submitted.journeyId)

    await get(request, stubH())

    expectOneLogged(request.logger, {
      level: 'info',
      fields: {
        journeyId: submitted.journeyId,
        status: SUBMITTED,
        refusal: CANCEL_AMEND_REFUSAL.notInAmend
      },
      message: CANCEL_AMEND_REFUSED_MESSAGE
    })
  })

  it('Should refuse to disclose or cancel an amendment the session does not hold', async () => {
    const { journeyId } = await startAmend()
    const { getRequest, postRequest, getResponse, postResponse } =
      await requestAsSessionHoldingNoJourney(journeyId, { get, post })

    expect(getResponse).toEqual({ redirect: SET_BASE })
    expect(postResponse).toEqual({ redirect: SET_BASE })
    expect(getRequest.state[knownJourneysCookie()]).toEqual([])
    expect(postRequest.state[knownJourneysCookie()]).toEqual([])
    expectOneLogged(getRequest.logger, {
      level: 'info',
      fields: { journeyId, refusal: CANCEL_AMEND_REFUSAL.notInSession },
      message: CANCEL_AMEND_REFUSED_MESSAGE
    })
    expectOneLogged(postRequest.logger, {
      level: 'info',
      fields: { journeyId, refusal: CANCEL_AMEND_REFUSAL.notInSession },
      message: CANCEL_AMEND_REFUSED_MESSAGE
    })
    const after = await records.load({ journeyId })
    expect(after.status).toBe(AMEND)
    expect(projectAnswers(after.fulfilment).producerIdentificationNumber).toBe(
      'AmendedRef'
    )
  })

  it('Should redirect a journeyId no record exists for', async () => {
    const request = journeyRequest('GBN-AG-26-UNKNOWN', {
      state: { [knownJourneysCookie()]: [] }
    })
    expect(
      await post(request, stubH(request, { writesStateToRequest: true }))
    ).toEqual({
      redirect: SET_BASE
    })
  })

  it('Should re-render confirmation at 500 with the recoverable-save banner after a backend failure', async () => {
    const failure = loggedBackendRefusal('cancel amend')
    configureRecords(SET_ID, {
      ...recordsStub,
      cancelAmend: async () => {
        throw failure
      }
    })
    const { journeyId } = await startAmend()
    const h = stubH()

    const request = journeyRequest(journeyId)

    const response = await post(request, h)

    expect(response.statusCode).toBe(500)
    expect(response.context.recoverableError).toBe(true)
    expect(response.view).toBe(
      'high-risk-plants/journeys/linear/features/cancel-amend/template'
    )
    expectOneSaveFallbackLogged(request.logger, { journeyId })
  })
})

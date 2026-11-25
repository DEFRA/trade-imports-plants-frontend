import { SET_ID } from '../../../../../test/fixtures/index.js'
import { vi } from 'vitest'

import {
  configureRecords,
  records,
  STALE_CONCURRENCY_TOKEN
} from './records.js'
import { store } from '../store.js'
import { staleConcurrencyRefusal } from '../test-support.js'
import { records as recordsStub } from '../../services/persistence/records/stub/index.js'
import { recordEmfDocuments } from '../../../common/test-helpers/emf-documents.js'

const JOURNEY_EVENTS = Object.freeze({
  started: 'journey.started',
  submitted: 'journey.submitted',
  amended: 'journey.amended',
  copied: 'journey.copied',
  deleted: 'journey.deleted',
  conflict: 'journey.concurrency.conflict'
})

const counted = (...names) =>
  names.map((name) => ({ name, value: 1, unit: 'Count', dimensions: {} }))

const refusingAsStale = (operation) => async () => {
  throw staleConcurrencyRefusal(operation)
}

describe('records journey counters', () => {
  const emf = recordEmfDocuments()

  const journeyCounts = () =>
    Object.values(JOURNEY_EVENTS).flatMap((name) =>
      emf.publishesOf(name).map((publish) => ({ name, ...publish }))
    )

  beforeEach(async () => {
    configureRecords(SET_ID, recordsStub)
    await store.clear()
  })

  test('starting, submitting, amending, copying and deleting a journey each count one event with no dimensions', async () => {
    const started = await records.create()
    const submitted = await records.submit(started.journeyId)
    await records.amend(started.journeyId)
    await records.copy(started.journeyId, submitted.concurrencyToken)
    await records.softDelete(started.journeyId)

    await vi.waitFor(() =>
      expect(journeyCounts()).toEqual(
        counted(
          JOURNEY_EVENTS.started,
          JOURNEY_EVENTS.submitted,
          JOURNEY_EVENTS.amended,
          JOURNEY_EVENTS.copied,
          JOURNEY_EVENTS.deleted
        )
      )
    )
  })

  test('a start, submission, amendment, copy or deletion that resolves to no journey counts no event', async () => {
    const resolvesToNoJourney = async () => undefined
    const journeyId = 'unknown-journey'
    configureRecords(SET_ID, {
      ...recordsStub,
      create: resolvesToNoJourney,
      submit: resolvesToNoJourney,
      amend: resolvesToNoJourney,
      copy: resolvesToNoJourney,
      softDelete: resolvesToNoJourney
    })

    await records.create()
    await records.submit(journeyId)
    await records.amend(journeyId)
    await records.copy(journeyId, 0)
    await records.softDelete(journeyId)
    await emf.publishMarkerAndAwaitEarlierPublishes()

    expect(journeyCounts()).toEqual([])
  })

  test('a save the store refuses for a stale concurrency token counts one conflict and rethrows the refusal', async () => {
    configureRecords(SET_ID, {
      ...recordsStub,
      replaceFulfilment: refusingAsStale('replace-notification')
    })

    await expect(
      records.replaceFulfilment('j-1', {}, { known: {} })
    ).rejects.toMatchObject({ code: STALE_CONCURRENCY_TOKEN })

    await vi.waitFor(() =>
      expect(journeyCounts()).toEqual(counted(JOURNEY_EVENTS.conflict))
    )
  })

  test('a submit the store refuses for a stale concurrency token counts one conflict and no submission, and rethrows the refusal', async () => {
    configureRecords(SET_ID, {
      ...recordsStub,
      submit: refusingAsStale('submit-notification')
    })

    await expect(records.submit('j-1')).rejects.toMatchObject({
      code: STALE_CONCURRENCY_TOKEN
    })

    await emf.publishMarkerAndAwaitEarlierPublishes()
    expect(journeyCounts()).toEqual(counted(JOURNEY_EVENTS.conflict))
  })

  test('a write the store refuses for another reason counts no conflict and rethrows the refusal', async () => {
    const refused = new Error('backend down')
    configureRecords(SET_ID, {
      ...recordsStub,
      submit: async () => {
        throw refused
      }
    })

    await expect(records.submit('j-1')).rejects.toBe(refused)

    await emf.publishMarkerAndAwaitEarlierPublishes()
    expect(journeyCounts()).toEqual([])
  })
})

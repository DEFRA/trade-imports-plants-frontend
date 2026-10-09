import { SET_BASE, SET_ID } from '../../../../set.js'
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'
import { configureAnswersForRead } from '../../../../../../bridge/answers-read.js'
import { withoutUnresolvedPartyRefs } from '../../parties/index.js'
import { store } from '../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../engine/persistence/records.js'
import {
  configureSession,
  openingRunCookie
} from '../../../../../../engine/persistence/session.js'
import { RUN_ACTIVE, RUN_COMPLETE } from '../../../../../../flow/run-state.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import {
  driveHandler,
  journeyRequest,
  postHandlerOf,
  stubH
} from '../../../../../../engine/test-support.js'
import * as addressBook from '../../../../../../services/address-book/index.js'
import { STUB_BOOK } from '../../../../../../services/address-book/stub/index.js'
import {
  COMPLETE_NOTIFICATION,
  installHighRiskPlantsJourney
} from '../../test-support.js'
import {
  sectionEntry,
  nextInSection
} from '../../../../../../flow/navigation.js'
import { sectionGatePasses } from '../../../../../../flow/gates.js'
import { makeScope } from '../../../../../../engine/index.js'
import { sections } from '../../flow/flow.js'
import { meta, routes } from './controller.js'
import { copy } from './copy/copy.en.js'
import { copy as arrivalCopy } from '../arrival-details/copy/copy.en.js'
import { copy as destinationCopy } from '../place-of-destination/copy/copy.en.js'
import { changeHref } from './view-model/rows/change-link.js'

const PLANTS_FOR_PLANTING = 'plants-for-planting'

const get = routes.find((route) => route.method === 'GET').handler
const post = postHandlerOf({ routes })
const cardsOf = (result) =>
  result.view.context.sections.flatMap((section) => section.cards)
const removedDestinationErrors = (result) => [
  {
    text: copy.errors.parties.placeOfDestination,
    href: changeHref(result.journeyId, 'placeOfDestination')
  }
]
const invalidOrigin = {
  ...COMPLETE_NOTIFICATION,
  commodityLines: [
    { ...COMPLETE_NOTIFICATION.commodityLines[0], category: 'ware-potatoes' }
  ]
}

beforeAll(() => {
  configureAnswersForRead(SET_ID, withoutUnresolvedPartyRefs)
  configureRecords(SET_ID, recordsStub)
  configureSession(SET_ID, sessionStub)
  installHighRiskPlantsJourney()
})
beforeEach(() => store.clear())
afterEach(() => vi.restoreAllMocks())

describe('Check your answers', () => {
  it('Should render three numbered sections, stored values and indexed Change links without writing', async () => {
    const result = await driveHandler(get, { seed: COMPLETE_NOTIFICATION })
    expect(meta.collects).toEqual([])
    expect(result.view.context).toMatchObject({
      pageTitle: copy.title,
      readOnly: false,
      backLink: `${SET_BASE}/notifications/${result.journeyId}`,
      copy
    })
    expect(result.view.context.caption).toBeUndefined()
    expect(result.view.context.sections.map(({ heading }) => heading)).toEqual(
      Object.values(copy.sections)
    )
    const cards = cardsOf(result)
    expect(cards.map(({ title }) => title)).not.toContain(copy.cards.consignor)
    expect(cards[0].rows[1]).toMatchObject({
      value: { text: 'France' },
      actions: {
        items: [
          {
            href: `${SET_BASE}/notifications/${result.journeyId}/origin?change=1`
          }
        ]
      }
    })
    expect(cards[1].actions.items[0].href).toBe(
      `${SET_BASE}/notifications/${result.journeyId}/commodities/details?index=0&change=1`
    )
    expect(cards[1].rows.map(({ value }) => value.text)).toEqual([
      'Seed potatoes',
      'Maris Piper',
      '250',
      'Planting'
    ])
    const contact = cards.find(({ title }) => title === copy.cards.contact)
    expect(contact.rows.map(({ value }) => value.text)).toEqual([
      'Tech Imports Ltd',
      '18 Dockside Road, London, E14 9GE, United Kingdom',
      '01632 960000',
      'tech-imports-ltd@example.com'
    ])
    expect(result.after).toEqual(COMPLETE_NOTIFICATION)
  })

  it('Should omit potato-only fields and show the consignor for plants', async () => {
    const result = await driveHandler(get, {
      seed: { commodityType: PLANTS_FOR_PLANTING, countryOfOrigin: 'FR' }
    })
    const cards = cardsOf(result)
    expect(cards.map(({ title }) => title)).toContain(copy.cards.consignor)
    const arrival = cards.find(({ title }) => title === copy.cards.arrival)
    expect(arrival.rows.map(({ key }) => key.text)).toEqual([
      copy.labels.arrivalStatus,
      arrivalCopy.dateLabels['not-yet-arrived']
    ])
  })

  it('Should render Not provided for a removed address-book reference', async () => {
    vi.spyOn(addressBook, 'party').mockResolvedValue(undefined)
    const result = await driveHandler(get, { seed: COMPLETE_NOTIFICATION })
    const destination = cardsOf(result).find(
      ({ title }) => title === destinationCopy.headings.potatoes
    )
    expect(
      destination.rows.every(({ value }) => value.text === copy.notProvided)
    ).toBe(true)
    expect(result.view.context.errorSummary.errorList).toEqual(
      removedDestinationErrors(result)
    )
  })

  it('Should render the raw ISO code in the origin row when the stored country is no longer offered by the origin block', async () => {
    const UNOFFERED_COUNTRY = 'ZZ'
    const result = await driveHandler(get, {
      seed: { ...COMPLETE_NOTIFICATION, countryOfOrigin: UNOFFERED_COUNTRY }
    })

    expect(cardsOf(result)[0].rows[1]).toMatchObject({
      value: { text: UNOFFERED_COUNTRY }
    })
  })

  it('Should refuse Continue for a removed address-book reference', async () => {
    vi.spyOn(addressBook, 'party').mockResolvedValue(undefined)
    const result = await driveHandler(post, { seed: COMPLETE_NOTIFICATION })
    expect(result.response.statusCode).toBe(400)
    expect(result.response.redirect).toBeUndefined()
    expect(result.view.context.errorSummary.errorList).toEqual(
      removedDestinationErrors(result)
    )
  })

  it('Should render an unanswered destination without a party error', async () => {
    const seed = { ...COMPLETE_NOTIFICATION }
    delete seed.placeOfDestination
    const result = await driveHandler(get, { seed })
    const destination = cardsOf(result).find(
      ({ title }) => title === destinationCopy.headings.potatoes
    )
    expect(
      destination.rows.every(({ value }) => value.text === copy.notProvided)
    ).toBe(true)
    expect(result.view.context.errorSummary.errorList).not.toContainEqual(
      expect.objectContaining({ text: copy.errors.parties.placeOfDestination })
    )
    expect(result.view.context.errorSummary.errorList).toContainEqual({
      text: copy.errors.rows.destination,
      href: `${SET_BASE}/notifications/${result.journeyId}/destinations/select?change=1`
    })
  })

  it.each([
    ['potatoes', COMPLETE_NOTIFICATION],
    [
      'not-yet-arrived',
      {
        commodityType: PLANTS_FOR_PLANTING,
        countryOfOrigin: 'FR',
        arrivalStatus: 'not-yet-arrived'
      }
    ],
    [
      'already-arrived',
      {
        commodityType: PLANTS_FOR_PLANTING,
        countryOfOrigin: 'FR',
        arrivalStatus: 'already-arrived'
      }
    ]
  ])(
    'Should select the arrival label and destination heading for %s',
    async (arrivalState, seed) => {
      const result = await driveHandler(get, { seed })
      const cards = cardsOf(result)
      const arrival = cards.find(({ title }) => title === copy.cards.arrival)
      expect(arrival.rows.map(({ key }) => key.text)).toContain(
        arrivalCopy.dateLabels[arrivalState]
      )
      expect(cards.map(({ title }) => title)).toContain(
        destinationCopy.headings[arrivalState]
      )
    }
  )

  it('Should recheck origin after a commodity change and refuse Continue with a link to origin', async () => {
    for (const handler of [get, post]) {
      const result = await driveHandler(handler, { seed: invalidOrigin })
      expect(result.view.context.errorSummary.errorList[0].href).toBe(
        `${SET_BASE}/notifications/${result.journeyId}/origin?change=1`
      )
      expect(result.view.context.errorSummary.errorList[0].text).toContain(
        'Poland'
      )
      expect(result.after).toEqual(invalidOrigin)
      if (handler === post) {
        expect(result.response.statusCode).toBe(400)
      }
    }
  })

  it('Should continue through the registered review flow and honour the overview exit without writing', async () => {
    for (const payload of [{}, { exit: 'hub' }]) {
      const result = await driveHandler(post, {
        seed: COMPLETE_NOTIFICATION,
        payload
      })
      expect(result.response.redirect).toBe(
        `${SET_BASE}/notifications/${result.journeyId}${payload.exit ? '' : '/declaration'}`
      )
      expect(result.after).toEqual(COMPLETE_NOTIFICATION)
    }
  })

  it('Should refuse Continue on an incomplete notification, naming what is outstanding', async () => {
    const result = await driveHandler(post, {
      seed: { commodityType: 'potatoes', countryOfOrigin: 'FR' }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.response.redirect).toBeUndefined()
    expect(result.view.context.errorSummary.disableAutoFocus).toBe(false)
    expect(
      result.view.context.errorSummary.errorList.map(({ text }) => text)
    ).toEqual(
      expect.arrayContaining([
        copy.errors.rows.destination,
        copy.errors.rows.contact
      ])
    )
  })

  it('Should render a submitted notification read-only and refuse a forged Continue', async () => {
    const journey = await store.create()
    await store.seedAnswers(journey.journeyId, COMPLETE_NOTIFICATION)
    await store.submit(journey.journeyId)
    const request = journeyRequest(journey.journeyId)
    const h = stubH()
    await get(request, h)
    expect(h.captured.view.context.readOnly).toBe(true)
    for (const card of h.captured.view.context.sections.flatMap(
      ({ cards }) => cards
    )) {
      expect(card.actions).toBeUndefined()
      expect(card.rows.every((row) => !row.actions)).toBe(true)
    }
    expect(await post(request, h)).toEqual({
      redirect: `${SET_BASE}/notifications/${journey.journeyId}/notification-view`
    })
  })
})

describe('Check your answers — outstanding tasks and the opening run', () => {
  it('Should name every outstanding task on an incomplete notification, linking to its page with the change context', async () => {
    const result = await driveHandler(get, {
      seed: { commodityType: 'potatoes', countryOfOrigin: 'FR' }
    })
    const base = `${SET_BASE}/notifications/${result.journeyId}`
    expect(result.view.context.errorSummary.errorList).toEqual(
      expect.arrayContaining([
        {
          text: copy.errors.rows.commodities,
          href: `${base}/commodity-type?change=1`
        },
        {
          text: copy.errors.rows.destination,
          href: `${base}/destinations/select?change=1`
        },
        {
          text: copy.errors.rows.contact,
          href: `${base}/consignment/contact/select?change=1`
        }
      ])
    )
    expect(result.view.context.errorSummary.errorList).not.toContainEqual(
      expect.objectContaining({ text: copy.errors.rows.origin })
    )
  })

  it('Should complete the opening run when check your answers is shown', async () => {
    const journey = await store.create()
    await store.seedAnswers(journey.journeyId, COMPLETE_NOTIFICATION)
    const cookies = {}
    const h = {
      ...stubH(),
      state: (name, value) => {
        cookies[name] = value
      }
    }
    await get(
      journeyRequest(journey.journeyId, {
        state: { [openingRunCookie()]: { [journey.journeyId]: RUN_ACTIVE } }
      }),
      h
    )
    expect(cookies[openingRunCookie()]).toEqual({
      [journey.journeyId]: RUN_COMPLETE
    })
  })
})

describe('Check your answers lateness', () => {
  it('Should warn using the request clock without writing lateness on draft GET', async () => {
    const journey = await store.create()
    await store.seedAnswers(journey.journeyId, COMPLETE_NOTIFICATION)
    const request = journeyRequest(journey.journeyId, {
      app: { clock: () => new Date('2026-03-26T00:00:00Z') }
    })
    const h = stubH()
    await get(request, h)
    expect(h.captured.view.context.lateWarning).toBe(true)
    expect(h.captured.view.context.lateNotification).toBe(false)
    expect(h.captured.view.context.lateRule).toContain('2 days before')
    expect((await store.get(journey.journeyId)).answers).toEqual(
      COMPLETE_NOTIFICATION
    )
    request.app.clock = () => new Date('2026-03-25T23:59:59Z')
    await get(request, h)
    expect(h.captured.view.context.lateWarning).toBe(false)
  })

  it.each(['late', 'on-time'])(
    'Should render submitted lateness only from the stored %s value',
    async (indicator) => {
      const journey = await store.create()
      await store.seedAnswers(journey.journeyId, {
        ...COMPLETE_NOTIFICATION,
        lateNotificationIndicator: indicator
      })
      await store.submit(journey.journeyId)
      const request = journeyRequest(journey.journeyId, {
        app: {
          clock: () => {
            throw new Error('must not recompute')
          }
        }
      })
      const h = stubH()
      await get(request, h)
      expect(h.captured.view.context.lateWarning).toBe(false)
      expect(h.captured.view.context.lateNotification).toBe(
        indicator === 'late'
      )
    }
  )

  it('Should offer Cancel amendment only while amending, and the banner only after cancelling', async () => {
    const { journeyId } = await store.create()
    await store.seedAnswers(journeyId, COMPLETE_NOTIFICATION)
    await store.submit(journeyId)
    const submitted = stubH()
    await get(journeyRequest(journeyId), submitted)
    expect(submitted.captured.view.context).toMatchObject({
      readOnly: true,
      deleteHref: `${SET_BASE}/notifications/${journeyId}/delete`,
      cancelAmendHref: null,
      amendmentCancelled: false
    })
    const cancelled = stubH()
    await get(
      journeyRequest(journeyId, { query: { cancelled: '1' } }),
      cancelled
    )
    expect(cancelled.captured.view.context.amendmentCancelled).toBe(true)
    await recordsStub.amend(journeyId)
    const amending = stubH()
    await get(
      journeyRequest(journeyId, { query: { cancelled: '1' } }),
      amending
    )
    expect(amending.captured.view.context).toMatchObject({
      readOnly: false,
      deleteHref: null,
      cancelAmendHref: `${SET_BASE}/notifications/${journeyId}/cancel-amend`,
      amendmentCancelled: false
    })
  })

  it('Should let unexpected address-book errors escape', async () => {
    vi.spyOn(addressBook, 'party').mockRejectedValue(
      new TypeError('unexpected')
    )
    await expect(
      driveHandler(get, { seed: COMPLETE_NOTIFICATION })
    ).rejects.toThrow('unexpected')
  })
})

describe('review navigation', () => {
  it('Should gate the review hub entry on complete tasks without changing Contact Continue', () => {
    const section = sections.find(({ id }) => id === 'review')
    const complete = makeScope(COMPLETE_NOTIFICATION)
    expect(sectionGatePasses(section, makeScope({}))).toBe(false)
    expect(sectionGatePasses(section, complete)).toBe(true)
    expect(sectionEntry('review', complete, 'j-1')).toBe(
      `${SET_BASE}/notifications/j-1/notification-view`
    )
    expect(nextInSection('consignment-contact-select', complete, 'j-1')).toBe(
      `${SET_BASE}/notifications/j-1`
    )
    expect(
      STUB_BOOK.some(
        ({ id }) => id === COMPLETE_NOTIFICATION.contactAddress.addressId
      )
    ).toBe(true)
  })
})

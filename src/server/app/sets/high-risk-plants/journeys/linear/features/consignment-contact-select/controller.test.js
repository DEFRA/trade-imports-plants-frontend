import * as addressBook from '../../../../../../services/address-book/index.js'
import { records as realRecords } from '../../../../../../services/persistence/records/real/index.js'
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import { installHighRiskPlantsJourney } from '../../test-support.js'
import { store } from '../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import {
  driveHandler,
  postHandlerOf
} from '../../../../../../engine/test-support.js'
import { STUB_BOOK } from '../../../../../../services/address-book/stub/index.js'

import * as contact from './controller.js'

const get = contact.routes.find((route) => route.method === 'GET').handler
const post = postHandlerOf(contact)

const CONTACT = STUB_BOOK[0]

describe('GET contact — select an address from the book', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    installHighRiskPlantsJourney()
  })
  beforeEach(() => store.clear())

  it('Should render every address-book record with its name and full address hint', async () => {
    const result = await driveHandler(get)
    expect(result.view.context.caption).toBeUndefined()
    expect(result.view.context.contactOptions).toHaveLength(STUB_BOOK.length)
    for (const record of STUB_BOOK) {
      expect(result.view.context.contactOptions).toContainEqual(
        expect.objectContaining({
          value: record.id,
          text: record.name,
          checked: false,
          hint: { text: expect.stringContaining(record.address.country) }
        })
      )
    }
  })

  it('Should offer no way to add an address — the book is read-only here', async () => {
    const result = await driveHandler(get)

    expect(result.view.context.createAddressHref).toBeUndefined()
    expect(result.view.context.copy.addNewAddress).toBeUndefined()
  })

  it('Should offer the book, then pre-select and commit the address that was picked', async () => {
    const postResult = await driveHandler(post, {
      payload: { contactAddress: CONTACT.id }
    })
    expect(postResult.view).toBeUndefined()
    expect(postResult.after.contactAddress).toMatchObject({
      addressId: CONTACT.id,
      name: CONTACT.name
    })
    expect(postResult.after.contactAddress.address).toEqual(CONTACT.address)

    const getResult = await driveHandler(get, { seed: postResult.after })
    const option = getResult.view.context.contactOptions.find(
      (candidate) => candidate.value === CONTACT.id
    )
    expect(option).toMatchObject({ text: CONTACT.name, checked: true })
  })
})

describe('POST contact — invalid payload', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    installHighRiskPlantsJourney()
  })
  beforeEach(() => store.clear())

  it('Should answer 400 and re-render an out-of-list contact, committing nothing', async () => {
    const result = await driveHandler(post, {
      payload: { contactAddress: 'not-a-real-contact' }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.contactAddress).toBeDefined()
    expect(result.after).toEqual(result.before)
  })

  it.each([undefined, { id: CONTACT.id, deleted: true }])(
    'Should reject a record removed between listing and lookup: %j',
    async (chosen) => {
      const lookup = vi
        .spyOn(addressBook, 'party')
        .mockResolvedValueOnce(chosen)
      try {
        const result = await driveHandler(post, {
          payload: { contactAddress: CONTACT.id }
        })
        expect(result.response.statusCode).toBe(400)
        expect(result.after).toEqual(result.before)
      } finally {
        lookup.mockRestore()
      }
    }
  )

  it('Should leave the page without committing when no contact is selected', async () => {
    const result = await driveHandler(post, {
      payload: {}
    })
    expect(result.view).toBeUndefined()
    expect(result.after.contactAddress).toBeUndefined()
    expect(result.response.redirect).toBe(`/notifications/${result.journeyId}`)
  })

  it('Should treat a dangling contact addressId as unselected on GET and reject it on POST', async () => {
    const seed = { contactAddress: { addressId: 'gone' } }

    const getResult = await driveHandler(get, { seed })
    expect(
      getResult.view.context.contactOptions.every((option) => !option.checked)
    ).toBe(true)

    const postResult = await driveHandler(post, {
      seed,
      payload: { contactAddress: 'gone' }
    })
    expect(postResult.response.statusCode).toBe(400)
    expect(postResult.view.context.errors.contactAddress).toBeDefined()
    expect(postResult.after).toEqual(postResult.before)
  })
})

describe('POST contact — save failures', () => {
  beforeAll(() => {
    configureSession(sessionStub)
    installHighRiskPlantsJourney()
  })

  beforeEach(() => {
    store.clear()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      }))
    )
  })

  afterEach(() => {
    configureRecords(recordsStub)
    vi.unstubAllGlobals()
  })

  const failingOnControllerCommit = (failure) => {
    let replaceCalls = 0
    configureRecords({
      ...recordsStub,
      replaceFulfilment: (...args) => {
        replaceCalls += 1
        return replaceCalls === 1
          ? recordsStub.replaceFulfilment(...args)
          : failure(...args)
      }
    })
  }

  it('Should re-render a backend request failure at 500 with the banner and the value', async () => {
    failingOnControllerCommit(realRecords.replaceFulfilment)

    const result = await driveHandler(post, {
      payload: { contactAddress: CONTACT.id }
    })

    expect(result.response.statusCode).toBe(500)
    expect(result.view.context.recoverableError).toBe(true)
    expect(
      result.view.context.contactOptions.find((option) => option.checked)?.value
    ).toBe(CONTACT.id)
  })

  it('Should let a programming error escape to the promoted catch-all', async () => {
    failingOnControllerCommit(async () => {
      throw new TypeError('programming failure')
    })

    await expect(
      driveHandler(post, { payload: { contactAddress: CONTACT.id } })
    ).rejects.toThrow(new TypeError('programming failure'))
  })
})

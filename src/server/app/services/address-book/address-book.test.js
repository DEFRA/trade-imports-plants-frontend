import { describe, expect, test, vi } from 'vitest'

import { resetModulesStubModeAndStubbedGlobals } from '../../../common/test-helpers/reset-modules-stub-mode-and-globals.js'
import {
  okAnswer,
  refusedAnswer,
  useDependencyAnswers
} from '../../../common/test-helpers/dependency-answers.js'

const getTraceIdMock = vi.hoisted(() => vi.fn())
vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: getTraceIdMock
}))

const ORG = '5900001'
const PHONE = '01632 960000'
const TRACE_ID = 'trace-123'

const COUNTRIES = [
  { code: 'BE', name: 'Belgium' },
  { code: 'FR', name: 'France' }
]

const operator = (id, overrides = {}) => ({
  id,
  name: `Record ${id}`,
  addressLine1: '1 Test Street',
  townOrCity: 'Testville',
  county: 'Testshire',
  postcode: 'TE5 7ER',
  countryCode: 'BE',
  email: `${id}@example.com`,
  phone: PHONE,
  deleted: false,
  roles: [],
  ...overrides
})

const isCountriesRequest = (request) =>
  new URL(request.url).pathname === '/countries'

const servingCountries = (answerAddresses) => (request) =>
  isCountriesRequest(request) ? okAnswer(COUNTRIES) : answerAddresses(request)

const servePagedAddressBook = (
  total,
  defaultPageSize = 25,
  buildRecord = (id) => operator(id)
) => {
  const all = Array.from({ length: total }, (_, index) =>
    buildRecord(`record-${index + 1}`, index)
  )
  return servingCountries((request) => {
    const { searchParams } = new URL(request.url)
    const page = Number(searchParams.get('page') ?? 1)
    const apiPageSize = Number(searchParams.get('pageSize') ?? defaultPageSize)
    const totalPages = Math.max(1, Math.ceil(total / apiPageSize))
    if (page > totalPages) {
      return refusedAnswer(400, 'Page out of range')
    }
    const from = (page - 1) * apiPageSize
    return okAnswer({
      items: all.slice(from, from + apiPageSize),
      page,
      pageSize: apiPageSize,
      totalItems: total,
      totalPages
    })
  })
}

const addressRequests = (fetched) =>
  fetched.requests().filter((request) => !isCountriesRequest(request))

const realMode = () => {
  process.env.STUB_MODE = 'false'
}

const addressBook = () => import('./index.js')

resetModulesStubModeAndStubbedGlobals()
const answerWith = useDependencyAnswers()

describe('#addresses against the real address book', () => {
  test('Should scope the request to the organisation in both path and header', async () => {
    realMode()
    const fetched = answerWith(servePagedAddressBook(10))

    const { addresses } = await addressBook()
    await addresses(ORG)

    const [request] = addressRequests(fetched)
    expect(request.url).toContain(`/organisation/${ORG}/addresses`)
    expect(request.headers.get('Trade-Imports-Organisation-Id')).toBe(ORG)
  })

  test('Should carry the request trace on to the address book', async () => {
    realMode()
    getTraceIdMock.mockReturnValue(TRACE_ID)
    const fetched = answerWith(servePagedAddressBook(10))

    const { addresses } = await addressBook()
    await addresses(ORG)

    const [request] = addressRequests(fetched)
    expect(request.headers.get('x-cdp-request-id')).toBe(TRACE_ID)
  })

  test('Should return every matching record the book holds across more than one API page, not the first page only', async () => {
    realMode()
    answerWith(servePagedAddressBook(60))

    const { addresses } = await addressBook()
    const found = await addresses(ORG)

    expect(found).toHaveLength(60)
    expect(found.at(-1).id).toBe('record-60')
  })

  test('Should make a single call when the book fits one page', async () => {
    realMode()
    const fetched = answerWith(servePagedAddressBook(3))

    const { addresses } = await addressBook()
    await addresses(ORG)

    expect(addressRequests(fetched)).toHaveLength(1)
  })

  test('Should read a large book in pages of a hundred', async () => {
    realMode()
    const fetched = answerWith(servePagedAddressBook(1001))

    const { addresses } = await addressBook()
    const found = await addresses(ORG)

    expect(found.map(({ id }) => id)).toEqual(
      Array.from({ length: 1001 }, (_, index) => `record-${index + 1}`)
    )
    const pagesAsked = addressRequests(fetched).map(
      (request) => new URL(request.url).searchParams
    )
    expect(pagesAsked.map((searchParams) => searchParams.get('page'))).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '10',
      '11'
    ])
    expect(
      pagesAsked.every((searchParams) => searchParams.get('pageSize') === '100')
    ).toBe(true)
  })

  test('Should have at most four page requests in flight at once', async () => {
    const serve = servePagedAddressBook(2000)
    let inFlight = 0
    let mostInFlight = 0
    realMode()
    answerWith(async (request) => {
      if (isCountriesRequest(request)) {
        return serve(request)
      }
      inFlight += 1
      mostInFlight = Math.max(mostInFlight, inFlight)
      await new Promise((resolve) => setTimeout(resolve, 1))
      inFlight -= 1
      return serve(request)
    })

    const { addresses } = await addressBook()
    const found = await addresses(ORG)

    expect(found).toHaveLength(2000)
    expect(mostInFlight).toBe(4)
  })

  test('Should send the search term to the address book and not the role', async () => {
    realMode()
    const fetched = answerWith(servePagedAddressBook(10))

    const { addresses } = await addressBook()
    await addresses(ORG, { query: 'nordvik', role: 'CONSIGNOR' })

    const { searchParams } = new URL(addressRequests(fetched)[0].url)
    expect(searchParams.get('q')).toBe('nordvik')
    expect(searchParams.has('role')).toBe(false)
  })

  describe('searching by country name', () => {
    const countryCodesSentTo = (fetched) =>
      new URL(addressRequests(fetched)[0].url).searchParams.getAll(
        'countryCode'
      )

    test('Should ask for the code of the country named, whatever the case or surrounding spaces, and still send the term as the text search', async () => {
      realMode()
      const fetched = answerWith(servePagedAddressBook(3))

      const { addresses } = await addressBook()
      await addresses(ORG, { query: '  fRaNce ' })

      const { searchParams } = new URL(addressRequests(fetched)[0].url)
      expect(searchParams.getAll('countryCode')).toEqual(['FR'])
      expect(searchParams.get('q')).toBe('  fRaNce ')
    })

    test('Should ask for the code of a country whose name contains part of the term and not the other countries', async () => {
      realMode()
      const fetched = answerWith(servePagedAddressBook(3))

      const { addresses } = await addressBook()
      await addresses(ORG, { query: 'elgi' })

      expect(countryCodesSentTo(fetched)).toEqual(['BE'])
    })

    test('Should ask for GB when the term is United Kingdom', async () => {
      realMode()
      const fetched = answerWith(servePagedAddressBook(3))

      const { addresses } = await addressBook()
      await addresses(ORG, { query: 'United Kingdom' })

      expect(countryCodesSentTo(fetched)).toEqual(['GB'])
    })

    test('Should send the same country codes on every page of a multi-page read', async () => {
      realMode()
      const fetched = answerWith(servePagedAddressBook(250))

      const { addresses } = await addressBook()
      await addresses(ORG, { query: 'France' })

      const codesPerPage = addressRequests(fetched).map((request) =>
        new URL(request.url).searchParams.getAll('countryCode')
      )
      expect(codesPerPage).toEqual([['FR'], ['FR'], ['FR']])
    })

    test('Should send no country code for a term no country name contains', async () => {
      realMode()
      const fetched = answerWith(servePagedAddressBook(3))

      const { addresses } = await addressBook()
      await addresses(ORG, { query: 'nordvik' })

      expect(countryCodesSentTo(fetched)).toEqual([])
    })

    test('Should send no country code when there is no search term', async () => {
      realMode()
      const fetched = answerWith(servePagedAddressBook(3))

      const { addresses } = await addressBook()
      await addresses(ORG)

      expect(countryCodesSentTo(fetched)).toEqual([])
    })
  })

  test('Should raise a failure rather than serving an empty book', async () => {
    realMode()
    answerWith(() => refusedAnswer(503, 'Service Unavailable'))

    const { addresses } = await addressBook()
    await expect(addresses(ORG)).rejects.toThrow(
      'address-book refused to list addresses: 503 Service Unavailable'
    )
  })
})

describe('the role rule', () => {
  test('Should return a record whose roles include the role asked for', async () => {
    realMode()
    answerWith(
      servePagedAddressBook(1, 25, (id) =>
        operator(id, { roles: ['CONSIGNOR'] })
      )
    )

    const { addresses } = await addressBook()
    const found = await addresses(ORG, { role: 'CONSIGNOR' })

    expect(found).toHaveLength(1)
  })

  test('Should not return a record whose roles belong to another role', async () => {
    realMode()
    answerWith(
      servePagedAddressBook(1, 25, (id) =>
        operator(id, { roles: ['PLACE_OF_DESTINATION'] })
      )
    )

    const { addresses } = await addressBook()
    const found = await addresses(ORG, { role: 'CONSIGNOR' })

    expect(found).toEqual([])
  })

  test('Should return a record the book answers with an empty roles list, whatever role is asked for', async () => {
    realMode()
    answerWith(
      servePagedAddressBook(1, 25, (id) => operator(id, { roles: [] }))
    )

    const { addresses } = await addressBook()
    const found = await addresses(ORG, { role: 'CONSIGNOR' })

    expect(found).toHaveLength(1)
  })

  test('Should return a record carrying two roles when either is asked for', async () => {
    realMode()
    answerWith(
      servePagedAddressBook(1, 25, (id) =>
        operator(id, { roles: ['PLACE_OF_DESTINATION', 'CONSIGNEE'] })
      )
    )

    const { addresses } = await addressBook()

    expect(await addresses(ORG, { role: 'PLACE_OF_DESTINATION' })).toHaveLength(
      1
    )
    expect(await addresses(ORG, { role: 'CONSIGNEE' })).toHaveLength(1)
  })

  test('Should return every live record when no role is asked for', async () => {
    realMode()
    answerWith(
      servePagedAddressBook(2, 25, (id, index) =>
        operator(id, { roles: index === 0 ? ['CONSIGNOR'] : [] })
      )
    )

    const { addresses } = await addressBook()
    const found = await addresses(ORG)

    expect(found).toHaveLength(2)
  })
})

describe('mapping the wire onto the journey', () => {
  test('Should map the API field names onto the ones the journey renders', async () => {
    realMode()
    answerWith(servePagedAddressBook(1))

    const { addresses } = await addressBook()
    const [record] = await addresses(ORG)

    expect(record).toMatchObject({
      id: 'record-1',
      roles: [],
      address: {
        addressLine1: '1 Test Street',
        townOrCity: 'Testville',
        county: 'Testshire',
        postcode: 'TE5 7ER',
        countryCode: 'BE',
        email: 'record-1@example.com',
        phone: PHONE
      }
    })
  })

  test('Should show a country by name, not by its code', async () => {
    realMode()
    answerWith(servePagedAddressBook(1))

    const { addresses } = await addressBook()
    const [record] = await addresses(ORG)

    expect(record.address.country).toBe('Belgium')
  })

  test('Should keep an unrecognised country code rather than dropping it', async () => {
    realMode()
    answerWith(
      servePagedAddressBook(1, 25, (id) => operator(id, { countryCode: 'ZZ' }))
    )

    const { addresses } = await addressBook()
    const [record] = await addresses(ORG)

    expect(record.address.country).toBe('ZZ')
  })
})

describe('without an organisation', () => {
  test('Should refuse to read, rather than ask for an organisation named "undefined"', async () => {
    realMode()
    const fetched = answerWith(
      servingCountries(() => okAnswer(operator('record-7')))
    )

    const { addresses, party } = await addressBook()

    await expect(addresses(undefined)).rejects.toThrow(
      /without an organisation/
    )
    await expect(party(undefined, 'record-7')).rejects.toThrow(
      /without an organisation/
    )
    expect(fetched.requests()).toEqual([])
  })
})

describe('#party', () => {
  test('Should resolve a record by its id', async () => {
    realMode()
    answerWith(servingCountries(() => okAnswer(operator('record-7'))))

    const { party } = await addressBook()

    expect(await party(ORG, 'record-7')).toMatchObject({
      id: 'record-7',
      deleted: false
    })
  })

  test('Should surface a soft-deleted record as deleted, not as missing', async () => {
    realMode()
    answerWith(
      servingCountries(() => okAnswer(operator('record-7', { deleted: true })))
    )

    const { party } = await addressBook()

    expect(await party(ORG, 'record-7')).toMatchObject({ deleted: true })
  })

  test('Should resolve to nothing for a record this organisation cannot see', async () => {
    realMode()
    answerWith(() => refusedAnswer(404, 'Not Found'))

    const { party } = await addressBook()

    expect(await party(ORG, 'record-7')).toBeUndefined()
  })

  test('Should raise on an outage rather than reporting the record gone', async () => {
    realMode()
    answerWith(() => refusedAnswer(500, 'Server Error'))

    const { party } = await addressBook()
    await expect(party(ORG, 'record-7')).rejects.toThrow(
      'address-book refused to get address: 500 Server Error'
    )
  })
})

describe('writes', () => {
  test('Should expose no way to add, change or remove a record', async () => {
    const book = await addressBook()

    expect(Object.keys(book).sort()).toEqual([
      'addresses',
      'offeredForRole',
      'party'
    ])
  })
})

describe('in stub mode', () => {
  test('Should read the stub book without calling the API', async () => {
    process.env.STUB_MODE = 'true'
    const fetched = answerWith(servePagedAddressBook(1))

    const { addresses } = await addressBook()
    const found = await addresses(ORG)

    expect(found.length).toBeGreaterThan(0)
    expect(fetched.requests()).toEqual([])
  })

  test('Should search the stub book by free text', async () => {
    process.env.STUB_MODE = 'true'

    const { addresses } = await addressBook()
    const found = await addresses(ORG, { query: 'nordvik' })

    expect(found).toHaveLength(1)
    expect(found[0].name).toContain('Nordvik')
  })

  test('Should keep a record holding the role asked for, and a record holding no role, dropping one holding another role', async () => {
    process.env.STUB_MODE = 'true'

    const { addresses } = await addressBook()
    const found = await addresses(ORG, { role: 'CONSIGNOR' })

    expect(found.some((record) => record.id === 'northgate-trading-ag')).toBe(
      true
    )
    expect(found.some((record) => record.id === 'unlisted-traders-ltd')).toBe(
      true
    )
    expect(found.some((record) => record.id === 'tech-imports-ltd')).toBe(false)
  })

  test('Should return only records carrying the role asked for, or carrying none', async () => {
    process.env.STUB_MODE = 'true'

    const { addresses } = await addressBook()
    const found = await addresses(ORG, { role: 'PLACE_OF_DESTINATION' })

    expect(
      found.every(
        (record) =>
          record.roles.includes('PLACE_OF_DESTINATION') ||
          record.roles.length === 0
      )
    ).toBe(true)
  })
})

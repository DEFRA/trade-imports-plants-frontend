import { withOrganisationId } from '../../common/helpers/organisation-id.js'
import { recordEmfDocuments } from '../../common/test-helpers/emf-documents.js'
import {
  fetchMock,
  resetMocksAndConfigAfterTests
} from '../engine/test-support.js'
import { DRAFT } from '../engine/persistence/records.js'
import { getAddress, listAddresses } from './address-book/client.js'
import { fetchCountries } from './countries/client.js'
import { records } from './persistence/records/real/index.js'
import { fetchPortsOfEntry } from './ports/client.js'

const ORGANISATION_ID = '5900001'
const JOURNEY_ID = 'GBN-AG-26-ABC123'
const actor = { id: '2100010101', organisationId: ORGANISATION_ID }

const notification = {
  referenceNumber: JOURNEY_ID,
  status: 'DRAFT',
  fulfilments: [],
  concurrencyToken: 0
}
const page = { items: [], page: 1, pageSize: 25, totalItems: 0, totalPages: 1 }
const address = { id: 'address-1', name: 'Farm', countryCode: 'GB' }

const callTo = (dependency) => (operation, call, body) => ({
  dependency,
  operation,
  call,
  body
})
const backendCall = (operation, call, body = notification) =>
  callTo('plants-backend')(operation, call, body)
const addressBookCall = callTo('address-book')
const referenceDataCall = callTo('reference-data')

const operationCatalogue = [
  backendCall('create-notification', () => records.create(actor)),
  backendCall('copy-notification', () => records.copy(JOURNEY_ID, 0, actor)),
  backendCall('get-fulfilment', () => records.load({ journeyId: JOURNEY_ID })),
  backendCall('list-notifications', () => records.list(), {
    content: [],
    page: 1,
    size: 20,
    totalElements: 0,
    totalPages: 0
  }),
  backendCall('replace-notification', () =>
    records.replaceFulfilment(
      JOURNEY_ID,
      {},
      { known: { journeyId: JOURNEY_ID, status: DRAFT } }
    )
  ),
  backendCall('submit-notification', () => records.submit(JOURNEY_ID, actor)),
  backendCall('amend-notification', () => records.amend(JOURNEY_ID, actor)),
  backendCall('cancel-amend-notification', () =>
    records.cancelAmend(JOURNEY_ID, actor)
  ),
  backendCall('soft-delete-notification', () =>
    records.softDelete(JOURNEY_ID, actor)
  ),
  addressBookCall('list-addresses', () => listAddresses(ORGANISATION_ID), page),
  addressBookCall(
    'get-address',
    () => getAddress(ORGANISATION_ID, address.id),
    address
  ),
  referenceDataCall('get-countries', () => fetchCountries(), []),
  referenceDataCall('get-ports-of-entry', () => fetchPortsOfEntry(), [])
]

const answerEveryRequest = (status, body) => {
  fetchMock.mockResponse(() => ({ status, body: JSON.stringify(body) }))
}

const asOrganisation = (call) => withOrganisationId(ORGANISATION_ID, call)

describe('each plants-backend, address-book and reference-data call is recorded under its fixed operation name', () => {
  resetMocksAndConfigAfterTests()
  const emf = recordEmfDocuments()

  beforeEach(() => {
    fetchMock.enableMocks()
  })

  const recordedCallsTo = async (dependency) => {
    await emf.publishMarkerAndAwaitEarlierPublishes()
    return emf
      .externalCalls()
      .filter((recorded) => recorded.dependency === dependency)
  }

  test.each(operationCatalogue)(
    '$dependency $operation is one successful call when it answers 200',
    async ({ dependency, operation, call, body }) => {
      answerEveryRequest(200, body)

      await asOrganisation(call)

      expect(await recordedCallsTo(dependency)).toEqual([
        { dependency, operation, failure: 0 }
      ])
    }
  )

  test.each(operationCatalogue)(
    '$dependency $operation is one failed call when it answers 503',
    async ({ dependency, operation, call }) => {
      answerEveryRequest(503, {})

      await expect(asOrganisation(call)).rejects.toThrow()

      expect(await recordedCallsTo(dependency)).toEqual([
        { dependency, operation, failure: 1 }
      ])
    }
  )
})

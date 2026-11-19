import { PARTIES } from '../../src/server/app/sets/high-risk-plants/journeys/linear/parties/index.js'

/**
 * Lighthouse walks party pickers by scraping the first `party` radio.
 * Create whichever of the addresses the registry's roles are missing via
 * the API, one record per role the registry names.
 */
const ORGANISATION_ID = '5900001'
const ORGANISATION_ID_HEADER = 'Trade-Imports-Organisation-Id'
const HTTP_CREATED = 201
const HTTP_OK = 200

const addressBookBase = () =>
  process.env.TRADE_IMPORTS_ADDRESS_BOOK_URL ?? 'http://localhost:8089'

const addressesUrl = (query = '') =>
  `${addressBookBase()}/organisation/${encodeURIComponent(ORGANISATION_ID)}/addresses${query}`

const headers = () => ({
  'Content-Type': 'application/json',
  [ORGANISATION_ID_HEADER]: ORGANISATION_ID
})

const addressCountMatching = async (role) => {
  const listed = await fetch(
    addressesUrl(`?role=${encodeURIComponent(role)}&page=1`),
    { headers: headers() }
  )
  if (listed.status !== HTTP_OK) {
    throw new Error(
      `Could not list address book for Lighthouse seed (${listed.status})`
    )
  }
  const body = await listed.json()
  return body.totalItems ?? body.items?.length ?? 0
}

const createAddressWithRole = async (role) => {
  const created = await fetch(addressesUrl(), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      name: `Lighthouse Seed Address (${role})`,
      addressLine1: '1 Test Street',
      townOrCity: 'London',
      postcode: 'SW1A 1AA',
      countryCode: 'GB',
      phone: '01632 960000',
      email: 'lighthouse@example.com',
      roles: [role]
    })
  })
  if (created.status !== HTTP_CREATED && created.status !== HTTP_OK) {
    throw new Error(
      `Could not create address for Lighthouse seed (${created.status})`
    )
  }
}

export const ensureAddressBookHasAnAddressForEachRole = async () => {
  const rolesPickersFilterBy = [
    ...new Set(PARTIES.map((party) => party.addressBookRole).filter(Boolean))
  ]
  for (const role of rolesPickersFilterBy) {
    const existing = await addressCountMatching(role)
    if (existing === 0) {
      await createAddressWithRole(role)
    }
  }
}

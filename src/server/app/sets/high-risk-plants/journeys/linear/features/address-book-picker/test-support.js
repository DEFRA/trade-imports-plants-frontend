import { expect } from 'vitest'

import { copy as pickerCopy } from './copy/copy.en.js'
import { ADDRESSES_A_PAGE, FIRST_PAGE } from './pagination.js'
import { TECH_IMPORTS_ID, TECH_IMPORTS_NAME } from '../../test-support.js'

export const IMPORT_CO = 'import-co-uk'

const LINE_1 = '18 Dockside Road'
const POSTCODE = 'E14 9GE'
const COUNTRY = 'United Kingdom'

export const NOT_IN_THE_BOOK = 'no-such-address'
export const DELETED_ID = 'closed-depot-ltd'

const API_PAGE_SIZE = 25

const apiRecord = (id, overrides = {}) => ({
  id,
  name: `Record ${id}`,
  addressLine1: '1 Test Street',
  townOrCity: 'Testville',
  postcode: 'TE5 7ER',
  countryCode: 'CH',
  deleted: false,
  roles: [],
  ...overrides
})

const LIVE_RECORDS = [apiRecord('live-depot-one'), apiRecord('live-depot-two')]

/** The address book's answer to an address request for a book whose
 * `DELETED_ID` record is deleted and whose list holds two live records. */
export const addressResponseForABookHoldingADeletedRecord = (request) => {
  const body = request.url.endsWith(`/addresses/${DELETED_ID}`)
    ? apiRecord(DELETED_ID, { deleted: true })
    : {
        items: LIVE_RECORDS,
        page: 1,
        pageSize: API_PAGE_SIZE,
        totalItems: LIVE_RECORDS.length,
        totalPages: 1
      }
  return { body: JSON.stringify(body) }
}

export const addressRecord = (id, name, address = {}) => ({
  id,
  name,
  deleted: false,
  address: {
    addressLine1: LINE_1,
    addressLine2: 'Unit 4',
    townOrCity: 'London',
    county: 'Greater London',
    postcode: POSTCODE,
    country: COUNTRY,
    phone: '01632 960123',
    email: 'trade@example.com',
    ...address
  }
})

const JOURNEY_ID = 'GBN-PL-26-ABC123'
const GIVEN_SLUG = 'parties/select'

const viewModelBoundFor =
  (pickerViewModel) =>
  (records, selectedId = '', page = 1, query = '') =>
    pickerViewModel(
      JOURNEY_ID,
      GIVEN_SLUG,
      { query, page, selectedId, found: records, trail: [] },
      pickerCopy
    )

const rowCases = ({ fieldName, pickerViewModel }) => {
  const found = [
    addressRecord(TECH_IMPORTS_ID, TECH_IMPORTS_NAME),
    addressRecord(IMPORT_CO, 'Import Co UK')
  ]

  const viewModelFor = viewModelBoundFor(pickerViewModel)

  return {
    name: '#pickerViewModel',
    cases: [
      {
        title:
          'Should give the first row the bare field name so the error link focuses it',
        check: () => {
          const picker = viewModelFor(found)

          expect(picker.rows.map((row) => row.idPrefix)).toEqual([
            fieldName,
            `${fieldName}-2`
          ])
        }
      },
      {
        title: 'Should tick the row the selection names, and only that one',
        check: () => {
          const picker = viewModelFor(found, IMPORT_CO)

          expect(picker.rows.map((row) => row.checked)).toEqual([false, true])
        }
      },
      {
        title: 'Should count the rows shown against every address found',
        check: () => {
          const picker = viewModelFor(found)

          expect(picker.resultsCount).toBe('Showing 2 out of 2 results')
        }
      },
      {
        title:
          'Should carry the country as its own column and leave it out of the address lines',
        check: () => {
          const picker = viewModelFor(found)

          expect(picker.rows[0].country).toBe(COUNTRY)
          expect(picker.rows[0].addressLines).toEqual([
            LINE_1,
            'Unit 4',
            `London, Greater London, ${POSTCODE}`
          ])
        }
      }
    ]
  }
}

const OVER_A_PAGE = ADDRESSES_A_PAGE + 1
const SECOND_PAGE = 2
const LAST_OF_OVER_A_PAGE = `record-${OVER_A_PAGE}`
const PAGES_FOR_AN_ELLIPSIS = 5
const ENOUGH_FOR_AN_ELLIPSIS = ADDRESSES_A_PAGE * PAGES_FOR_AN_ELLIPSIS

const numberedAddresses = (count) =>
  Array.from({ length: count }, (_, index) =>
    addressRecord(`record-${index + 1}`, `Record ${index + 1}`)
  )

const pagingCases = ({ fieldName, pickerViewModel }) => {
  const viewModelFor = viewModelBoundFor(pickerViewModel)

  return {
    name: '#pickerViewModel — paging',
    cases: [
      {
        title:
          'Should hold eight addresses on the first page, counted against every one found, and offer a link to the next',
        check: () => {
          const picker = viewModelFor(numberedAddresses(OVER_A_PAGE))

          expect(picker.rows).toHaveLength(ADDRESSES_A_PAGE)
          expect(picker.resultsCount).toBe(
            pickerCopy.resultsCount(ADDRESSES_A_PAGE, OVER_A_PAGE)
          )
          expect(picker.pagination.previous).toBeUndefined()
          expect(picker.pagination.next.href).toContain('page=2')
          expect(picker.pagination.next.text).toBe(pickerCopy.pagination.next)
        }
      },
      {
        title:
          'Should hold what is left on the page after the first, with a link back and none onward',
        check: () => {
          const picker = viewModelFor(
            numberedAddresses(OVER_A_PAGE),
            '',
            SECOND_PAGE
          )

          expect(picker.rows.map((row) => row.id)).toEqual([
            LAST_OF_OVER_A_PAGE
          ])
          expect(picker.resultsCount).toBe(
            pickerCopy.resultsCount(1, OVER_A_PAGE)
          )
          expect(picker.pagination.previous.text).toBe(
            pickerCopy.pagination.previous
          )
          expect(picker.pagination.next).toBeUndefined()
        }
      },
      {
        title: 'Should offer no paging while one page holds every address',
        check: () => {
          const picker = viewModelFor(numberedAddresses(ADDRESSES_A_PAGE))

          expect(picker.rows).toHaveLength(ADDRESSES_A_PAGE)
          expect(picker.pagination).toBeNull()
        }
      },
      {
        title:
          'Should give the first row of every page the bare field name, so the error link focuses it',
        check: () => {
          const picker = viewModelFor(
            numberedAddresses(OVER_A_PAGE),
            '',
            SECOND_PAGE
          )

          expect(picker.rows.map((row) => row.idPrefix)).toEqual([fieldName])
        }
      }
    ]
  }
}

const pagingLinkCases = ({ pickerViewModel }) => {
  const viewModelFor = viewModelBoundFor(pickerViewModel)

  return {
    name: '#pickerViewModel — paging links',
    cases: [
      {
        title:
          'Should carry the search term and the ticked address through every paging link, the previous and next links included',
        check: () => {
          const picker = viewModelFor(
            numberedAddresses(ENOUGH_FOR_AN_ELLIPSIS),
            'record-3',
            SECOND_PAGE,
            'record'
          )
          const everyLink = [
            picker.pagination.previous,
            picker.pagination.next,
            ...picker.pagination.items.filter((item) => !item.ellipsis)
          ]

          for (const link of everyLink) {
            expect(link.href).toContain('q=record')
            expect(link.href).toContain('selected=record-3')
          }
        }
      },
      {
        title:
          'Should stand an ellipsis in for the pages its numbers skip, as the address book list does',
        check: () => {
          const picker = viewModelFor(
            numberedAddresses(ENOUGH_FOR_AN_ELLIPSIS),
            '',
            SECOND_PAGE
          )

          expect(
            picker.pagination.items.map((item) =>
              item.ellipsis ? '…' : item.number
            )
          ).toEqual([
            FIRST_PAGE,
            SECOND_PAGE,
            SECOND_PAGE + 1,
            '…',
            PAGES_FOR_AN_ELLIPSIS
          ])
        }
      }
    ]
  }
}

/**
 * Builds the test cases every address picker's view model shares.
 *
 * @param {object} picker
 * @param {string} picker.fieldName - the answer name the page collects
 * @param {Function} picker.pickerViewModel - the page's bound view model
 * @returns {Array<{ name: string, cases: Array<{ title: string, check: Function }> }>}
 */
export const pickerViewModelSuites = (picker) => [
  rowCases(picker),
  pagingCases(picker),
  pagingLinkCases(picker)
]

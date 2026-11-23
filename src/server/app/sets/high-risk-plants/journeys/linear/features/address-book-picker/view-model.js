import { contactLines, pickerAddressLines } from './address-lines.js'
import {
  addressesBeforePage,
  addressesOnPage,
  pageCountOf,
  paginationLinks
} from './pagination.js'
import { pickerTableRows } from './table-rows.js'

const idPrefixFor = (fieldName) => (from, index) =>
  index === 0 ? fieldName : `${fieldName}-${from + index + 1}`

const resultRow = (idPrefix, from, selectedId) => (record, index) => ({
  id: record.id,
  idPrefix: idPrefix(from, index),
  name: record.name,
  addressLines: pickerAddressLines(record.address),
  country: record.address?.country,
  contactLines: contactLines(record.address),
  checked: record.id === selectedId
})

/**
 * The picker's view model, bound to the field the page collects. The bound
 * function takes the notification reference, the page's slug, the page state
 * (`query`, `page`, `selectedId`, an optional `error`, `found`, an optional
 * `tickedRecord`) and the shared picker copy.
 *
 * @param {object} binding
 * @param {string} binding.fieldName - the answer name the page collects.
 * @returns {Function} the picker's `pickerViewModel`.
 */
export const pickerViewModelFor = ({ fieldName }) => {
  const idPrefix = idPrefixFor(fieldName)

  return (
    journeyId,
    slug,
    { query, page, selectedId, error, found, tickedRecord },
    pickerCopy
  ) => {
    const from = addressesBeforePage(page)
    const rows = addressesOnPage(found, page).map(
      resultRow(idPrefix, from, selectedId)
    )

    return {
      query,
      page,
      error,
      tickedRecord,
      resultsCount: pickerCopy.resultsCount(rows.length, found.length),
      rows,
      tableRows: pickerTableRows(fieldName, rows, pickerCopy),
      pagination: paginationLinks(journeyId, slug, {
        query,
        page,
        totalPages: pageCountOf(found.length),
        selectedId,
        labels: pickerCopy.pagination
      })
    }
  }
}

import { CONSIGNOR } from '../fields.js'
import { addressText, detailLines } from './address-lines.js'
import { pagination } from './pagination.js'

/**
 * The radio id for a results row.
 *
 * The first row on every page takes the field name itself, so the error-summary
 * link `#consignor` always moves focus to the first control a trader
 * can choose. Later rows are numbered by their position in the whole result
 * set, so ids stay distinct across pages.
 */
const idPrefixFor = (from, index) =>
  index === 0 ? CONSIGNOR : `${CONSIGNOR}-${from + index + 1}`

/** One address-book record as a row of the picker's results table. */
const resultRow = (from, selectedId) => (record, index) => ({
  id: record.id,
  idPrefix: idPrefixFor(from, index),
  name: record.name,
  addressText: addressText(record.address),
  country: record.address?.country,
  detailLines: detailLines(record),
  checked: record.id === selectedId
})

/**
 * The picker's view model — the results table, the selection and the paging.
 *
 * @param {string} journeyId - the notification reference.
 * @param {object} state
 * @param {string} state.query - the search term the results were found with.
 * @param {string} state.selectedId - the address-book id currently ticked.
 * @param {string} [state.error] - the refusal to render above the table.
 * @param {object} state.found - one page of address-book results.
 * @param {object} [state.selected] - the record the ticked id resolves to.
 * @param {object} copy - the resolved copy bundle for this page.
 * @returns {object} the picker view model.
 */
export const pickerViewModel = (
  journeyId,
  { query, selectedId, error, found, selected },
  copy
) => {
  const from = (found.page - 1) * found.pageSize

  return {
    query,
    page: found.page,
    error,
    selected,
    resultsCaption: copy.resultsCaption(found.results.length, found.total),
    rows: found.results.map(resultRow(from, selectedId)),
    pagination: pagination(journeyId, {
      query,
      page: found.page,
      totalPages: found.totalPages,
      selectedId,
      labels: copy.pagination
    })
  }
}

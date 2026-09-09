import { pagePath } from '../../../../../../../shared/paths.js'
import { placeOfDestinationPage } from '../page.js'

const MINIMUM_PAGES_TO_PAGINATE = 2

/** Paging is a link, not a submit, so everything the next page needs travels
 * in the query string: the search term, the page and the row the trader has
 * already ticked. Without the selection a trader who picks a row on page one
 * and then pages loses it. */
export const resultsHref = (journeyId, { query, page, selectedId }) => {
  const params = new URLSearchParams()
  if (query) {
    params.set('q', query)
  }
  params.set('page', String(page))
  if (selectedId) {
    params.set('selected', selectedId)
  }
  return `${pagePath(journeyId, placeOfDestinationPage.slug)}?${params.toString()}`
}

/** First, last, and the page either side of the current one — anything the gap
 * skips over becomes an ellipsis. */
const numbersToShow = (page, totalPages) => {
  const shown = [1, page - 1, page, page + 1, totalPages].filter(
    (number) => number >= 1 && number <= totalPages
  )
  return [...new Set(shown)].sort((left, right) => left - right)
}

const itemsWithEllipses = (numbers, page, hrefFor) =>
  numbers.reduce(
    (acc, number) => {
      const items =
        number - acc.last > 1 ? [...acc.items, { ellipsis: true }] : acc.items
      return {
        items: [
          ...items,
          { number, href: hrefFor(number), current: number === page }
        ],
        last: number
      }
    },
    { items: [], last: 0 }
  ).items

/**
 * The `govukPagination` view model, or null when one page holds everything.
 *
 * @param {string} journeyId - the notification reference.
 * @param {object} state
 * @param {string} state.query - the search term the results were found with.
 * @param {number} state.page - the page being rendered.
 * @param {number} state.totalPages - how many pages the search found.
 * @param {string} state.selectedId - the address-book id currently ticked.
 * @param {object} state.labels - the resolved `previous` and `next` copy, so
 * the links read in the language the rest of the page is in rather than in
 * `govukPagination`'s built-in English.
 * @returns {object|null} the pagination view model, or null.
 */
export const pagination = (
  journeyId,
  { query, page, totalPages, selectedId, labels }
) => {
  if (totalPages < MINIMUM_PAGES_TO_PAGINATE) {
    return null
  }
  const hrefFor = (number) =>
    resultsHref(journeyId, { query, page: number, selectedId })
  return {
    previous:
      page > 1 ? { href: hrefFor(page - 1), text: labels.previous } : undefined,
    next:
      page < totalPages
        ? { href: hrefFor(page + 1), text: labels.next }
        : undefined,
    items: itemsWithEllipses(numbersToShow(page, totalPages), page, hrefFor)
  }
}

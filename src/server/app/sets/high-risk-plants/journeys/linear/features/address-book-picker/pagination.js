import { pagePath } from '../../../../../../shared/paths.js'

/** How many of a picker's addresses one page holds. */
export const ADDRESSES_A_PAGE = 8

const FIRST_PAGE = 1
const MINIMUM_PAGES_TO_PAGINATE = 2
const PAGES_EITHER_SIDE_OF_CURRENT = 1

export const pageCountOf = (addressesFound) =>
  Math.max(FIRST_PAGE, Math.ceil(addressesFound / ADDRESSES_A_PAGE))

/** The page the picker serves for the one asked for: the last page when the
 * request is past it. */
export const servedPageOf = (requestedPage, addressesFound) =>
  Math.min(requestedPage, pageCountOf(addressesFound))

export const addressesBeforePage = (page) =>
  (page - FIRST_PAGE) * ADDRESSES_A_PAGE

export const addressesOnPage = (addresses, page) => {
  const from = addressesBeforePage(page)
  return addresses.slice(from, from + ADDRESSES_A_PAGE)
}

/** The results link for one page of a picker: the search term, the page and
 * the row already ticked all travel in the query string, because paging is a
 * link and not a submit. */
export const resultsHref = (journeyId, slug, { query, page, selectedId }) => {
  const params = new URLSearchParams()
  if (query) {
    params.set('q', query)
  }
  if (page > FIRST_PAGE) {
    params.set('page', String(page))
  }
  if (selectedId) {
    params.set('selected', selectedId)
  }
  return `${pagePath(journeyId, slug)}?${params.toString()}`
}

const numbersToShow = (page, totalPages) => {
  const shown = [
    FIRST_PAGE,
    page - PAGES_EITHER_SIDE_OF_CURRENT,
    page,
    page + PAGES_EITHER_SIDE_OF_CURRENT,
    totalPages
  ].filter((number) => number >= FIRST_PAGE && number <= totalPages)
  return [...new Set(shown)].sort((left, right) => left - right)
}

const itemsWithEllipses = (numbers, page, hrefFor) =>
  numbers.flatMap((number, index, shown) => {
    const item = { number, href: hrefFor(number), current: number === page }
    const skipsPages = index > 0 && number - shown[index - 1] > 1
    return skipsPages ? [{ ellipsis: true }, item] : [item]
  })

/** The `govukPagination` view model for a picker, or nothing when one page
 * holds every address it offers. */
export const paginationLinks = (
  journeyId,
  slug,
  { query, page, totalPages, selectedId, labels }
) => {
  if (totalPages < MINIMUM_PAGES_TO_PAGINATE) {
    return null
  }
  const hrefFor = (number) =>
    resultsHref(journeyId, slug, { query, page: number, selectedId })
  return {
    previous:
      page > FIRST_PAGE
        ? { href: hrefFor(page - 1), text: labels.previous }
        : undefined,
    next:
      page < totalPages
        ? { href: hrefFor(page + 1), text: labels.next }
        : undefined,
    items: itemsWithEllipses(numbersToShow(page, totalPages), page, hrefFor)
  }
}

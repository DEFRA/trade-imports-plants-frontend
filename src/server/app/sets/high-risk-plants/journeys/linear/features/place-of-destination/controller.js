import { hubPath } from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import * as state from '../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../lib/http-status.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import * as addressBook from '../../../../../../services/address-book/index.js'
import { organisationIdOf } from '../../../../../../../common/helpers/organisation-id.js'
import {
  ALREADY_ARRIVED,
  ARRIVAL_STATUS,
  NOT_YET_ARRIVED
} from '../arrival-status/statuses.js'
import { placeOfDestinationPage as page } from './page.js'
import { PLACE_OF_DESTINATION, POTATO_DESTINATION } from './fields.js'
import { pickerViewModel } from './view-model/index.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

/**
 * Where the consignment is going, picked from the organisation's address book.
 *
 * The whole page is one form. The search button and the primary are both
 * submits, told apart by their `action` value, and paging is a link — so the
 * picker needs no client JavaScript at all.
 *
 * The answer stored is the address-book id and nothing else. The details are
 * resolved from the book on every read, so a record the trader later corrects
 * is corrected on the notification too, and a record they delete stops
 * resolving rather than leaving a stale copy behind.
 */
export const meta = { ...page, collects: [PLACE_OF_DESTINATION] }

const view = `${TEMPLATES}/features/place-of-destination/template`

const copy = copyFor({ en, cy })

const FIRST_PAGE = 1
const SEARCH_ACTION = 'search'

const parsePageNumber = (value) => {
  const number = Number.parseInt(value, 10)
  return Number.isNaN(number) ? FIRST_PAGE : number
}

const isSearch = (payload) => payload.action === SEARCH_ACTION

/**
 * Which of the three questions this page is asking.
 *
 * Potatoes are never asked whether the consignment has arrived — reg 24A gives
 * them no post-arrival branch — so a notification with no arrival status in
 * scope is asked for the intended destination. Plants and wood take the state
 * from the arrival-status page; one that has not been answered yet is asked
 * the pre-arrival question, which is the one the journey opens on.
 */
const destinationStateOf = (answers, scope) => {
  if (!scope.has(ARRIVAL_STATUS)) {
    return POTATO_DESTINATION
  }
  return answers[ARRIVAL_STATUS] === ALREADY_ARRIVED
    ? ALREADY_ARRIVED
    : NOT_YET_ARRIVED
}

const committedId = (answers) => answers[PLACE_OF_DESTINATION]?.addressId

/** A selection resolves only to a record the book still holds: a missing or
 * soft-deleted id is treated as no selection, the same way a stored reference
 * to a deleted record reads as never entered. An outage is not that — the
 * address book throws and the throw propagates, because an unavailable service
 * must never be indistinguishable from a deletion. */
const chosenFor = async (orgId, selectedId) => {
  if (!selectedId) {
    return undefined
  }
  const record = await addressBook.party(orgId, selectedId)
  return record && !record.deleted ? record : undefined
}

const render = async (
  request,
  h,
  current,
  { query, page: pageNumber, selectedId, error, recoverableError = false }
) => {
  const orgId = organisationIdOf(request)
  const found = await addressBook.search(orgId, { query, page: pageNumber })
  const selected = await chosenFor(orgId, selectedId)
  // A reference that no longer resolves must not travel as "Selected address"
  // or in the paging links, so it counts as no selection here too.
  const effectiveSelectedId = selected ? selectedId : ''
  const destinationState = destinationStateOf(current.answers, current.scope)

  return h.view(view, {
    ...kit.base(copy.title, {
      backLink: hubPath(current.journey.journeyId),
      journey: current.journey,
      page,
      recoverableError
    }),
    contentColumnClass: kit.surfaceClass('display'),
    copy,
    heading: copy.headings[destinationState],
    description: copy.descriptions[destinationState],
    errorSummary: kit.errorSummary(
      error ? { [PLACE_OF_DESTINATION]: error } : undefined,
      {
        href: () =>
          found.results.length > 0 ? `#${PLACE_OF_DESTINATION}` : '#q'
      }
    ),
    picker: pickerViewModel(
      current.journey.journeyId,
      { query, selectedId: effectiveSelectedId, error, found, selected },
      copy
    )
  })
}

const get = async (request, h) => {
  const current = await state.get(request, h)
  return render(request, h, current, {
    query: request.query.q ?? '',
    page: parsePageNumber(request.query.page),
    selectedId: request.query.selected ?? committedId(current.answers)
  })
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const query = payload.q ?? ''
  const selectedId = payload[PLACE_OF_DESTINATION] || payload.selected || ''
  const current = await state.get(request, h)

  if (isSearch(payload)) {
    // A new search starts at the first page, whichever page it was run from.
    return render(request, h, current, {
      query,
      page: FIRST_PAGE,
      selectedId
    })
  }

  const chosen = await chosenFor(organisationIdOf(request), selectedId)
  if (!chosen) {
    return (
      await render(request, h, current, {
        query,
        page: parsePageNumber(payload.page),
        selectedId: '',
        error: copy.errors.placeOfDestination
      })
    ).code(HTTP_STATUS_BAD_REQUEST)
  }

  let committed
  const { failure } = await kit.recoverableSave(
    async () => {
      committed = await state.commit(request, h, {
        [PLACE_OF_DESTINATION]: { addressId: chosen.id }
      })
    },
    async () =>
      (
        await render(request, h, current, {
          query,
          page: parsePageNumber(payload.page),
          selectedId: chosen.id,
          recoverableError: true
        })
      ).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  )
  if (failure) {
    return failure
  }

  return h.redirect(await kit.nextTarget(request, page, committed.scope))
}

export const routes = kit.pageRoutes(page, { get, post })

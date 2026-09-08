import { dashboardPage } from '../features/dashboard/page.js'
import { commodityTypePage } from '../features/commodity-type/page.js'
import {
  commoditiesPage,
  commodityDetailsPage
} from '../features/commodities/page.js'
import { originPage } from '../features/origin/page.js'
import { arrivalStatusPage } from '../features/arrival-status/page.js'

export const FLOW_ONLY_KEYS = []

/**
 * The journey's page order.
 *
 * The commodity entry sub-page sits in a section of its own rather than after
 * the list page it belongs to. `nextInSection` sends a page's Continue to the
 * next page in the same section, and the list page's Continue leaves the
 * commodity section altogether — the entry page is reached from the list and
 * returns to it, never by continuing past it. Its own section still gives it
 * the commodity-type prerequisite that every page after the entry question
 * carries.
 *
 * Origin follows the entry sub-page rather than preceding it. Its answer is
 * enforced at Continue, so every page placed after it needs one; ahead of the
 * entry sub-page it would stop a trader adding a commodity line until they had
 * named a country.
 *
 * The arrival section opens on the arrival-status question, whose answer
 * decides what the rest of the section asks for. Potato notifications never
 * see it: `arrivalStatus` is out of scope for them, so the derived page gate
 * fails and both the opening run and the section entry pass it over.
 */
export const sections = [
  { id: 'start', pages: [dashboardPage] },
  { id: 'commodity', pages: [commodityTypePage, commoditiesPage] },
  { id: 'commodityDetails', pages: [commodityDetailsPage] },
  { id: 'origin', pages: [originPage] },
  { id: 'arrival', pages: [arrivalStatusPage] }
]

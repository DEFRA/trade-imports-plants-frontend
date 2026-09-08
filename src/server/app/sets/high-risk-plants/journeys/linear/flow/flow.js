import { dashboardPage } from '../features/dashboard/page.js'
import { commodityTypePage } from '../features/commodity-type/page.js'
import {
  commoditiesPage,
  commodityDetailsPage
} from '../features/commodities/page.js'

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
 */
export const sections = [
  { id: 'start', pages: [dashboardPage] },
  { id: 'commodity', pages: [commodityTypePage, commoditiesPage] },
  { id: 'commodityDetails', pages: [commodityDetailsPage] }
]

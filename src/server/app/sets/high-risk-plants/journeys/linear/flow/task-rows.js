import { statusOf } from '../../../../../bridge/status/index.js'
import { collectsOf } from '../../../../../flow/dispatch.js'
import { commodityTypePage } from '../features/commodity-type/page.js'
import {
  commoditiesPage,
  commodityDetailsPage
} from '../features/commodities/page.js'
import { originPage } from '../features/origin/page.js'
import { arrivalStatusPage } from '../features/arrival-status/page.js'

/**
 * The hub's task rows.
 *
 * The arrival row holds only the arrival-status question so far, and that
 * question is out of scope for potatoes — so a potato notification sees the
 * row blocked until arrival-details, which every commodity type answers, joins
 * it. The row is not marked `conditional`: its content will not be wholly
 * conditional once that page lands.
 */
export const taskRows = [
  {
    id: 'commodities',
    pages: [commodityTypePage, commoditiesPage, commodityDetailsPage]
  },
  { id: 'origin', pages: [originPage] },
  { id: 'arrival', pages: [arrivalStatusPage] }
]

export const taskRowById = (id) => taskRows.find((row) => row.id === id)

export const rowParts = (row) =>
  row.parts ?? row.pages.flatMap((page) => collectsOf(page.id))

export const rowStatus = (row, answers, inScope, evaluation) =>
  statusOf(rowParts(row), answers, inScope, evaluation)

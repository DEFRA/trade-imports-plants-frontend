import * as identificationNumbers from './identification-numbers/controller.js'
import * as consignor from './consignor-select/controller.js'
import * as dashboard from './dashboard/controller.js'
import * as hub from './hub/controller.js'
import * as deleteNotification from './delete-notification/controller.js'
import * as commodityType from './commodity-type/controller.js'
import * as commoditiesList from './commodities/list/list.controller.js'
import * as commodityDetails from './commodities/details/details.controller.js'
import * as origin from './origin/controller.js'
import * as arrivalStatus from './arrival-status/controller.js'
import * as arrivalDetails from './arrival-details/controller.js'
import * as placeOfDestination from './place-of-destination/controller.js'

// Neither the dashboard nor the hub exports meta: they collect nothing, are
// never gated and are never a task row, so they stay out of the dispatch index.
// Nor does delete-notification: it is an action slug, not a journey page.
export const dispatchPages = [
  identificationNumbers.meta,
  commodityType.meta,
  commoditiesList.meta,
  commodityDetails.meta,
  origin.meta,
  arrivalStatus.meta,
  arrivalDetails.meta,
  consignor.meta,
  placeOfDestination.meta
]

export const allRoutes = [
  ...identificationNumbers.routes,
  ...dashboard.routes,
  ...hub.routes,
  ...deleteNotification.routes,
  ...commodityType.routes,
  ...commoditiesList.routes,
  ...commodityDetails.routes,
  ...origin.routes,
  ...arrivalStatus.routes,
  ...arrivalDetails.routes,
  ...consignor.routes,
  ...placeOfDestination.routes
]

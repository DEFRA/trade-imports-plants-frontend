import * as dashboard from './dashboard/controller.js'
import * as hub from './hub/controller.js'
import * as deleteNotification from './delete-notification/controller.js'
import * as commodityType from './commodity-type/controller.js'

// Neither the dashboard nor the hub exports meta: they collect nothing, are
// never gated and are never a task row, so they stay out of the dispatch index.
// Nor does delete-notification: it is an action slug, not a journey page.
export const dispatchPages = [commodityType.meta]

export const allRoutes = [
  ...dashboard.routes,
  ...hub.routes,
  ...deleteNotification.routes,
  ...commodityType.routes
]

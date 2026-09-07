import * as dashboard from './dashboard/controller.js'
import * as hub from './hub/controller.js'

// Neither the dashboard nor the hub exports meta: they collect nothing, are
// never gated and are never a task row, so they stay out of the dispatch index.
export const dispatchPages = []

export const allRoutes = [...dashboard.routes, ...hub.routes]

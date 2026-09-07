import * as dashboard from './dashboard/controller.js'

// The dashboard exports no meta: it collects nothing, is never gated and is
// never a task row, so it stays out of the dispatch index.
export const dispatchPages = []

export const allRoutes = [...dashboard.routes]

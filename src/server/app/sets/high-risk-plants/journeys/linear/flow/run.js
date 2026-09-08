import { hubPath, pagePath } from '../../../../../shared/paths.js'
import { pageGatePasses } from '../../../../../flow/gates.js'
import { commodityTypePage } from '../features/commodity-type/page.js'
import { commoditiesPage } from '../features/commodities/page.js'

const flowPageTarget = (page) => (scope, journeyId) =>
  pageGatePasses(page, scope) ? pagePath(journeyId, page.slug) : null

/** The opening run's ordered steps — a null target skips the step (see
 * docs/journey-flow-and-gates.md, "Opening run and entry guard"). The run
 * opens on commodity-type, the notification's entry question, and then asks
 * for the consignment's commodities. The entry sub-page is not a step: the
 * list page sends a trader with no lines there and takes them back. */
export const RUN_STEPS = [
  { id: commodityTypePage.id, target: flowPageTarget(commodityTypePage) },
  { id: commoditiesPage.id, target: flowPageTarget(commoditiesPage) }
]

export const nextRunTarget = (stepId, scope, journeyId) => {
  const index = RUN_STEPS.findIndex((step) => step.id === stepId)
  if (index === -1) {
    return null
  }
  for (const step of RUN_STEPS.slice(index + 1)) {
    const target = step.target(scope, journeyId)
    if (target) {
      return target
    }
  }
  return hubPath(journeyId)
}

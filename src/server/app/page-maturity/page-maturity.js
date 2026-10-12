import { config } from '../../../config/config.js'
import { copyFor } from '../shared/copy.js'
import { copy as copyCy } from './copy/copy.cy.js'
import { copy as copyEn } from './copy/copy.en.js'
import { TAG_CLASSES } from './levels.js'
import { PAGE_LEVELS, SECTION_LEVELS } from './page-levels.js'

const pageMaturityCopy = copyFor({ en: copyEn, cy: copyCy })

/**
 * Find the maturity level of a page from its hapi route pattern. An exact
 * entry in `PAGE_LEVELS` wins; otherwise the route is matched against
 * `SECTION_LEVELS`, where a section covers itself and everything beneath it.
 *
 * @param {string} [routePath] - the hapi route pattern, such as
 * `/high-risk-plants/notifications/{journeyId}/origin`.
 * @returns {string|undefined} the level id, or undefined when the page is not
 * listed.
 */
export function pageLevelFor(routePath) {
  if (!routePath) {
    return undefined
  }
  if (Object.hasOwn(PAGE_LEVELS, routePath)) {
    return PAGE_LEVELS[routePath]
  }
  return SECTION_LEVELS.find(
    ({ section }) =>
      routePath === section || routePath.startsWith(`${section}/`)
  )?.level
}

/**
 * The view context for the page maturity banner. Empty when the switch is off
 * or the request's route has no level, so the rendered page is unchanged.
 *
 * @param {object} request - the hapi request.
 * @returns {{pageMaturity?: {tag: {text: string, classes: string}, text: string, hiddenPrefix: string}}}
 * the context to spread into the view model.
 */
export function pageMaturityContext(request) {
  if (!config.get('pageMaturityBanner.enabled')) {
    return {}
  }
  const level = pageLevelFor(request.route?.path)
  if (!level) {
    return {}
  }
  const levelCopy = pageMaturityCopy.levels[level]
  return {
    pageMaturity: {
      tag: { text: levelCopy.tag, classes: TAG_CLASSES[level] },
      text: levelCopy.text,
      hiddenPrefix: pageMaturityCopy.hiddenPrefix
    }
  }
}

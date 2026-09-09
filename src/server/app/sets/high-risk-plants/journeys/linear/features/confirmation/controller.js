import {
  dashboardPath,
  pagePath,
  pageRoutePath
} from '../../../../../../shared/paths.js'
import * as state from '../../../../../../engine/index.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { TEMPLATES } from '../../config.js'
import { confirmationPage as page } from './page.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

export const meta = { ...page, collects: [] }
const copy = copyFor({ en, cy })
const get = async (request, h) => {
  const { journey } = await state.get(request, h)
  if (journey.status !== state.SUBMITTED) {
    return h.redirect(pagePath(journey.journeyId, kit.CYA_SLUG))
  }
  return h.view(`${TEMPLATES}/features/confirmation/template`, {
    ...kit.base(copy.title, { journey, page }),
    copy,
    reference: journey.journeyId,
    notificationHref: pagePath(journey.journeyId, kit.CYA_SLUG),
    dashboardHref: dashboardPath()
  })
}

// Confirmation is a read-only receipt; there is no form or POST action.
export const routes = [
  {
    method: 'GET',
    path: pageRoutePath(page.slug),
    options: kit.routeOptions,
    handler: get
  }
]

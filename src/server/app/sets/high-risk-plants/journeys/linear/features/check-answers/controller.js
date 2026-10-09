import { hubPath, pagePath } from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import * as state from '../../../../../../engine/index.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import * as addressBook from '../../../../../../services/address-book/index.js'
import { organisationIdOf } from '../../../../../../../common/helpers/organisation-id.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../../../../../lib/http-status.js'
import { notificationViewPage as page } from './page.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'
import { buildSections } from './view-model/index.js'
import { changeHref } from './view-model/rows/change-link.js'
import { outstandingPartyErrors } from './view-model/outstanding-parties.js'
import {
  outstandingRowErrors,
  outstandingRowHref,
  ROW_KEY_PREFIX
} from './view-model/outstanding-rows.js'
import { completeOpeningRun } from '../../../../../../flow/run-state.js'
import { originErrors } from '../origin/controller.js'

import { lateness, requestClock } from '../review/lateness.js'
import {
  POTATO_DAYS_BEFORE_ARRIVAL,
  PLANTS_WOOD_DAYS_AFTER_ARRIVAL
} from '../timing-windows.js'

export const meta = { ...page, collects: [] }
const view = `${TEMPLATES}/features/check-answers/template`
const copy = copyFor({ en, cy })

const partiesFor = async (request, source, scope) => {
  const parties = {}
  for (const field of ['placeOfDestination', 'consignor', 'contactAddress']) {
    const saved = source[field]
    if (!scope.has(field) || !saved) {
      continue
    }
    const party = saved.addressId
      ? await addressBook.party(organisationIdOf(request), saved.addressId)
      : saved
    if (party && !party.deleted) {
      parties[field] = party
    }
  }
  return parties
}

/** Every reason the notification cannot go on: origin and removed-party errors
 * first, then one entry per task row still to complete. A row already named by
 * a field or party error is not named twice. The sanitiser drops unresolved
 * references that the page must name, so the party errors read the stored
 * answers; the rest of the page uses sanitised answers. */
const continueErrors = async (current, source, parties) => {
  const fieldErrors = {
    ...(await originErrors(current)),
    ...outstandingPartyErrors(source, parties)
  }
  return {
    ...fieldErrors,
    ...outstandingRowErrors(current, Object.keys(fieldErrors))
  }
}

const errorHref = (current, key) =>
  key.startsWith(ROW_KEY_PREFIX)
    ? outstandingRowHref(key, current.scope, current.journey.journeyId)
    : changeHref(current.journey.journeyId, key)

const render = async (request, h, current, disableAutoFocus = true) => {
  const readOnly = current.journey.status === state.SUBMITTED
  const source = current.storedAnswers ?? current.answers
  const parties = await partiesFor(request, source, current.scope)
  const errors = readOnly ? {} : await continueErrors(current, source, parties)
  return h.view(view, {
    ...kit.base(copy.title, {
      journey: current.journey,
      page,
      backLink: hubPath(current.journey.journeyId)
    }),
    contentColumnClass: kit.surfaceClass('display'),
    copy,
    readOnly,
    lateWarning:
      current.journey.status === state.DRAFT &&
      lateness(
        requestClock(request),
        current.answers.commodityType,
        current.answers.arrivalDate
      ) === 'late',
    lateNotification:
      readOnly && current.answers.lateNotificationIndicator === 'late',
    lateRule:
      current.answers.commodityType === 'potatoes'
        ? copy.late.potatoes(POTATO_DAYS_BEFORE_ARRIVAL)
        : copy.late.plantsAndWood(PLANTS_WOOD_DAYS_AFTER_ARRIVAL),
    sections: await buildSections(current, parties, readOnly),
    errorSummary: kit.errorSummary(errors, {
      href: (key) => errorHref(current, key),
      disableAutoFocus
    }),
    deleteHref: readOnly ? pagePath(current.journey.journeyId, 'delete') : null,
    // Ruled c-030: AMEND offers Cancel amendment instead of Delete; the
    // success banner shows once, after cancel-amend's own redirect.
    cancelAmendHref:
      current.journey.status === state.AMEND
        ? pagePath(current.journey.journeyId, 'cancel-amend')
        : null,
    amendmentCancelled: readOnly && request.query.cancelled === '1'
  })
}

const get = async (request, h) => {
  await completeOpeningRun(request, h, request.params.journeyId)
  return render(request, h, await state.get(request, h))
}

const post = async (request, h) => {
  const current = await state.get(request, h)
  if (current.journey.status === state.SUBMITTED) {
    return h.redirect(pagePath(current.journey.journeyId, page.slug))
  }
  const source = current.storedAnswers ?? current.answers
  const parties = await partiesFor(request, source, current.scope)
  const errors = await continueErrors(current, source, parties)
  if (
    Object.keys(errors).length > 0 ||
    !current.scope.readyForCheckYourAnswers
  ) {
    return (await render(request, h, current, false)).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }
  return h.redirect(await kit.nextTarget(request, page, current.scope))
}

export const routes = kit.pageRoutes(page, { get, post })

import { hubPath, pagePath } from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import * as state from '../../../../../../engine/index.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../../../../../lib/http-status.js'
import { notificationViewPage as page } from './page.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'
import { buildSections } from './view-model/index.js'
import { changeHref } from './view-model/rows/change-link.js'
import { reviewErrors } from './refusal.js'
import { PARTIES, partyOf } from '../../parties/index.js'
import { toDisplayParty } from '../../parties/picked-party.js'
import { partyEditHref } from '../party-edit/edit-href.js'

import { lateness, requestClock } from '../review/lateness.js'
import {
  POTATO_DAYS_BEFORE_ARRIVAL,
  PLANTS_WOOD_DAYS_AFTER_ARRIVAL
} from '../timing-windows.js'

export const meta = { ...page, collects: [] }
const view = `${TEMPLATES}/features/check-answers/template`
const copy = copyFor({ en, cy })

const partyDisplayValuesFor = async ({ answers, scope }) => {
  const partyDisplayValuesById = {}
  for (const { id } of PARTIES) {
    const partyDisplayValues = scope.has(id)
      ? await toDisplayParty(answers[id])
      : undefined
    if (partyDisplayValues) {
      partyDisplayValuesById[id] = partyDisplayValues
    }
  }
  return partyDisplayValuesById
}

/** Party errors are keyed `party:<id>` so their summary entries link to the
 * page that edits the copied address, returning here, rather than to the
 * picker a Change link opens. */
const PARTY_KEY_PREFIX = 'party:'

const summaryHref = (journeyId) => (key) =>
  key.startsWith(PARTY_KEY_PREFIX)
    ? partyEditHref(
        journeyId,
        partyOf(key.slice(PARTY_KEY_PREFIX.length)),
        kit.CYA_SLUG
      )
    : changeHref(journeyId, key)

const summaryErrors = ({ answerErrors, partyErrors }) => ({
  ...answerErrors,
  ...Object.fromEntries(
    Object.entries(partyErrors).map(([id, text]) => [
      `${PARTY_KEY_PREFIX}${id}`,
      text
    ])
  )
})

const render = async (request, h, current, disableAutoFocus = true) => {
  const readOnly = current.journey.status === state.SUBMITTED
  const partyDisplayValuesById = await partyDisplayValuesFor(current)
  const errors = readOnly ? {} : summaryErrors(await reviewErrors(current))
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
    sections: await buildSections(current, partyDisplayValuesById, readOnly),
    errorSummary: kit.errorSummary(errors, {
      href: summaryHref(current.journey.journeyId),
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

const get = async (request, h) =>
  render(request, h, await state.get(request, h))

const post = async (request, h) => {
  const current = await state.get(request, h)
  if (current.journey.status === state.SUBMITTED) {
    return h.redirect(pagePath(current.journey.journeyId, page.slug))
  }
  const errors = summaryErrors(await reviewErrors(current))
  if (Object.keys(errors).length > 0) {
    return (await render(request, h, current, false)).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }
  if (!current.scope.readyForCheckYourAnswers) {
    return h.redirect(hubPath(current.journey.journeyId))
  }
  return h.redirect(await kit.nextTarget(request, page, current.scope))
}

export const routes = kit.pageRoutes(page, { get, post })

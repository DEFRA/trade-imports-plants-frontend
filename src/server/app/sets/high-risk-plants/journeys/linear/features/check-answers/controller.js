import {
  dashboardPath,
  hubPath,
  pagePath
} from '../../../../../../shared/paths.js'
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
import {
  cardAnchorHref,
  incompleteCardErrors,
  withCardErrors
} from './view-model/incomplete-cards.js'
import { reviewErrors } from './refusal.js'
import { completeOpeningRun } from '../../../../../../flow/run-state.js'
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
 * picker a Change link opens. An unfinished card is somewhere on this page,
 * so its entry is an anchor to the card. */
const PARTY_KEY_PREFIX = 'party:'

const summaryHref = (current) => (key) => {
  const { journeyId } = current.journey
  if (key.startsWith(PARTY_KEY_PREFIX)) {
    return partyEditHref(
      journeyId,
      partyOf(key.slice(PARTY_KEY_PREFIX.length)),
      kit.CYA_SLUG
    )
  }
  return cardAnchorHref(key) ?? changeHref(journeyId, key)
}

const cardErrorsOf = (current, { answerErrors, partyErrors }) =>
  incompleteCardErrors(current, [
    ...Object.keys(answerErrors),
    ...Object.keys(partyErrors)
  ])

/** Cancel amend stands at the foot only while amending; Delete is in the header
 * of a draft's and a submitted notification's view. */
const endButtonHrefs = ({ status, journeyId }) => ({
  cancelAmendHref:
    status === state.AMEND ? pagePath(journeyId, kit.CANCEL_AMEND_SLUG) : null
})

// A UTC instant shown as the Europe/London civil date.
const longDateText = (iso) =>
  new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/London'
  })

const submittedDateText = (submittedAt) =>
  submittedAt ? copy.viewHeader.dateSubmitted(longDateText(submittedAt)) : null

const createdDateText = (createdAt) =>
  createdAt ? copy.viewHeader.dateCreated(longDateText(createdAt)) : null

const viewHeaderOf = (journey) => ({
  reference: journey.journeyId,
  status: kit.journeyStrip(journey).status,
  dateCreated:
    journey.status === state.DRAFT ? createdDateText(journey.createdAt) : null,
  dateSubmitted:
    journey.status === state.DRAFT
      ? null
      : submittedDateText(journey.submittedAt),
  actions: {
    amendHref:
      journey.status === state.SUBMITTED
        ? pagePath(journey.journeyId, 'amend')
        : null,
    deleteHref: pagePath(journey.journeyId, 'delete')
  },
  importReferences: [
    {
      key: { text: copy.importReferences.notificationReference },
      value: { text: journey.journeyId }
    }
  ]
})

/** A submitted notification's view and a draft's check answers are titled and
 * headed by the reference, with no status bar; a submitted view's Back goes to
 * the notification list, a draft's and an amendment's to Overview; an amendment
 * keeps Check your answers and the status bar. */
const chromeOf = (journey, readOnly) => {
  const headed = readOnly || journey.status === state.DRAFT
  const chrome = kit.base(headed ? journey.journeyId : copy.title, {
    journey,
    page,
    backLink: readOnly ? dashboardPath() : hubPath(journey.journeyId),
    offerCancelAmend: false
  })
  return {
    ...chrome,
    journeyStrip: headed ? null : chrome.journeyStrip,
    viewHeader: headed ? viewHeaderOf(journey) : null
  }
}

/** Every reason the notification cannot go on: answer and invalid-party errors
 * first, then one entry per card still to complete, in page order. A card
 * already named by an answer or party error is not named twice. */
const summaryErrors = (current, reviewed) => ({
  ...reviewed.answerErrors,
  ...Object.fromEntries(
    Object.entries(reviewed.partyErrors).map(([id, text]) => [
      `${PARTY_KEY_PREFIX}${id}`,
      text
    ])
  ),
  ...cardErrorsOf(current, reviewed)
})

/** A submitted notification names nothing in error. c-201: an amendment opens
 * with no errors; once its Continue is refused, it names them like a draft. */
const reviewedFor = (current, refused) => {
  const { status } = current.journey
  const named =
    status !== state.SUBMITTED && (status !== state.AMEND || refused)
  return named ? reviewErrors(current) : null
}

const render = async (
  request,
  h,
  current,
  disableAutoFocus = true,
  refused = false
) => {
  const readOnly = current.journey.status === state.SUBMITTED
  const partyDisplayValuesById = await partyDisplayValuesFor(current)
  const reviewed = await reviewedFor(current, refused)
  const errors = reviewed ? summaryErrors(current, reviewed) : {}
  return h.view(view, {
    ...chromeOf(current.journey, readOnly),
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
    sections: withCardErrors(
      await buildSections(current, partyDisplayValuesById, readOnly, {
        partyFieldErrorsById: reviewed?.partyFieldErrorsById ?? {}
      }),
      reviewed ? cardErrorsOf(current, reviewed) : {}
    ),
    errorSummary: kit.errorSummary(errors, {
      href: summaryHref(current),
      disableAutoFocus
    }),
    ...endButtonHrefs(current.journey),
    // Ruled c-030: the success banner shows once, after cancel-amend's own
    // redirect.
    amendmentCancelled: readOnly && request.query.cancelled === '1'
  })
}

const renderOrList = async (request, h) => {
  try {
    return await render(request, h, await state.get(request, h))
  } catch (error) {
    if (state.isJourneyNotFound(error)) {
      return h.redirect(dashboardPath())
    }
    throw error
  }
}

const get = async (request, h) => {
  await completeOpeningRun(request, h, request.params.journeyId)
  return renderOrList(request, h)
}

const post = async (request, h) => {
  const current = await state.get(request, h)
  if (current.journey.status === state.SUBMITTED) {
    return h.redirect(pagePath(current.journey.journeyId, page.slug))
  }
  const errors = summaryErrors(current, await reviewErrors(current))
  if (
    Object.keys(errors).length > 0 ||
    !current.scope.readyForCheckYourAnswers
  ) {
    return (await render(request, h, current, false, true)).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }
  return h.redirect(await kit.nextTarget(request, page, current.scope))
}

export const routes = kit.pageRoutes(page, { get, post })

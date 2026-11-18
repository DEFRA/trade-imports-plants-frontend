import { DRAFT, SUBMITTED } from '../../../../../../../engine/index.js'
import { pagePath } from '../../../../../../../shared/paths.js'
import { journeyStrip } from '../../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import { notificationActionSlugs } from '../../../flow/notification-action-slugs.js'
import { formatMomentAsLongDay } from '../../../../../../../lib/validate/index.js'
import { submittedDayText } from './submitted-day-text.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const copy = copyFor({ en, cy })

const deleteButtonFor = (journey) => ({
  text: copy.delete,
  href: pagePath(journey.journeyId, notificationActionSlugs.delete),
  classes: 'govuk-button--warning'
})

const dateLine = (journey) => {
  if (journey.status === SUBMITTED) {
    const submittedDay = submittedDayText(journey)
    return submittedDay ? copy.viewHeader.dateSubmitted(submittedDay) : null
  }
  return journey.createdAt
    ? copy.viewHeader.dateCreated(
        formatMomentAsLongDay(new Date(journey.createdAt))
      )
    : null
}

const amendAction = (journey) =>
  journey.status === SUBMITTED
    ? {
        text: copy.viewHeader.amend,
        postAction: pagePath(journey.journeyId, notificationActionSlugs.amend)
      }
    : null

const importReferences = ({ journeyId }) => {
  const customsDocumentCode = 'C085'
  return {
    heading: copy.importReferences.heading,
    warning: {
      text: copy.importReferences.warning,
      iconFallbackText: copy.importReferences.warningIcon
    },
    rows: [
      {
        key: { text: copy.importReferences.notificationReference },
        value: { text: journeyId }
      },
      {
        key: { text: copy.importReferences.customsDocumentCode },
        value: { text: customsDocumentCode }
      }
    ]
  }
}

/**
 * The header of a notification's view, for a draft and for a submitted
 * notification.
 *
 * @param {object} journey - the journey being viewed.
 * @returns {object|null} null unless the journey is a draft or submitted.
 * Otherwise the reference, the
 * status tag, the date line (Date created for a draft, Date submitted for a
 * submitted notification, null without the stored instant), the Amend action
 * (null for a draft) and Delete button, and the import reference numbers
 * section.
 */
export const viewHeader = (journey) => {
  if (journey.status !== DRAFT && journey.status !== SUBMITTED) {
    return null
  }
  return {
    reference: journey.journeyId,
    status: journeyStrip(journey).status,
    dateLine: dateLine(journey),
    actions: {
      amend: amendAction(journey),
      delete: deleteButtonFor(journey)
    },
    importReferences: importReferences(journey)
  }
}

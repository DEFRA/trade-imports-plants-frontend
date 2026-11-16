import { DRAFT, SUBMITTED } from '../../../../../../../engine/index.js'
import { pagePath } from '../../../../../../../shared/paths.js'
import { journeyStrip } from '../../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import { notificationActionSlugs } from '../../../flow/notification-action-slugs.js'
import { notificationDateText } from '../../review/notification-date.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const copy = copyFor({ en, cy })

const deleteButtonFor = (journey) => ({
  text: copy.delete,
  href: pagePath(journey.journeyId, notificationActionSlugs.delete),
  classes: 'govuk-button--warning'
})

const dateLine = (journey) => {
  const { datedLineFor, instant } =
    journey.status === SUBMITTED
      ? {
          datedLineFor: copy.viewHeader.dateSubmitted,
          instant: journey.submittedAt
        }
      : {
          datedLineFor: copy.viewHeader.dateCreated,
          instant: journey.createdAt
        }
  return instant ? datedLineFor(notificationDateText(instant)) : null
}

const amendAction = (journey) =>
  journey.status === SUBMITTED
    ? {
        text: copy.viewHeader.amend,
        formAction: pagePath(journey.journeyId, notificationActionSlugs.amend)
      }
    : null

const importReferences = ({ journeyId }) => ({
  heading: copy.importReferences.heading,
  warning: {
    text: copy.importReferences.warning,
    iconFallbackText: copy.importReferences.warningIcon
  },
  rows: [
    {
      key: { text: copy.importReferences.notificationReference },
      value: { text: journeyId }
    }
  ]
})

/**
 * The header of a notification's view, for a draft and for a submitted
 * notification. An amendment has no header.
 *
 * @param {object} journey - the journey being viewed.
 * @returns {object|null} null for an amendment. Otherwise the reference, the
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

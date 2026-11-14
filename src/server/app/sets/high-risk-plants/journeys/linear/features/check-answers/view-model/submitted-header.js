import { pagePath } from '../../../../../../../shared/paths.js'
import { journeyStrip } from '../../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import { notificationActionSlugs } from '../../../flow/notification-action-slugs.js'
import { notificationDateText } from '../../review/notification-date.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const copy = copyFor({ en, cy })

/**
 * The Delete notification button of a journey's review.
 *
 * @param {object} journey - the journey being reviewed.
 * @returns {object} the button's text, delete page and warning style.
 */
export const deleteButtonFor = (journey) => ({
  text: copy.delete,
  href: pagePath(journey.journeyId, notificationActionSlugs.delete),
  classes: 'govuk-button--warning'
})

const dateSubmittedLine = ({ submittedAt }) =>
  submittedAt
    ? copy.submittedHeader.dateSubmitted(notificationDateText(submittedAt))
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
 * The header of a submitted notification's read-only view.
 *
 * @param {object} journey - a submitted journey.
 * @returns {object} the reference, the status tag, the date submitted line
 * (null without a stored submission instant), the Amend form action and Delete
 * button, and the import reference numbers section.
 */
export const submittedHeader = (journey) => ({
  reference: journey.journeyId,
  status: journeyStrip(journey).status,
  dateSubmitted: dateSubmittedLine(journey),
  actions: {
    amend: {
      text: copy.submittedHeader.amend,
      formAction: pagePath(journey.journeyId, notificationActionSlugs.amend)
    },
    delete: deleteButtonFor(journey)
  },
  importReferences: importReferences(journey)
})

import { hubPath, pagePath } from '../../../../../../../../shared/paths.js'
import {
  AMEND,
  DRAFT,
  SUBMITTED
} from '../../../../../../../../engine/index.js'
import {
  CYA_SLUG,
  TRAIL_START,
  withTrail
} from '../../../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import { notificationActionSlugs } from '../../../../flow/notification-action-slugs.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { copy as sharedEn } from '../../../../../../../../shared/copy.en.js'
import { copy as sharedCy } from '../../../../../../../../shared/copy.cy.js'

const copy = copyFor({ en, cy })
const sharedCopy = copyFor({ en: sharedEn, cy: sharedCy })

/**
 * The actions one notification card offers, in the order they are rendered.
 *
 * Every action carries an `href`, which the summary card renders as a link in
 * its action list, named by the card title. There is no Copy as new action:
 * it is parked with reuse-previous-consignment.
 *
 * @param {object} journey - the marshalled list row.
 * @returns {object[]} the actions for this row's status.
 */
export const rowActions = (journey) => {
  const deleteAction = {
    text: sharedCopy.notificationActions.delete.text,
    href: pagePath(journey.journeyId, notificationActionSlugs.delete)
  }
  const resumeAction = {
    text: copy.actions.resume,
    href: hubPath(journey.journeyId)
  }

  if (journey.status === SUBMITTED) {
    return [
      {
        text: copy.actions.view,
        href: withTrail(pagePath(journey.journeyId, CYA_SLUG), [
          TRAIL_START.dashboard
        ])
      },
      {
        text: copy.actions.amend,
        href: pagePath(journey.journeyId, notificationActionSlugs.amend)
      },
      deleteAction
    ]
  }
  if (journey.status === DRAFT) {
    return [resumeAction, deleteAction]
  }
  if (journey.status === AMEND) {
    return [
      resumeAction,
      {
        text: copy.actions.cancelAmend,
        href: pagePath(journey.journeyId, notificationActionSlugs.cancelAmend)
      },
      deleteAction
    ]
  }
  return []
}

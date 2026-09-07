import { copyFor } from '../../../../../../shared/copy.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'
import { dashboardPage } from '../../features/dashboard/page.js'

const copy = copyFor({ en, cy })

/**
 * Which section of the notification each page belongs to.
 *
 * The caption above a page heading tells someone part-way through a long
 * notification which part of it they are in, so the value is a property of
 * where the page sits in the journey, not of the page's own copy. One entry
 * per section, listing its pages — never a string per page.
 *
 * Only the dashboard exists so far. The journey spec names four more sections
 * for pages still to be built, and each page increment files its own page
 * here as it lands:
 *
 * - `aboutTheConsignment` — commodity-type, commodities, commodity-details,
 *   origin
 * - `arrival` — arrival-status, arrival-details
 * - `destination` — place-of-destination
 * - `consignmentParties` — consignor-select, identification-numbers
 *
 * A page that is absent is deliberately bare. The overview hub, the contact
 * page, check your answers, declaration and confirmation open straight into
 * their heading. The unit test beside this file lists those pages explicitly,
 * so a new page cannot arrive without a decision either way.
 */
export const captionSections = [{ id: 'dashboard', pages: [dashboardPage] }]

const sectionIdByPageId = new Map(
  captionSections.flatMap((section) =>
    section.pages.map((page) => [page.id, section.id])
  )
)

/**
 * The caption a page renders above its heading.
 *
 * @param {string} [pageId] - the page identity's `id`.
 * @returns {string|undefined} the section name, or undefined for a page that
 * carries no caption.
 */
export const sectionCaptionOf = (pageId) => {
  const sectionId = sectionIdByPageId.get(pageId)
  return sectionId ? copy.sections[sectionId] : undefined
}

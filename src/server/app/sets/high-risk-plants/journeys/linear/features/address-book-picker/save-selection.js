import { organisationIdOf } from '../../../../../../../common/helpers/organisation-id.js'
import * as kit from '../../../../../../shared/kit.js'
import { chosenFor } from './render.js'

export const SELECTION = {
  nothingChosen: 'nothing-chosen',
  notInBook: 'not-in-book',
  chosen: 'chosen'
}

/**
 * Decides what a picker save does with the posted selection.
 *
 * Resolves to `{ outcome: SELECTION.nothingChosen }` when nothing was posted,
 * `{ outcome: SELECTION.notInBook }` when the id is not a live record in the
 * organisation's address book, and `{ outcome: SELECTION.chosen, record }`
 * otherwise. The first two are logged here.
 *
 * @param {object} request - the Hapi request.
 * @param {object} selection
 * @param {string} selection.fieldName - the answer name the picker collects.
 * @param {string} selection.selectedId - the address-book id posted, or ''.
 * @param {string} selection.notInBookMessage - the message the page shows for an id not in the book.
 * @returns {Promise<{ outcome: string, record?: object }>} the decision.
 */
export const resolveSelectionOnSave = async (
  request,
  { fieldName, selectedId, notInBookMessage }
) => {
  const { journeyId } = request.params

  if (!selectedId) {
    request.logger.info(
      { journeyId, fieldName },
      'Address picker saved with no address chosen, nothing committed'
    )
    return { outcome: SELECTION.nothingChosen }
  }

  const record = await chosenFor(organisationIdOf(request), selectedId)
  if (!record) {
    kit.logRefusal(request, {
      fieldErrors: { [fieldName]: notInBookMessage },
      reason: 'not-in-address-book',
      addressId: selectedId
    })
    return { outcome: SELECTION.notInBook }
  }

  return { outcome: SELECTION.chosen, record }
}

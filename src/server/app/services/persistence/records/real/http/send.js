import { headers } from './headers.js'
import { refusalErrorFor } from './refusal-error.js'
import { backendFetch } from '../../../../../../common/helpers/backend-client/backend-fetch.js'
import { markRefusalLogged } from '../../errors.js'
import { journeyReferenceFields } from '../journey-reference-fields.js'
import { logger } from '../logger.js'

export const requestBackend = (operation, url, { method, body }) =>
  backendFetch(operation, url, {
    method,
    headers: headers(),
    body: body === undefined ? undefined : JSON.stringify(body)
  })

export const refuseUnlessOk = async (
  operation,
  response,
  { journeyId } = {}
) => {
  if (!response.ok) {
    const error = await refusalErrorFor(operation, response, { journeyId })
    logger.warn(
      { err: error, ...journeyReferenceFields(journeyId) },
      'Backend refused request'
    )
    throw markRefusalLogged(error)
  }
  return response
}

export const send = async (operation, url, init, ids) =>
  refuseUnlessOk(operation, await requestBackend(operation, url, init), ids)

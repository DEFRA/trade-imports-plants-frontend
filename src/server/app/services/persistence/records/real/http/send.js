import { headers } from './headers.js'
import { refusalCodeOf } from './refusal-code.js'
import { statusCodes } from '../../../../../../common/constants/status-codes.js'
import { backendFetch } from '../../../../../../common/helpers/backend-client/backend-fetch.js'
import { markErrorLogged } from '../../../../../../common/helpers/logging/logged-error.js'
import { BackendRequestError } from '../../errors.js'
import { journeyReferenceFields } from '../journey-reference-fields.js'
import { logger } from '../logger.js'

export const BACKEND_REFUSAL_LOG_MESSAGE = 'Backend refused request'

export const requestBackend = (operation, url, { method, body }) =>
  backendFetch(operation, url, {
    method,
    headers: headers(),
    body: body === undefined ? undefined : JSON.stringify(body)
  })

const logUnreadRefusalCode = (err, response, journeyId) =>
  logger.warn(
    {
      err,
      http: { response: { status_code: response.status } },
      ...journeyReferenceFields(journeyId)
    },
    'Backend refusal code could not be read'
  )

const withRefusalCode = async (error, response, journeyId) => {
  if (response.status !== statusCodes.conflict) {
    return error
  }
  try {
    const code = await refusalCodeOf(response)
    if (code) {
      error.code = code
    }
  } catch (err) {
    logUnreadRefusalCode(err, response, journeyId)
  }
  return error
}

export const refuseUnlessOk = async (
  operation,
  response,
  { journeyId } = {}
) => {
  if (!response.ok) {
    const error = await withRefusalCode(
      new BackendRequestError(operation, response),
      response,
      journeyId
    )
    logger.warn(
      { err: error, ...journeyReferenceFields(journeyId) },
      BACKEND_REFUSAL_LOG_MESSAGE
    )
    throw markErrorLogged(error)
  }
  return response
}

export const send = async (operation, url, init, { journeyId } = {}) =>
  refuseUnlessOk(operation, await requestBackend(operation, url, init), {
    journeyId
  })

import { statusCodes } from '../../../../../../common/constants/status-codes.js'
import { createLogger } from '../../../../../../common/helpers/logging/logger.js'
import { backendFetch } from '../../../../../../common/helpers/call-counts/backend-fetch.js'
import { notificationsUrl } from '../config.js'
import { failed } from './failed.js'
import { headers } from './headers.js'

const logger = createLogger()

const REFUSED_STATUSES = [statusCodes.notFound, statusCodes.forbidden]

export const getFulfilment = async (journeyId) => {
  const response = await backendFetch(
    `${notificationsUrl}/${journeyId}/fulfilments`,
    {
      method: 'GET',
      headers: headers()
    }
  )
  if (REFUSED_STATUSES.includes(response.status)) {
    if (response.status === statusCodes.forbidden) {
      logger.warn(
        { journeyId, status: response.status },
        'Notification fulfilments refused by the backend'
      )
    }
    return undefined
  }
  if (!response.ok) {
    throw await failed('get fulfilment', response)
  }
  return response.json()
}

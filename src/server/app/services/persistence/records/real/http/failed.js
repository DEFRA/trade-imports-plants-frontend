import { statusCodes } from '../../../../../../common/constants/status-codes.js'
import { BACKEND_DEPENDENCY } from '../../../../../../common/helpers/backend-client/backend-dependency.js'
import { BackendRequestError } from '../../errors.js'

export const failed = async (operation, response) => {
  const error = new BackendRequestError(
    { dependency: BACKEND_DEPENDENCY, operation },
    response
  )
  if (response.status === statusCodes.conflict) {
    try {
      const body = await response.clone().json()
      if (body?.code) {
        error.code = body.code
      }
    } catch (err) {
      error.cause = err
      error.responseBody = 'not-json'
    }
  }
  return error
}

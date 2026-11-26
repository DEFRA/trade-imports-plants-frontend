import { BACKEND_DEPENDENCY } from '../../../../common/helpers/backend-client/backend-dependency.js'
import { RefusedCallError } from '../../http/dependency-error.js'

const RECOVERABLE_BACKEND_ERROR = Symbol('recoverableBackendError')

export class BackendRequestError extends RefusedCallError {
  constructor(operation, response) {
    super({ dependency: BACKEND_DEPENDENCY, operation }, response)
    this.name = 'BackendRequestError'
    this[RECOVERABLE_BACKEND_ERROR] = true
  }
}

export const isRecoverableBackendError = (error) =>
  error?.[RECOVERABLE_BACKEND_ERROR] === true

import { measureExternalResponse } from '../../../common/helpers/metrics/external-call-metrics.js'
import { RefusedCallError } from './dependency-error.js'

/**
 * A call to a dependency: the dependency and the fixed operation name it is
 * recorded under, such as `get-countries`.
 *
 * @typedef {{ dependency: string, operation: string }} DependencyCall
 */

/**
 * Makes one call to a dependency, recorded as one external call under its
 * operation, and returns the dependency's answer whatever its status.
 *
 * @param {DependencyCall} call - the dependency and the operation
 * @param {string | URL} url - the request URL
 * @param {RequestInit} [init] - the fetch options, passed through unchanged
 * @returns {Promise<Response>} the dependency's response
 */
export const fetchFromDependency = (call, url, init) =>
  measureExternalResponse(call, () => fetch(url, init))

/**
 * Raises the dependency's refusal when its response is not ok.
 *
 * @param {DependencyCall} call - the call the response answered
 * @param {Response} response - the dependency's response
 * @throws {RefusedCallError} for the call, when the response is not ok
 */
export const throwOnRefusal = (call, response) => {
  if (!response.ok) {
    throw new RefusedCallError(call, response)
  }
}

/**
 * Makes one call to a dependency, as {@link fetchFromDependency} does, and
 * returns only an ok response.
 *
 * @param {DependencyCall} call - the dependency and the operation
 * @param {string | URL} url - the request URL
 * @param {RequestInit} [init] - the fetch options, passed through unchanged
 * @returns {Promise<Response>} the dependency's ok response
 * @throws {RefusedCallError} for the call, when the response is not ok
 */
export const requestDependency = async (call, url, init) => {
  const response = await fetchFromDependency(call, url, init)
  throwOnRefusal(call, response)
  return response
}

import { config } from '../../../../config/config.js'
import { requestDependency } from '../http/request-dependency.js'

/**
 * The absolute URL of a reference-data resource.
 *
 * @param {string} path the resource's path, such as `/countries`
 * @returns {URL} the resource's URL
 */
export const referenceDataUrl = (path) =>
  new URL(`${config.get('tradeImportsReferenceDataApi.baseUrl')}${path}`)

/**
 * Makes one call to reference data, recorded as one external call under the
 * operation it names, and returns the parsed body.
 *
 * @param {string} operation the reference-data operation, a fixed name such as `get-countries`
 * @param {URL} url the request URL
 * @param {RequestInit} [init] the fetch options; a JSON content type is added
 * @returns {Promise<unknown>} the response body
 * @throws {import('../http/dependency-error.js').RefusedCallError} when the response is not ok
 */
export const requestReferenceData = async (operation, url, init) => {
  const response = await requestDependency(
    { dependency: 'reference-data', operation },
    url.toString(),
    {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers }
    }
  )
  return response.json()
}

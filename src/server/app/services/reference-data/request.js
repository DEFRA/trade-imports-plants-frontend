import { measureExternalResponse } from '../../../common/helpers/metrics/external-call-metrics.js'
import { RefusedCallError } from '../http/dependency-error.js'

const baseUrl =
  process.env.TRADE_IMPORTS_REFERENCE_DATA_URL ?? 'http://localhost:8086'

/**
 * The absolute URL of a reference-data resource.
 *
 * @param {string} path the resource's path, such as `/countries`
 * @returns {URL} the resource's URL
 */
export const referenceDataUrl = (path) => new URL(`${baseUrl}${path}`)

/**
 * Makes one call to reference data, recorded as one external call under the
 * operation it names, and returns the parsed body.
 *
 * @param {string} operation the reference-data operation, a fixed name such as `get-countries`
 * @param {URL} url the request URL
 * @param {RequestInit} [init] the fetch options; a JSON content type is added
 * @returns {Promise<unknown>} the response body
 * @throws {RefusedCallError} carrying the URL, when the response is not ok
 */
export const requestReferenceData = async (operation, url, init) => {
  const referenceDataCall = { dependency: 'reference-data', operation }
  const response = await measureExternalResponse(referenceDataCall, () =>
    fetch(url.toString(), {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers }
    })
  )

  if (!response.ok) {
    throw Object.assign(new RefusedCallError(referenceDataCall, response), {
      url: url.toString()
    })
  }

  return response.json()
}

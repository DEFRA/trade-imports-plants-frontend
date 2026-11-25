import { measureExternalResponse } from '../../common/helpers/metrics/external-call-metrics.js'
import { BackendRequestError } from './persistence/records/errors.js'

const addressBookCall = (operation) => ({
  dependency: 'address-book',
  operation
})

/**
 * Makes one call to the address book, recorded as one external call under the
 * operation it names.
 *
 * @param {string} operation the address-book operation, a fixed name such as `list-addresses`
 * @param {string} url the request URL
 * @param {RequestInit} init the fetch options, passed through unchanged
 * @returns {Promise<Response>} the address book's response
 */
export const addressBookFetch = (operation, url, init) =>
  measureExternalResponse(addressBookCall(operation), () => fetch(url, init))

/**
 * Raises the address book's refusal of a call when its response was not ok.
 *
 * @param {string} operation the address-book operation the response answered, named in the error
 * @param {Response} response the address book's response
 * @throws {BackendRequestError} when the response is not ok
 */
export const throwOnAddressBookError = (operation, response) => {
  if (!response.ok) {
    throw new BackendRequestError(addressBookCall(operation), response)
  }
}

/**
 * Makes one call to the address book, as {@link addressBookFetch} does, and
 * raises its refusal when the response is not ok.
 *
 * @param {string} operation the address-book operation, a fixed name such as `list-addresses`
 * @param {string} url the request URL
 * @param {RequestInit} init the fetch options, passed through unchanged
 * @returns {Promise<Response>} the address book's ok response
 * @throws {BackendRequestError} named for the operation, when the response is not ok
 */
export const sendToAddressBook = async (operation, url, init) => {
  const response = await addressBookFetch(operation, url, init)
  throwOnAddressBookError(operation, response)
  return response
}

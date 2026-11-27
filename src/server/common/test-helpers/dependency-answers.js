import { afterEach, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'

const HTTP_OK = 200
const HTTP_BAD_REQUEST = 400

/** The `vitest-fetch-mock` instance unit tests fake the network with. */
export const fetchMock = createFetchMock(vi)

/**
 * A dependency's 200 answer serving `body` as JSON.
 *
 * @param {unknown} body - the body served
 * @returns {{ status: number, body: string }} the answer
 */
export const okAnswer = (body) => ({
  status: HTTP_OK,
  body: JSON.stringify(body)
})

/**
 * A dependency's refusal: an answer with a status that is not ok.
 *
 * @param {number} status - the status answered
 * @param {string} statusText - the status text answered
 * @returns {{ status: number, statusText: string }} the answer
 */
export const refusedAnswer = (status, statusText) => ({ status, statusText })

/**
 * An answer that serves `body` only to a request for `pathname` asking for
 * exactly `blocks`, and refuses any other request with a 400.
 *
 * @param {{ pathname: string, blocks?: string[] }} expected - the path and the `blocks` query values the request must carry
 * @param {unknown} body - the body served
 * @returns {(request: Request) => object} the answer for a request
 */
export const okOnlyFor =
  ({ pathname, blocks = [] }, body) =>
  (request) => {
    const url = new URL(request.url)
    const asked = url.searchParams.getAll('blocks')
    const matches =
      url.pathname === pathname &&
      asked.length === blocks.length &&
      asked.every((block, index) => block === blocks[index])
    return matches
      ? okAnswer(body)
      : refusedAnswer(HTTP_BAD_REQUEST, 'Unexpected request')
  }

/**
 * Fakes dependencies' HTTP answers at the network boundary for the tests in
 * the calling scope, and stops faking them after each test. Call it at the top
 * of a test file or in a `describe`.
 *
 * @returns {(answer: (request: Request) => object | Promise<object>) => typeof fetchMock} `answerWith`, which makes every fetch answer with what `answer` gives for its request and returns the fetch mock, whose `requests()` lists the requests made
 */
export const useDependencyAnswers = () => {
  afterEach(() => {
    fetchMock.resetMocks()
    fetchMock.disableMocks()
  })
  return (answer) => {
    fetchMock.enableMocks()
    fetchMock.mockResponse(answer)
    return fetchMock
  }
}

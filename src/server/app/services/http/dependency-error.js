/**
 * A dependency's refusal of a call: it answered with a status that was not
 * ok. The message names the dependency and the operation in words, such as
 * `plants-backend refused to get fulfilment: 503 Service Unavailable`;
 * `dependency` and `operation` carry the call, and `status` and `statusText`
 * carry the answer.
 */
export class RefusedCallError extends Error {
  /**
   * @param {{ dependency: string, operation: string }} call - the call refused: the dependency and its metric operation id
   * @param {{ status: number, statusText: string }} response - the dependency's answer
   */
  constructor({ dependency, operation }, { status, statusText }) {
    super(
      `${dependency} refused to ${operation.replaceAll('-', ' ')}: ${status} ${statusText}`
    )
    this.name = 'RefusedCallError'
    this.dependency = dependency
    this.operation = operation
    this.status = status
    this.statusText = statusText
  }
}

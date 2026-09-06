const FIRST_RETRY_MS = 1000
const SECOND_RETRY_MS = 2000
const THIRD_RETRY_MS = 4000
const RETRY_DELAYS_MS = [FIRST_RETRY_MS, SECOND_RETRY_MS, THIRD_RETRY_MS]

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Prime a reference service at boot, retrying a slow dependency.
 *
 * reference-data's container healthcheck hits Spring's `/health`, which goes
 * green before the service can answer a data request. The stack's `depends_on`
 * therefore lets a frontend start into a window where the fetch still fails,
 * and an unretried failure takes the whole server down with "Server failed to
 * start" — the frontend never recovers even though the dependency is up
 * moments later.
 *
 * Same shape and delays as `auth/get-oidc-config-with-retry.js`, which exists
 * for the same reason against the Defra ID stub.
 *
 * @param {string} name - service being primed, for the error and the log line
 * @param {() => Promise<void>} prime - the priming call to retry
 * @param {{ warn: Function }} logger
 */
export const primeWithRetry = async (name, prime, logger) => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await prime()
    } catch (err) {
      const delayMs = RETRY_DELAYS_MS[attempt - 1]
      if (delayMs === undefined) {
        throw new Error(`Priming ${name} failed after ${attempt} attempts`, {
          cause: err
        })
      }
      logger.warn({ err, service: name, attempt }, 'Priming failed, retrying')
      await wait(delayMs)
    }
  }
}

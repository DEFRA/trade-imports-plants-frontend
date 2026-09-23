/**
 * Boot-time completeness check for the sets the router mounts.
 *
 * Every seam the engine reads a set's configuration through keeps an
 * unconfigured fallback for a set that never called its configure function.
 * Some of those fallbacks throw; the dangerous ones do not. `journey flow`
 * answers with no sections and no task rows, and `session` hands back the
 * shared default cookie names — so a set that forgets one renders an empty
 * dashboard to a real user instead of failing. With one set mounted those
 * paths were unreachable; with several they are one forgotten line away.
 *
 * So the check runs once, where the router mounts a set, and refuses to start
 * the server. A boot that will not come up is a deployment that fails in front
 * of the person deploying it, which beats a request-time throw — or worse, a
 * request-time silence — in front of a notifier.
 *
 * It reads the seam stores through `shared/set-context.js`, so no fallback
 * changes: they simply stop being reachable through a mounted set.
 */
import { seamConfiguredFor } from './set-context.js'

/**
 * Seams a set cannot be served without, and the function its gateway calls to
 * fill each one. Keyed by the store label the seam module passes to `setKeyed`.
 */
export const REQUIRED_SEAMS = Object.freeze({
  'Obligation set': 'configureObligationSet',
  'Fulfilment registry': 'configureFulfilmentRegistry',
  'journey flow': 'configureJourneyFlow',
  'Ready-for-check-your-answers': 'configureReadyForCheckYourAnswers',
  dispatch: 'buildDispatch',
  records: 'configureRecords',
  session: 'configureSession'
})

/**
 * Seams a set may legitimately leave alone, listed so the required set above
 * reads as a decision rather than an omission.
 *
 * `Answers-for-read sanitiser` defaults to the identity: a set with nothing to
 * strip from its answers on the read path wants exactly that. `flow-only keys`
 * has no gateway call at all — `configureJourneyFlow` forwards the journey's
 * list to it — so requiring it separately would test the engine, not the set.
 */
export const OPTIONAL_SEAMS = Object.freeze({
  'Answers-for-read sanitiser': 'configureAnswersForRead',
  'flow-only keys': 'configureFlowOnlyKeys'
})

const describeSeam = (label) => `${label} (${REQUIRED_SEAMS[label]})`

const missingSeamsOf = (setId) =>
  Object.keys(REQUIRED_SEAMS)
    .filter((label) => !seamConfiguredFor(label, setId))
    .map(describeSeam)

/**
 * Refuse a set that has not configured every required seam.
 *
 * @param {string} setId the mounted set to check.
 * @throws {Error} naming the set and every seam it left unconfigured.
 */
export const assertSetConfigured = (setId) => {
  const missing = missingSeamsOf(setId)
  if (missing.length > 0) {
    throw new Error(
      `Set "${setId}" was mounted without configuring: ${missing.join(', ')}. ` +
        'Call each missing seam from the set gateway before the server starts.'
    )
  }
}

/**
 * Refuse any of the mounted sets that has not configured every required seam.
 *
 * @param {string[]} setIds the sets mounted so far.
 * @throws {Error} naming the first such set and every seam it left unconfigured.
 */
export const assertSetsConfigured = (setIds) => {
  for (const setId of setIds) {
    assertSetConfigured(setId)
  }
}

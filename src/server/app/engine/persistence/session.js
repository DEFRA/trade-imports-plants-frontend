import { currentSetId, setKeyed } from '../../shared/set-context.js'

const DEFAULT_COOKIE_NAMES = Object.freeze({
  knownJourneys: 'knownJourneys',
  flowOnlyAnswers: 'flowOnlyAnswers'
})

const unconfigured = () => {
  throw new Error('session not configured — call configureSession() at boot')
}

const UNCONFIGURED = Object.freeze({
  impl: Object.freeze({
    knownJourneyIds: unconfigured,
    addKnownJourney: unconfigured,
    flowOnlyAnswers: unconfigured,
    setFlowOnlyAnswers: unconfigured
  }),
  cookieNames: DEFAULT_COOKIE_NAMES
})

const store = setKeyed('session', { configuredBy: 'configureSession' })

const current = () =>
  store.has(currentSetId()) ? store.current() : UNCONFIGURED

/** Whether this set has been through `configureSession`. Callers that must run
 * after it — `registerJourneyCookie` reads the configured cookie names — ask
 * rather than silently taking the default names. */
export const sessionConfiguredFor = (setId) => store.has(setId)

export const configureSession = (setId, impl, cookieNames) => {
  store.configure(setId, {
    impl,
    cookieNames: { ...DEFAULT_COOKIE_NAMES, ...cookieNames }
  })
}

export const knownJourneysCookie = () => current().cookieNames.knownJourneys
export const flowOnlyAnswersCookie = () => current().cookieNames.flowOnlyAnswers

export const session = {
  knownJourneyIds: async (...args) => current().impl.knownJourneyIds(...args),
  addKnownJourney: async (...args) => current().impl.addKnownJourney(...args),
  flowOnlyAnswers: async (...args) => current().impl.flowOnlyAnswers(...args),
  setFlowOnlyAnswers: async (...args) =>
    current().impl.setFlowOnlyAnswers(...args)
}

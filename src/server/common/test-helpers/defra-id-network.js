import nock from 'nock'
import { afterEach, beforeEach, expect, vi } from 'vitest'

import { DEFRA_ID_CALLS } from '../../../auth/defra-id-calls.js'
import { RETRY_DELAYS_MS } from '../../../auth/get-oidc-config-with-retry.js'
import { config } from '../../../config/config.js'
import { statusCodes } from '../constants/status-codes.js'
import { restoreConfigAfterEach } from './restore-config-after-each.js'

const DEFRA_ID_ORIGIN = 'https://defra-id.test'
const DISCOVERY_PATH = '/idp/.well-known/openid-configuration'
const TOKEN_PATH = '/idp/token'
const JWKS_PATH = '/idp/jwks'

export const defraIdDiscoveryUrl = `${DEFRA_ID_ORIGIN}${DISCOVERY_PATH}`

export const defraIdDiscoveryDocument = {
  issuer: `${DEFRA_ID_ORIGIN}/idp`,
  authorization_endpoint: `${DEFRA_ID_ORIGIN}/idp/authorize`,
  token_endpoint: `${DEFRA_ID_ORIGIN}${TOKEN_PATH}`,
  jwks_uri: `${DEFRA_ID_ORIGIN}${JWKS_PATH}`
}

const recordedCallOf = ({ dependency, operation }) =>
  Object.freeze({ dependency, operation })

export const defraIdDiscoveryCall = recordedCallOf(
  DEFRA_ID_CALLS.openidConfiguration
)
export const defraIdJwksCall = recordedCallOf(DEFRA_ID_CALLS.jwks)
export const defraIdTokenExchangeCall = recordedCallOf(
  DEFRA_ID_CALLS.tokenExchange
)
export const defraIdTokenRefreshCall = recordedCallOf(
  DEFRA_ID_CALLS.tokenRefresh
)

const MAX_EVENT_LOOP_TURNS = 1000

const nextEventLoopTurn = () => new Promise((resolve) => setImmediate(resolve))

const onEventLoopUntil = async (done, failure) => {
  for (let turns = 0; !done(); turns++) {
    if (turns === MAX_EVENT_LOOP_TURNS) {
      throw new Error(failure)
    }
    await nextEventLoopTurn()
  }
}

/**
 * Points Defra ID discovery at a host that only nock answers, and refuses every
 * other outbound connection, during each test of the enclosing `describe`.
 * Clears the interceptors and restores the discovery URL afterwards.
 *
 * @returns {{
 *   discoverAt: (origin: string) => void,
 *   interceptDiscovery: (origin?: string) => import('nock').Interceptor,
 *   serveDiscovery: () => import('nock').Scope,
 *   failEveryDiscoveryAttempt: (newError: () => Error) => void,
 *   stepThroughDiscoveryRetries: (delaysMs?: number[]) => Promise<void>,
 *   interceptJwks: () => import('nock').Interceptor,
 *   interceptToken: (form?: object | ((form: object) => boolean)) => import('nock').Interceptor
 * }} `discoverAt` points discovery at another origin, on the same path;
 *   `interceptDiscovery` intercepts one discovery fetch from the Defra ID
 *   host, or from the origin given, for the test to answer; `serveDiscovery`
 *   answers one with `defraIdDiscoveryDocument`; `failEveryDiscoveryAttempt`
 *   fails the first attempt and every retry, each with an error from `newError()`;
 *   `stepThroughDiscoveryRetries` steps a faked clock (`setTimeout`,
 *   `clearTimeout` and `Date`) through the retry delays given, by default the
 *   ones discovery uses: it waits on the event loop for each failed attempt
 *   and its retry timer, so the clock moves only by the delays, moves the
 *   clock to that timer, asserts it fires exactly its delay after the attempt
 *   failed, so never a millisecond sooner or later, and waits for the retry to
 *   be sent; `interceptJwks` intercepts
 *   one fetch of the keys at that document's `jwks_uri`; `interceptToken`
 *   intercepts one post to its `token_endpoint`, of any form or only of the
 *   form given or matched
 */
export const useDefraIdNetwork = () => {
  restoreConfigAfterEach(['defraId.oidcDiscoveryUrl'])

  const discoverAt = (origin) =>
    config.set('defraId.oidcDiscoveryUrl', `${origin}${DISCOVERY_PATH}`)

  let discoveryAttempts

  beforeEach(() => {
    nock.disableNetConnect()
    discoverAt(DEFRA_ID_ORIGIN)
    discoveryAttempts = []
  })

  afterEach(() => {
    nock.cleanAll()
    nock.enableNetConnect()
  })

  const interceptDefraId = () => nock(DEFRA_ID_ORIGIN)

  const recordDiscoveryAttempt = (request) => {
    const attempt = {}
    discoveryAttempts.push(attempt)
    request.once('close', () => {
      attempt.endedAt = Date.now()
    })
  }

  const interceptDiscovery = (origin = DEFRA_ID_ORIGIN) =>
    nock(origin).on('request', recordDiscoveryAttempt).get(DISCOVERY_PATH)

  const untilDiscoveryRetryWaits = (attempt) =>
    onEventLoopUntil(
      () =>
        discoveryAttempts[attempt]?.endedAt !== undefined &&
        vi.getTimerCount() === 1,
      `OIDC discovery scheduled no retry after attempt ${attempt + 1}`
    )

  const untilDiscoveryAttemptSent = (attempt) =>
    onEventLoopUntil(
      () => discoveryAttempts[attempt] !== undefined,
      `OIDC discovery sent no attempt ${attempt + 1}`
    )

  const stepThroughDiscoveryRetries = async (delaysMs = RETRY_DELAYS_MS) => {
    for (const [failed, delayMs] of delaysMs.entries()) {
      await untilDiscoveryRetryWaits(failed)
      await vi.advanceTimersToNextTimerAsync()
      expect(Date.now() - discoveryAttempts[failed].endedAt).toBe(delayMs)
      await untilDiscoveryAttemptSent(failed + 1)
    }
  }

  const serveDiscovery = () =>
    interceptDiscovery().reply(statusCodes.ok, defraIdDiscoveryDocument)

  const failEveryDiscoveryAttempt = (newError) => {
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      interceptDiscovery().replyWithError(newError())
    }
  }

  const interceptJwks = () => interceptDefraId().get(JWKS_PATH)

  const interceptToken = (form) => interceptDefraId().post(TOKEN_PATH, form)

  return {
    discoverAt,
    interceptDiscovery,
    serveDiscovery,
    failEveryDiscoveryAttempt,
    stepThroughDiscoveryRetries,
    interceptJwks,
    interceptToken
  }
}

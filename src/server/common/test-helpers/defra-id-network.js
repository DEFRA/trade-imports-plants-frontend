import nock from 'nock'
import { afterEach, beforeEach } from 'vitest'

import { DEFRA_ID_CALLS } from '../../../auth/defra-id-calls.js'
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

/**
 * Points Defra ID discovery at a host that only nock answers, and refuses every
 * other outbound connection, during each test of the enclosing `describe`.
 * Clears the interceptors and restores the discovery URL afterwards.
 *
 * @returns {{
 *   discoverAt: (origin: string) => void,
 *   interceptDiscovery: (origin?: string) => import('nock').Interceptor,
 *   serveDiscovery: () => import('nock').Scope,
 *   interceptJwks: () => import('nock').Interceptor,
 *   interceptToken: (form?: object | ((form: object) => boolean)) => import('nock').Interceptor
 * }} `discoverAt` points discovery at another origin, on the same path;
 *   `interceptDiscovery` intercepts one discovery fetch from the Defra ID
 *   host, or from the origin given, for the test to answer; `serveDiscovery`
 *   answers one with `defraIdDiscoveryDocument`; `interceptJwks` intercepts
 *   one fetch of the keys at that document's `jwks_uri`; `interceptToken`
 *   intercepts one post to its `token_endpoint`, of any form or only of the
 *   form given or matched
 */
export const useDefraIdNetwork = () => {
  restoreConfigAfterEach(['defraId.oidcDiscoveryUrl'])

  const discoverAt = (origin) =>
    config.set('defraId.oidcDiscoveryUrl', `${origin}${DISCOVERY_PATH}`)

  beforeEach(() => {
    nock.disableNetConnect()
    discoverAt(DEFRA_ID_ORIGIN)
  })

  afterEach(() => {
    nock.cleanAll()
    nock.enableNetConnect()
  })

  const interceptDefraId = () => nock(DEFRA_ID_ORIGIN)

  const interceptDiscovery = (origin = DEFRA_ID_ORIGIN) =>
    nock(origin).get(DISCOVERY_PATH)

  const serveDiscovery = () =>
    interceptDiscovery().reply(statusCodes.ok, defraIdDiscoveryDocument)

  const interceptJwks = () => interceptDefraId().get(JWKS_PATH)

  const interceptToken = (form) => interceptDefraId().post(TOKEN_PATH, form)

  return {
    discoverAt,
    interceptDiscovery,
    serveDiscovery,
    interceptJwks,
    interceptToken
  }
}

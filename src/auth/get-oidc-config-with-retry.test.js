import { vi } from 'vitest'
import { getOidcConfigWithRetry } from './get-oidc-config-with-retry.js'
import {
  defraIdDiscoveryCall,
  defraIdDiscoveryDocument,
  defraIdDiscoveryUrl,
  useDefraIdNetwork
} from '../server/common/test-helpers/defra-id-network.js'
import { recordEmfDocuments } from '../server/common/test-helpers/emf-documents.js'

const timedOut = () =>
  Object.assign(new Error('connect ETIMEDOUT 127.0.0.1:3007'), {
    code: 'ETIMEDOUT'
  })

describe('getOidcConfigWithRetry', () => {
  const failedDiscoveryCall = { ...defraIdDiscoveryCall, failure: 1 }
  const successfulDiscoveryCall = { ...defraIdDiscoveryCall, failure: 0 }

  const {
    failEveryDiscoveryAttempt,
    interceptDiscovery,
    serveDiscovery,
    stepThroughDiscoveryRetries
  } = useDefraIdNetwork()
  const emf = recordEmfDocuments()
  let logger

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    logger = { warn: vi.fn() }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('returns the discovery document without retrying when the first call succeeds', async () => {
    serveDiscovery()

    await expect(getOidcConfigWithRetry(logger)).resolves.toEqual(
      defraIdDiscoveryDocument
    )

    expect(logger.warn).not.toHaveBeenCalled()
    await vi.waitFor(() =>
      expect(emf.externalCalls()).toEqual([successfulDiscoveryCall])
    )
  })

  test('retries 1s after a timeout, returns the document once the provider answers, and records a failed then a successful defra-id openid-configuration call', async () => {
    interceptDiscovery().replyWithError(timedOut())
    serveDiscovery()

    const result = getOidcConfigWithRetry(logger)
    await stepThroughDiscoveryRetries([1000])

    await expect(result).resolves.toEqual(defraIdDiscoveryDocument)
    expect(logger.warn).toHaveBeenCalledTimes(1)
    await vi.waitFor(() =>
      expect(emf.externalCalls()).toEqual([
        failedDiscoveryCall,
        successfulDiscoveryCall
      ])
    )
  })

  test('gives up only after the full 1s, 2s and 4s backoff, throws an error naming the discovery URL, and records four failed defra-id openid-configuration calls', async () => {
    failEveryDiscoveryAttempt(timedOut)

    const result = getOidcConfigWithRetry(logger).catch((error) => error)
    await stepThroughDiscoveryRetries([1000, 2000, 4000])
    const error = await result

    expect(error.message).toBe(
      `OIDC discovery at ${defraIdDiscoveryUrl} failed after 4 attempts`
    )
    expect(error.cause.code).toBe('ETIMEDOUT')
    expect(logger.warn).toHaveBeenCalledTimes(3)
    await vi.waitFor(() =>
      expect(emf.externalCalls()).toEqual(Array(4).fill(failedDiscoveryCall))
    )
  })
})

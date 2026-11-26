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

  const { interceptDiscovery, serveDiscovery } = useDefraIdNetwork()
  const emf = recordEmfDocuments()
  let logger

  const waitForRetries = (count) =>
    vi.waitFor(() => expect(logger.warn).toHaveBeenCalledTimes(count))

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
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

  test('retries after a timeout, returns the document once the provider answers, and records a failed then a successful defra-id openid-configuration call', async () => {
    interceptDiscovery().replyWithError(timedOut())
    serveDiscovery()

    const result = getOidcConfigWithRetry(logger)
    let settled = false
    const tracked = result.then((value) => {
      settled = true
      return value
    })

    await waitForRetries(1)
    await vi.advanceTimersByTimeAsync(999)
    expect(settled).toBe(false)

    await vi.advanceTimersByTimeAsync(1)

    await expect(tracked).resolves.toEqual(defraIdDiscoveryDocument)
    expect(logger.warn).toHaveBeenCalledTimes(1)
    await vi.waitFor(() =>
      expect(emf.externalCalls()).toEqual([
        failedDiscoveryCall,
        successfulDiscoveryCall
      ])
    )
  })

  test('gives up only after the full 1s, 2s and 4s backoff, throws an error naming the discovery URL, and records four failed defra-id openid-configuration calls', async () => {
    for (let attempt = 0; attempt < 4; attempt++) {
      interceptDiscovery().replyWithError(timedOut())
    }

    const result = getOidcConfigWithRetry(logger)
    let settled = false
    const tracked = result.catch((error) => {
      settled = true
      return error
    })

    for (const [attempt, delayMs] of [1000, 2000, 4000].entries()) {
      await waitForRetries(attempt + 1)
      await vi.advanceTimersByTimeAsync(delayMs - 1)
      expect(settled).toBe(false)
      await vi.advanceTimersByTimeAsync(1)
    }
    const error = await tracked

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

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import { primeWithRetry } from './prime-with-retry.js'

const logger = { warn: vi.fn() }

// The helper sleeps 1s, 2s then 4s between attempts. Fake timers keep the test
// instant, but every await has to be drained between advances or the next
// attempt has not been scheduled yet.
const drain = async () => {
  for (let i = 0; i < 8; i++) {
    await Promise.resolve()
  }
}

const runToCompletion = async (promise) => {
  for (const delay of [1000, 2000, 4000]) {
    await drain()
    await vi.advanceTimersByTimeAsync(delay)
  }
  await drain()
  return promise
}

describe('#primeWithRetry', () => {
  beforeEach(() => {
    logger.warn.mockClear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('Should not retry a call that succeeds first time', async () => {
    const prime = vi.fn().mockResolvedValue(undefined)

    await primeWithRetry('countries', prime, logger)

    expect(prime).toHaveBeenCalledTimes(1)
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('Should succeed once a slow dependency comes up', async () => {
    // The real shape: reference-data reports healthy, the first fetch still
    // fails, the retry lands.
    const prime = vi
      .fn()
      .mockRejectedValueOnce(new Error('Failed to get countries'))
      .mockResolvedValue(undefined)

    const promise = primeWithRetry('countries', prime, logger)
    await runToCompletion(promise)

    await expect(promise).resolves.toBeUndefined()
    expect(prime).toHaveBeenCalledTimes(2)
    expect(logger.warn).toHaveBeenCalledTimes(1)
  })

  it('Should give the dependency four attempts before giving up', async () => {
    const prime = vi.fn().mockRejectedValue(new Error('Failed to get ports'))

    const promise = primeWithRetry('ports', prime, logger)
    const settled = promise.catch((err) => err)
    await runToCompletion(settled)

    const err = await settled
    expect(err).toBeInstanceOf(Error)
    expect(err.message).toBe('Priming ports failed after 4 attempts')
    expect(prime).toHaveBeenCalledTimes(4)
  })

  it('Should keep the underlying failure as the cause', async () => {
    const underlying = new Error('Failed to get countries')
    const prime = vi.fn().mockRejectedValue(underlying)

    const promise = primeWithRetry('countries', prime, logger)
    const settled = promise.catch((err) => err)
    await runToCompletion(settled)

    expect((await settled).cause).toBe(underlying)
  })
})

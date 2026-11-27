import { describe, expect, it } from 'vitest'
import { RefusedCallError } from './dependency-error.js'

describe('#RefusedCallError', () => {
  it('Should carry the refused call and the answer as its own fields, and name both in its message', () => {
    const err = new RefusedCallError(
      {
        dependency: 'plants-backend',
        operation: 'get-fulfilment'
      },
      { status: 503, statusText: 'Service Unavailable' }
    )

    expect(err).toMatchObject({
      name: 'RefusedCallError',
      dependency: 'plants-backend',
      operation: 'get-fulfilment',
      status: 503,
      statusText: 'Service Unavailable',
      message:
        'plants-backend refused to get fulfilment: 503 Service Unavailable'
    })
  })
})

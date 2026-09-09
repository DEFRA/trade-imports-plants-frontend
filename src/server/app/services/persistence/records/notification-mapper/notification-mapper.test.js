import { describe, expect, it } from 'vitest'
import { fulfilmentToNotification } from './index.js'

describe('notification projection', () => {
  it('Should omit consignor content from the envelope while canonical fulfilment owns it', () => {
    expect(
      fulfilmentToNotification(
        {
          '478148de-8e15-4c44-a435-15f24a1c177b': {
            addressId: 'tech-imports-ltd'
          }
        },
        'HRP-0001'
      )
    ).toEqual({ referenceNumber: 'HRP-0001' })
  })
})

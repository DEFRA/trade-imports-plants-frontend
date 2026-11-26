import { describe, expect, it } from 'vitest'

import {
  okAnswer,
  refusedAnswer,
  useDependencyAnswers
} from '../../../common/test-helpers/dependency-answers.js'
import { fetchPortsOfEntry } from './client.js'

const answerWith = useDependencyAnswers()

describe('ports client', () => {
  it('Should parse a fetched [{code,name}] payload', async () => {
    answerWith(() => okAnswer([{ code: 'GB ZZZ', name: 'Zed Port' }]))
    await expect(fetchPortsOfEntry()).resolves.toEqual([
      { code: 'GB ZZZ', name: 'Zed Port' }
    ])
  })

  it('Should throw on a non-ok response', async () => {
    answerWith(() => refusedAnswer(500, 'Boom'))
    await expect(fetchPortsOfEntry()).rejects.toThrow(
      'reference-data refused to get ports of entry: 500 Boom'
    )
  })
})

import { describe, expect, it } from 'vitest'

import {
  okAnswer,
  okOnlyFor,
  refusedAnswer,
  useDependencyAnswers
} from '../../../common/test-helpers/dependency-answers.js'
import { fetchCountries } from './client.js'

const answerWith = useDependencyAnswers()

describe('countries client', () => {
  it('Should parse a fetched [{code,name}] payload', async () => {
    answerWith(() => okAnswer([{ code: 'ZZ', name: 'Zedland' }]))
    await expect(fetchCountries()).resolves.toEqual([
      { code: 'ZZ', name: 'Zedland' }
    ])
  })

  it('Should request /countries filtered to the given blocks', async () => {
    answerWith(
      okOnlyFor({ pathname: '/countries', blocks: ['BLOCK_ONE'] }, [
        { code: 'ZZ', name: 'Zedland' }
      ])
    )
    await expect(fetchCountries(['BLOCK_ONE'])).resolves.toEqual([
      { code: 'ZZ', name: 'Zedland' }
    ])
  })

  it('Should throw on a non-ok response', async () => {
    answerWith(() => refusedAnswer(503, 'Down'))
    await expect(fetchCountries()).rejects.toThrow(
      'reference-data refused to get countries: 503 Down'
    )
  })
})

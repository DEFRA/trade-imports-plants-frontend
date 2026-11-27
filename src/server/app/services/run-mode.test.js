import { describe, expect, it } from 'vitest'

import { resetModulesStubModeAndStubbedGlobals } from '../../common/test-helpers/reset-modules-stub-mode-and-globals.js'
import {
  okAnswer,
  okOnlyFor,
  refusedAnswer,
  useDependencyAnswers
} from '../../common/test-helpers/dependency-answers.js'

const SPS_ORIGIN_BLOCK = 'GBNAG_SPS_EX'

const originCountriesServing = (countries) =>
  okOnlyFor({ pathname: '/countries', blocks: [SPS_ORIGIN_BLOCK] }, countries)

resetModulesStubModeAndStubbedGlobals()
const answerWith = useDependencyAnswers()

describe('countries service — stub mode', () => {
  it('Should serve stub data through the accessors without loading', async () => {
    process.env.STUB_MODE = 'true'
    const countries = await import('./countries/index.js')
    expect(await countries.originLabel('AT')).toBe('Austria')
    expect(await countries.originCountries()).toContainEqual({
      value: 'AT',
      text: 'Austria'
    })
    expect(await countries.originCountryOptions()).toContainEqual({
      value: 'ES-CN',
      text: 'Canary Islands'
    })
    expect(await countries.countryDisplayLabel('ES-CN')).toBe(
      'Canary Islands (Spain)'
    )
    expect(countries.parentCountryCode('ES-CN')).toBe('ES')
  })

  it('Should short-circuit ensureLoaded and never fetch in stub mode', async () => {
    process.env.STUB_MODE = 'true'
    const fetched = answerWith(() =>
      okAnswer([{ code: 'ZZ', name: 'Zedland' }])
    )
    const countries = await import('./countries/index.js')
    await countries.ensureLoaded()
    expect(await countries.originLabel('AT')).toBe('Austria')
    expect(await countries.originLabel('ZZ')).toBeUndefined()
    expect(fetched.requests()).toEqual([])
  })
})

describe('countries service — real mode', () => {
  it('Should self-load on the first reader call and serve fetched data', async () => {
    process.env.STUB_MODE = 'false'
    answerWith(originCountriesServing([{ code: 'ZZ', name: 'Zedland' }]))
    const countries = await import('./countries/index.js')

    expect(await countries.originLabel('ZZ')).toBe('Zedland')
    expect(await countries.originLabel('AT')).toBeUndefined()
    expect(await countries.originCountries()).toEqual([
      { value: 'ZZ', text: 'Zedland' }
    ])
    expect(await countries.addressCountries()).toEqual([
      'United Kingdom',
      'Zedland'
    ])
  })

  it('Should offer each fetched territory on the origin list, held to its country', async () => {
    process.env.STUB_MODE = 'false'
    answerWith(
      originCountriesServing([
        {
          code: 'FR',
          name: 'France',
          subDivisions: [{ code: 'FR-MQ', name: 'Martinique' }]
        }
      ])
    )
    const countries = await import('./countries/index.js')

    expect(await countries.originCountryOptions()).toEqual([
      { value: 'FR', text: 'France' },
      { value: 'FR-MQ', text: 'Martinique' }
    ])
    expect(await countries.countryDisplayLabel('FR-MQ')).toBe(
      'Martinique (France)'
    )
    expect(countries.parentCountryCode('FR-MQ')).toBe('FR')
  })

  it('Should offer address countries from the unfiltered list, as the address book does', async () => {
    process.env.STUB_MODE = 'false'
    const unfiltered = [
      { code: 'GB', name: 'United Kingdom' },
      { code: 'US', name: 'United States' }
    ]
    const fetched = answerWith(
      okOnlyFor({ pathname: '/countries' }, unfiltered)
    )
    const countries = await import('./countries/index.js')

    expect(await countries.addressBookCountries()).toEqual(unfiltered)
    expect(await countries.addressBookCountryName('US')).toBe('United States')
    expect(await countries.addressBookCountryName('XX')).toBe('XX')
    expect(fetched.requests()).toHaveLength(1)
  })

  it('Should fetch once across many reader calls once loaded', async () => {
    process.env.STUB_MODE = 'false'
    const fetched = answerWith(
      originCountriesServing([{ code: 'ZZ', name: 'Zedland' }])
    )
    const countries = await import('./countries/index.js')

    await countries.originLabel('ZZ')
    await countries.originCountries()
    await countries.addressCountries()
    await countries.countryCodeOf('Zedland')

    expect(fetched.requests()).toHaveLength(1)
  })

  it('Should re-attempt on a reader call after a prior load failure', async () => {
    process.env.STUB_MODE = 'false'
    const fetched = answerWith(
      originCountriesServing([{ code: 'ZZ', name: 'Zedland' }])
    ).mockRejectOnce(new Error('MDM down'))
    const countries = await import('./countries/index.js')

    await expect(countries.originLabel('ZZ')).rejects.toThrow()
    expect(await countries.originLabel('ZZ')).toBe('Zedland')
    expect(fetched.requests()).toHaveLength(2)
  })

  it('Should reject with a serverUnavailable Boom error on load failure', async () => {
    process.env.STUB_MODE = 'false'
    answerWith(() => refusedAnswer(503, 'Down'))
    const countries = await import('./countries/index.js')

    await expect(countries.originLabel('ZZ')).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 503 }
    })
    await expect(countries.addressBookCountries()).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 503 }
    })
  })
})

describe('ports service — stub mode', () => {
  it('Should serve stub data through list() without loading', async () => {
    process.env.STUB_MODE = 'true'
    const ports = await import('./ports/index.js')
    expect(await ports.list()).toContainEqual({
      code: 'GB ABD',
      name: 'Aberdeen Harbour',
      type: 'seaport'
    })
  })
})

describe('ports service — real mode', () => {
  const portsServing = () => okAnswer([{ code: 'GB ZZZ', name: 'Zed Port' }])

  it('Should self-load on the first reader call and serve fetched ports', async () => {
    process.env.STUB_MODE = 'false'
    answerWith(portsServing)
    const ports = await import('./ports/index.js')

    expect(await ports.list()).toEqual([{ code: 'GB ZZZ', name: 'Zed Port' }])
  })

  it('Should fetch once across many reader calls once loaded', async () => {
    process.env.STUB_MODE = 'false'
    const fetched = answerWith(portsServing)
    const ports = await import('./ports/index.js')

    await ports.list()
    await ports.label('GB ZZZ')
    await ports.portOptions()

    expect(fetched.requests()).toHaveLength(1)
  })

  it('Should re-attempt on a reader call after a prior load failure', async () => {
    process.env.STUB_MODE = 'false'
    const fetched = answerWith(portsServing).mockRejectOnce(
      new Error('MDM down')
    )
    const ports = await import('./ports/index.js')

    await expect(ports.list()).rejects.toThrow()
    expect(await ports.list()).toEqual([{ code: 'GB ZZZ', name: 'Zed Port' }])
    expect(fetched.requests()).toHaveLength(2)
  })

  it('Should reject with a serverUnavailable Boom error on load failure', async () => {
    process.env.STUB_MODE = 'false'
    answerWith(() => refusedAnswer(500, 'Boom'))
    const ports = await import('./ports/index.js')

    await expect(ports.list()).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 503 }
    })
  })
})

describe('mode resolution', () => {
  it('Should default to real when the flag is unset', async () => {
    delete process.env.STUB_MODE
    const { isStubMode } = await import('../../common/services/mode.js')
    expect(isStubMode()).toBe(false)
  })

  it('Should select stub when the flag is set', async () => {
    process.env.STUB_MODE = 'true'
    const { isStubMode } = await import('../../common/services/mode.js')
    expect(isStubMode()).toBe(true)
  })
})

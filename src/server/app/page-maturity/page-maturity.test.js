import { afterEach, describe, expect, it } from 'vitest'

import { config } from '../../../config/config.js'
import { copy } from './copy/copy.en.js'
import { LEVELS, TAG_CLASSES } from './levels.js'
import { pageLevelFor, pageMaturityContext } from './page-maturity.js'

const JOURNEY = '/high-risk-plants/notifications/{journeyId}'
const DASHBOARD = '/high-risk-plants'
const LISTED_ROUTE = `${JOURNEY}/commodity-type`

const requestFor = (path) => ({ route: { path } })

describe('#pageLevelFor', () => {
  it.each([
    [DASHBOARD, LEVELS.exploring],
    [`${JOURNEY}/commodity-type`, LEVELS.exploring],
    [`${JOURNEY}/origin`, LEVELS.detailing],
    [JOURNEY, LEVELS.detailing]
  ])('Should return the listed level for %s', (routePath, level) => {
    expect(pageLevelFor(routePath)).toBe(level)
  })

  it('Should return undefined for a page that is not listed', () => {
    expect(pageLevelFor(`${JOURNEY}/identification-numbers`)).toBeUndefined()
  })

  it('Should return undefined for a path that only shares a prefix with a listed path', () => {
    expect(pageLevelFor(`${JOURNEY}/origin-x`)).toBeUndefined()
    expect(pageLevelFor(`${DASHBOARD}-archive`)).toBeUndefined()
  })

  it('Should return undefined for an undefined or empty path', () => {
    expect(pageLevelFor(undefined)).toBeUndefined()
    expect(pageLevelFor('')).toBeUndefined()
  })
})

describe('#pageMaturityContext', () => {
  afterEach(() => {
    config.set('pageMaturityBanner.enabled', true)
  })

  it('Should return the tag, class, line and hidden prefix for a listed route', () => {
    expect(pageMaturityContext(requestFor(LISTED_ROUTE))).toEqual({
      pageMaturity: {
        tag: {
          text: copy.levels.exploring.tag,
          classes: TAG_CLASSES.exploring
        },
        text: copy.levels.exploring.text,
        hiddenPrefix: copy.hiddenPrefix
      }
    })
  })

  it('Should return nothing for an unlisted route', () => {
    expect(
      pageMaturityContext(requestFor(`${JOURNEY}/identification-numbers`))
    ).toEqual({})
  })

  it('Should return nothing when the switch is off', () => {
    config.set('pageMaturityBanner.enabled', false)

    expect(pageMaturityContext(requestFor(LISTED_ROUTE))).toEqual({})
  })

  it('Should return nothing when the error page is rendered on a listed route', () => {
    expect(
      pageMaturityContext({
        ...requestFor(LISTED_ROUTE),
        response: { source: { template: 'shared/error' } }
      })
    ).toEqual({})
  })

  it('Should return nothing for a request with no route', () => {
    expect(pageMaturityContext({})).toEqual({})
  })
})

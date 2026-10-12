import { load } from 'cheerio'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import { config } from '../../../config/config.js'
import { nunjucksConfig } from '../../../config/nunjucks/nunjucks.js'
import { createServer } from '../../server.js'
import { mockOidcConfig } from '../../common/test-helpers/mock-oidc-config.js'
import { authenticatedCredentials } from '../engine/test-support.js'
import { copy as sharedCopy } from '../shared/copy.en.js'
import { SET_BASE } from '../sets/high-risk-plants/set.js'
import { copy } from './copy/copy.en.js'
import { TAG_CLASSES } from './levels.js'

vi.mock('../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

const environment = nunjucksConfig.options.compileOptions.environment

const PHASE_BANNER = '.govuk-phase-banner'
const TAG = '.govuk-tag'
const SERVICE_SENTENCE =
  'This is a new service. Help us improve it and give your feedback by email.'

const exploring = {
  tag: { text: copy.levels.exploring.tag, classes: TAG_CLASSES.exploring },
  text: copy.levels.exploring.text,
  hiddenPrefix: copy.hiddenPrefix
}

const renderLayout = (context = {}) =>
  environment.render('shared/layout.njk', {
    pageTitle: 'Create an import notification',
    sharedCopy,
    userSession: { isAuthenticated: false },
    homeUrl: SET_BASE,
    getAssetPath: (asset) => `/assets/${asset}`,
    ...context
  })

const normalised = (text) => text.replace(/\s+/g, ' ').trim()

describe('page maturity banner in the layout', () => {
  describe('when the page has no level', () => {
    it('Should show the Alpha banner exactly as before', () => {
      const $ = load(renderLayout())
      const banner = $(PHASE_BANNER)

      expect(banner.find(TAG)).toHaveLength(1)
      expect(normalised(banner.text())).toBe(`Alpha ${SERVICE_SENTENCE}`)
      expect(banner.html()).toBe(
        load(renderLayout({ pageMaturity: null }))(PHASE_BANNER).html()
      )
    })
  })

  describe('when the page has a level', () => {
    it('Should add the level tag after the Alpha tag, followed by its line', () => {
      const $ = load(renderLayout({ pageMaturity: exploring }))
      const tags = $(PHASE_BANNER).find(TAG)

      expect(tags).toHaveLength(2)
      expect($(tags[0]).text().trim()).toBe('Alpha')
      expect($(tags[1]).text().trim()).toBe(copy.levels.exploring.tag)
      expect($(tags[1]).hasClass(TAG_CLASSES.exploring)).toBe(true)
      expect(normalised($(PHASE_BANNER).text())).toMatch(
        new RegExp(
          `${copy.levels.exploring.tag} ${copy.levels.exploring.text}$`
        )
      )
    })

    it('Should keep exactly one link, the feedback email', () => {
      const $ = load(renderLayout({ pageMaturity: exploring }))
      const links = $(PHASE_BANNER).find('a')

      expect(links).toHaveLength(1)
      expect(links.attr('href')).toMatch(/^mailto:/)
    })

    it('Should put the hidden prefix before the level tag for screen readers', () => {
      const $ = load(renderLayout({ pageMaturity: exploring }))
      const hidden = $(PHASE_BANNER).find('.govuk-visually-hidden')

      expect(hidden.text()).toBe(copy.hiddenPrefix)
      expect(hidden.nextAll(TAG).first().text().trim()).toBe(
        copy.levels.exploring.tag
      )
    })

    it('Should keep the service sentence', () => {
      const $ = load(renderLayout({ pageMaturity: exploring }))

      expect(normalised($(PHASE_BANNER).text())).toContain(SERVICE_SENTENCE)
    })
  })
})

describe('page maturity banner on a served page', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  afterEach(() => {
    config.set('pageMaturityBanner.enabled', true)
  })

  const getDashboard = async () => {
    const response = await server.inject({
      method: 'GET',
      url: SET_BASE,
      auth: { strategy: 'session', credentials: authenticatedCredentials }
    })
    return load(response.result)
  }

  it('Should show the level in the phase banner when the switch is on', async () => {
    const $ = await getDashboard()
    const tags = $(PHASE_BANNER).find(TAG)

    expect(tags).toHaveLength(2)
    expect($(tags[1]).text().trim()).toBe(copy.levels.exploring.tag)
  })

  it('Should show only the Alpha tag when the switch is off', async () => {
    config.set('pageMaturityBanner.enabled', false)

    const $ = await getDashboard()

    expect($(PHASE_BANNER).find(TAG)).toHaveLength(1)
    expect($(PHASE_BANNER).text()).not.toContain(copy.levels.exploring.tag)
  })
})

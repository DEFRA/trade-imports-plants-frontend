import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import { store } from '../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { records as realRecords } from '../../../../../../services/persistence/records/real/index.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import {
  driveHandler,
  postHandlerOf
} from '../../../../../../engine/test-support.js'
import { hubPath } from '../../../../../../shared/paths.js'
import { installHighRiskPlantsJourney } from '../../test-support.js'
import { commodityTypes } from '../../../../services/commodities/index.js'
import * as commodityType from './controller.js'

const get = commodityType.routes.find((route) => route.method === 'GET').handler
const post = postHandlerOf(commodityType)

const POTATOES = 'potatoes'
const PLANTS_FOR_PLANTING = 'plants-for-planting'
const WOOD_AND_CUT_TREES = 'wood-and-cut-trees'
const PLANTS_AND_WOOD_HINT =
  'You must notify before arrival, or no later than 4 days after the date of arrival.'
const SELECT_WHAT_YOU_ARE_IMPORTING = 'Select what you are importing'

describe('#meta', () => {
  it('Should own the commodityType obligation on the commodity-type page', () => {
    expect(commodityType.meta).toEqual({
      id: 'commodity-type',
      slug: 'commodity-type',
      collects: ['commodityType']
    })
  })
})

describe('GET commodity-type', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    installHighRiskPlantsJourney()
  })
  beforeEach(() => store.clear())

  it('Should render the page title and the legend as the page heading', async () => {
    const result = await driveHandler(get)

    expect(result.view.context.pageTitle).toBe('What are you importing?')
    expect(result.view.context.copy.legend).toBe('What are you importing?')
  })

  it('Should caption the page About the consignment', async () => {
    const result = await driveHandler(get)

    expect(result.view.context.caption).toBe('About the consignment')
  })

  it('Should offer every service commodity type with its label and hint', async () => {
    const result = await driveHandler(get)

    expect(
      result.view.context.typeOptions.map((option) => option.value)
    ).toEqual([...commodityTypes()])
    expect(result.view.context.typeOptions).toEqual([
      expect.objectContaining({
        value: POTATOES,
        text: 'Potatoes (seed or ware)',
        hint: {
          text: 'You must notify at least 2 days before the expected date of arrival.'
        }
      }),
      expect.objectContaining({
        value: PLANTS_FOR_PLANTING,
        text: 'Plants for planting',
        hint: { text: PLANTS_AND_WOOD_HINT }
      }),
      expect.objectContaining({
        value: WOOD_AND_CUT_TREES,
        text: 'Wood and cut trees',
        hint: { text: PLANTS_AND_WOOD_HINT }
      })
    ])
  })

  it('Should check nothing and show no error on a notification with no answer', async () => {
    const result = await driveHandler(get)

    expect(result.view.context.values).toEqual({ commodityType: '' })
    expect(
      result.view.context.typeOptions.every((option) => !option.checked)
    ).toBe(true)
    expect(result.view.context.errorSummary).toBeNull()
  })

  it('Should prefill the stored answer and check its radio', async () => {
    const result = await driveHandler(get, {
      seed: { commodityType: PLANTS_FOR_PLANTING }
    })

    expect(result.view.context.values).toEqual({
      commodityType: PLANTS_FOR_PLANTING
    })
    expect(
      result.view.context.typeOptions.filter((option) => option.checked)
    ).toEqual([
      expect.objectContaining({ value: PLANTS_FOR_PLANTING, checked: true })
    ])
  })

  it('Should send Back to the dashboard while nothing is committed', async () => {
    const result = await driveHandler(get)

    expect(result.view.context.backLink).toBe('/')
  })

  it('Should send Back to the overview once the notification has an answer', async () => {
    const result = await driveHandler(get, {
      seed: { commodityType: POTATOES }
    })

    expect(result.view.context.backLink).toBe(hubPath(result.journeyId))
  })
})

describe('POST commodity-type — a rejected answer', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    installHighRiskPlantsJourney()
  })
  beforeEach(() => store.clear())

  it('Should answer 400 for a blank choice, committing nothing', async () => {
    const result = await driveHandler(post, { payload: { commodityType: '' } })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.commodityType).toBe(
      SELECT_WHAT_YOU_ARE_IMPORTING
    )
    expect(result.after).toEqual(result.before)
  })

  it('Should answer 400 for a value the service does not offer', async () => {
    const result = await driveHandler(post, {
      payload: { commodityType: 'bulbs' }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.commodityType).toBe(
      SELECT_WHAT_YOU_ARE_IMPORTING
    )
    expect(result.after).toEqual(result.before)
  })

  it('Should re-render the raw entered value and summarise the error', async () => {
    const result = await driveHandler(post, {
      payload: { commodityType: 'bulbs' }
    })

    expect(result.view.context.values).toEqual({ commodityType: 'bulbs' })
    expect(result.view.context.errorSummary.errorList).toEqual([
      { text: SELECT_WHAT_YOU_ARE_IMPORTING, href: '#commodityType' }
    ])
  })
})

describe('POST commodity-type — an accepted answer', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    installHighRiskPlantsJourney()
  })
  beforeEach(() => store.clear())

  it('Should commit exactly the chosen type', async () => {
    const result = await driveHandler(post, {
      payload: { commodityType: WOOD_AND_CUT_TREES, crumb: 'token' }
    })

    expect(result.after).toEqual({ commodityType: WOOD_AND_CUT_TREES })
  })

  it('Should redirect to the overview, the only step of the run having run', async () => {
    const result = await driveHandler(post, {
      payload: { commodityType: POTATOES }
    })

    expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
  })

  it('Should honour Save and return to overview', async () => {
    const result = await driveHandler(post, {
      payload: { commodityType: POTATOES, exit: 'hub' }
    })

    expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
    expect(result.after).toEqual({ commodityType: POTATOES })
  })
})

describe('POST commodity-type — save failures', () => {
  beforeAll(() => {
    configureSession(sessionStub)
    installHighRiskPlantsJourney()
  })

  beforeEach(() => {
    store.clear()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      }))
    )
  })

  afterEach(() => {
    configureRecords(recordsStub)
    vi.unstubAllGlobals()
  })

  const failingOnControllerCommit = (failure) => {
    let replaceCalls = 0
    configureRecords({
      ...recordsStub,
      replaceFulfilment: (...args) => {
        replaceCalls += 1
        return replaceCalls === 1
          ? recordsStub.replaceFulfilment(...args)
          : failure(...args)
      }
    })
  }

  it('Should re-render a backend request failure at 500 with the banner and the value', async () => {
    failingOnControllerCommit(realRecords.replaceFulfilment)

    const result = await driveHandler(post, {
      payload: { commodityType: POTATOES }
    })

    expect(result.response.statusCode).toBe(500)
    expect(result.view.context.recoverableError).toBe(true)
    expect(result.view.context.values).toEqual({ commodityType: POTATOES })
  })

  it('Should let a programming error escape to the promoted catch-all', async () => {
    failingOnControllerCommit(async () => {
      throw new TypeError('programming failure')
    })

    await expect(
      driveHandler(post, { payload: { commodityType: POTATOES } })
    ).rejects.toThrow(new TypeError('programming failure'))
  })
})

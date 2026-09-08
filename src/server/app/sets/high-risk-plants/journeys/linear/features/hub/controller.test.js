import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { configureRecords } from '../../../../../../engine/persistence/records.js'
import {
  configureSession,
  SESSION_COOKIES
} from '../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import { store } from '../../../../../../engine/store.js'
import { journeyRequest } from '../../../../../../engine/test-support.js'
import { hubRoutePath } from '../../../../../../shared/paths.js'
import { SURFACES } from '../../../../../../shared/kit.js'
import { RUN_ACTIVE, RUN_COMPLETE } from '../../../../../../flow/run-state.js'
import {
  COMPLETE_POTATO_CONSIGNMENT,
  installHighRiskPlantsJourney
} from '../../test-support.js'

import { GROUPS, routes } from './controller.js'
import { copy } from './copy/copy.en.js'

const hubGet = routes.find((route) => route.method === 'GET').handler

const CONSIGNMENT_GROUP_ID = 'about-the-consignment'
const NOT_STARTED_TAG_CLASS = 'govuk-tag--blue'
const POTATOES = 'potatoes'

const buildH = () => {
  const captured = { cookies: {} }
  return {
    view: (template, context) => {
      captured.view = { template, context }
      return captured.view
    },
    redirect: (to) => {
      captured.redirect = to
      return { redirect: to }
    },
    state: (name, value) => {
      captured.cookies[name] = value
    },
    unstate: (name) => {
      delete captured.cookies[name]
    },
    captured
  }
}

const renderHub = async ({ openingRun, seed = {} } = {}) => {
  const journey = await store.create()
  await store.seedAnswers(journey.journeyId, seed)
  const h = buildH()
  const state = openingRun
    ? { [SESSION_COOKIES.openingRun]: { [journey.journeyId]: openingRun } }
    : {}
  await hubGet(journeyRequest(journey.journeyId, { state }), h)
  return { journeyId: journey.journeyId, h }
}

describe('#hubGet', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    installHighRiskPlantsJourney()
  })
  beforeEach(() => store.clear())

  it('Should register one GET-only route at the hub path', () => {
    expect(routes).toEqual([
      expect.objectContaining({ method: 'GET', path: hubRoutePath() })
    ])
  })

  it('Should title the hub Overview and render it on the form surface', async () => {
    const { h } = await renderHub()

    expect(h.captured.view.template).toBe(
      'high-risk-plants/journeys/linear/features/hub/template'
    )
    expect(h.captured.view.context).toMatchObject({
      heading: 'Overview',
      pageTitle: 'Overview',
      copy,
      contentColumnClass: SURFACES.form
    })
  })

  it('Should point the back link and the Return to dashboard button at the dashboard', async () => {
    const { h } = await renderHub()

    expect(h.captured.view.context.backLink).toBe('/')
    expect(h.captured.view.context.dashboardHref).toBe('/')
  })

  it('Should render no breadcrumbs, no progress line and no section caption', async () => {
    const { h } = await renderHub()

    expect(h.captured.view.context.breadcrumbs).toBeUndefined()
    expect(h.captured.view.context.progressLine).toBeUndefined()
    expect(h.captured.view.context.caption).toBeUndefined()
  })

  it('Should carry the shared chrome copy and the journey reference strip', async () => {
    const { journeyId, h } = await renderHub()

    expect(h.captured.view.context.sharedCopy.layout.serviceName).toBe(
      'Import notification service'
    )
    expect(h.captured.view.context.journeyStrip).toEqual({
      reference: journeyId,
      status: { text: 'Draft', classes: 'govuk-tag--blue' }
    })
  })

  it('Should render the about-the-consignment group and its two rows', async () => {
    const { journeyId, h } = await renderHub()

    expect(h.captured.view.context.groups).toEqual([
      {
        id: CONSIGNMENT_GROUP_ID,
        caption: copy.groups[CONSIGNMENT_GROUP_ID],
        items: [
          expect.objectContaining({
            title: { text: copy.rows.commodities.title },
            href: `/notifications/${journeyId}/commodity-type`,
            status: {
              tag: {
                text: copy.statuses.notYetStarted,
                classes: NOT_STARTED_TAG_CLASS
              }
            }
          }),
          expect.objectContaining({
            title: { text: copy.rows.origin.title },
            status: {
              text: copy.statuses.cannotStartYet,
              classes: 'govuk-task-list__status--cannot-start-yet'
            }
          })
        ]
      }
    ])
  })

  it('Should offer no link to origin until the entry question is answered', async () => {
    const { h } = await renderHub()

    const [, originRow] = h.captured.view.context.groups[0].items
    expect(originRow).not.toHaveProperty('href')
  })

  it('Should open the origin row once the commodity type is answered', async () => {
    const { journeyId, h } = await renderHub({
      seed: { commodityType: POTATOES }
    })

    const [, originRow] = h.captured.view.context.groups[0].items
    expect(originRow.href).toBe(`/notifications/${journeyId}/origin`)
    expect(originRow.status).toEqual({
      tag: {
        text: copy.statuses.notYetStarted,
        classes: NOT_STARTED_TAG_CLASS
      }
    })
  })

  it('Should complete the origin row once a country is named', async () => {
    const { h } = await renderHub({
      seed: { commodityType: POTATOES, countryOfOrigin: 'FR' }
    })

    const [, originRow] = h.captured.view.context.groups[0].items
    expect(originRow.status).toEqual({
      tag: { text: copy.statuses.completed, classes: 'govuk-tag--green' }
    })
  })

  it('Should give the commodities row no hint — no source writes one', async () => {
    const { h } = await renderHub()

    const [row] = h.captured.view.context.groups[0].items
    expect(row).not.toHaveProperty('hint')
  })

  it('Should hold the commodities row in progress on a type with no line', async () => {
    const { h } = await renderHub({ seed: { commodityType: POTATOES } })

    const [row] = h.captured.view.context.groups[0].items
    expect(row.status).toEqual({
      tag: { text: copy.statuses.inProgress, classes: 'govuk-tag--light-blue' }
    })
  })

  it('Should complete the commodities row once a line answers every field its category asks for', async () => {
    const { journeyId, h } = await renderHub({
      seed: COMPLETE_POTATO_CONSIGNMENT
    })

    const [row] = h.captured.view.context.groups[0].items
    expect(row.status).toEqual({
      tag: { text: copy.statuses.completed, classes: 'govuk-tag--green' }
    })
    expect(row.href).toBe(`/notifications/${journeyId}/commodity-type`)
  })

  it('Should render nothing for the three groups that have landed no row', async () => {
    const { h } = await renderHub()

    expect(
      GROUPS.filter((group) => group.id !== CONSIGNMENT_GROUP_ID).every(
        (group) => group.rows.length === 0
      )
    ).toBe(true)
    expect(h.captured.view.context.groups.map((group) => group.id)).toEqual([
      CONSIGNMENT_GROUP_ID
    ])
  })

  it('Should carry no commodity totals — the animals panel is not copied', async () => {
    const { h } = await renderHub()

    expect(h.captured.view.context).not.toHaveProperty('commodityTotals')
  })

  it('Should complete an active opening run on GET', async () => {
    const { journeyId, h } = await renderHub({ openingRun: RUN_ACTIVE })

    expect(h.captured.cookies[SESSION_COOKIES.openingRun]).toEqual({
      [journeyId]: RUN_COMPLETE
    })
  })

  it('Should leave a journey that never began an opening run untouched', async () => {
    const { h } = await renderHub()

    expect(h.captured.cookies).not.toHaveProperty(SESSION_COOKIES.openingRun)
  })
})

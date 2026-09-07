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

import { GROUPS, routes } from './controller.js'
import { copy } from './copy/copy.en.js'

const hubGet = routes.find((route) => route.method === 'GET').handler

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

const renderHub = async ({ openingRun } = {}) => {
  const journey = await store.create()
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

  it('Should render no group while every group is empty of task rows', async () => {
    const { h } = await renderHub()

    expect(GROUPS.every((group) => group.rows.length === 0)).toBe(true)
    expect(h.captured.view.context.groups).toEqual([])
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

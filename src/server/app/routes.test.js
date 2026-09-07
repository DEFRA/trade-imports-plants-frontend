import { describe, expect, it, vi, beforeAll, afterAll } from 'vitest'

import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { makeScope } from './engine/index.js'
import { isDispatchBuilt } from './flow/dispatch.js'
import { allRoutes } from './sets/high-risk-plants/journeys/linear/features/index.js'
import { copy as dashboardCopy } from './sets/high-risk-plants/journeys/linear/features/dashboard/copy/copy.en.js'
import { authenticatedCredentials } from './engine/test-support.js'
import { mockOidcConfig } from '../common/test-helpers/mock-oidc-config.js'

vi.mock('../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

describe('high-risk-plants plugin registration', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  it('Should register the set under its own plugin name', () => {
    expect(server.registrations).toHaveProperty('high-risk-plants')
  })

  it('Should pass every boot guard and build the dispatch index', () => {
    expect(isDispatchBuilt()).toBe(true)
  })

  it('Should inject the flow readiness roll-up into the bridge seam', () => {
    expect(makeScope({}).readyForCheckYourAnswers).toBe(true)
  })

  it('Should name the set-owned session cookies', () => {
    expect(Object.keys(server.states.cookies)).toEqual(
      expect.arrayContaining([
        'highRiskPlantsKnownJourneys',
        'highRiskPlantsOpeningRun',
        'highRiskPlantsFlowOnlyAnswers'
      ])
    )
  })

  it('Should leave every promoted route to inherit the server default strategy', () => {
    for (const route of allRoutes) {
      expect(route.options ?? {}).not.toHaveProperty('auth')
    }
  })

  it('Should serve health and the dashboard at /', async () => {
    const health = await server.inject({ method: 'GET', url: '/health' })
    const dashboard = await server.inject({
      method: 'GET',
      url: '/',
      auth: { strategy: 'session', credentials: authenticatedCredentials }
    })

    expect(health.statusCode).toBe(statusCodes.ok)
    expect(dashboard.statusCode).toBe(statusCodes.ok)
    expect(dashboard.result).toContain(dashboardCopy.startButton)
  })
})

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { createServer } from '../../server.js'
import { mockOidcConfig } from '../../common/test-helpers/mock-oidc-config.js'
import { LEVELS } from './levels.js'
import { PAGE_LEVELS, SECTION_LEVELS } from './page-levels.js'

vi.mock('../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

describe('page levels', () => {
  let server
  let getRoutePaths

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
    getRoutePaths = new Set(
      server
        .table()
        .filter((route) => route.method === 'get')
        .map((route) => route.path)
    )
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  it('Should list only routes that are registered GET routes', () => {
    const listed = [
      ...Object.keys(PAGE_LEVELS),
      ...SECTION_LEVELS.map(({ section }) => section)
    ]

    expect(listed.filter((path) => !getRoutePaths.has(path))).toEqual([])
  })

  it('Should give every page a known level', () => {
    const levels = [
      ...Object.values(PAGE_LEVELS),
      ...SECTION_LEVELS.map(({ level }) => level)
    ]

    expect(levels.filter((level) => !(level in LEVELS))).toEqual([])
  })
})

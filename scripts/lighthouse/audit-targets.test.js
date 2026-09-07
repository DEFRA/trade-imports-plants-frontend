import { describe, expect, it } from 'vitest'

import {
  assertTargetsAreCurrent,
  auditableRoutePaths,
  auditPaths,
  auditUrls,
  FILLED_BY,
  QUERY,
  reportName,
  reportNames,
  SKIPPED
} from './audit-targets.js'
import { journeyIdIn, SEED_SHAPES } from './seed-notification.js'

const ORIGIN = 'http://localhost:3003'

const USE_CASES = [
  'warePotatoes',
  'warePotatoesLate',
  'seedPotatoes',
  'plantsForPlanting',
  'woodWithoutBark'
]

// No registered page needs a skip, a filled-by seed or a query string yet, so
// every assertion about one runs against a synthetic route table. Keying the
// seeded ids off SEED_SHAPES
// also proves the interface between the two modules: FILLED_BY names a shape,
// and the shape has to be one the setup step seeds.
const journeyIds = Object.fromEntries(
  Object.keys(SEED_SHAPES).map((shape, index) => [shape, `PHN-26-000${index}`])
)

const DASHBOARD_PATH = '/'
const HUB_PATH = '/notifications/{journeyId}'
const DELETE_PATH = '/notifications/{journeyId}/delete'
const COMMODITY_TYPE_PATH = '/notifications/{journeyId}/commodity-type'

const ROUTES = [
  { method: 'GET', path: DASHBOARD_PATH },
  { method: 'GET', path: HUB_PATH },
  { method: 'GET', path: '/notifications/{journeyId}/origin' },
  { method: 'GET', path: '/notifications/{journeyId}/treatments' },
  { method: 'GET', path: '/notifications/{journeyId}/late-reason' },
  { method: 'GET', path: '/notifications/{journeyId}/uploads/status' },
  { method: 'POST', path: '/notifications' }
]

const GET_PATHS = ROUTES.filter(({ method }) => method === 'GET').map(
  ({ path }) => path
)

const SKIPPED_PATH = '/notifications/{journeyId}/uploads/status'
const TREATMENTS_PATH = '/notifications/{journeyId}/treatments'
const LATE_REASON_PATH = '/notifications/{journeyId}/late-reason'
const SKIPPED_PATH_COUNT = 1

/** The three maps are empty until pages land, so a test registers the entries
 * it needs for its own length and takes them back out again. */
const withEntries = (map, entries, run) => {
  for (const [key, value] of entries) {
    map.set(key, value)
  }
  try {
    return run()
  } finally {
    for (const [key] of entries) {
      map.delete(key)
    }
  }
}

const withSkipped = (run) =>
  withEntries(
    SKIPPED,
    [[SKIPPED_PATH, 'upload-scan polling — JSON, not a page']],
    run
  )

const withFilledBy = (run) =>
  withEntries(
    FILLED_BY,
    [
      [TREATMENTS_PATH, 'woodWithoutBark'],
      [LATE_REASON_PATH, 'warePotatoesLate']
    ],
    run
  )

describe('#auditPaths', () => {
  it('Should build a URL for every GET route the skip list does not name', () => {
    const paths = withSkipped(() => auditPaths(journeyIds, ROUTES))

    expect(paths).toHaveLength(GET_PATHS.length - SKIPPED_PATH_COUNT)
    expect(paths).not.toContain(
      `/notifications/${journeyIds.warePotatoes}/uploads/status`
    )
    expect(paths.some((path) => path.includes('{'))).toBe(false)
  })

  it('Should point each route at the notification the filled-by list names and the rest at the default shape', () => {
    const paths = withFilledBy(() => auditPaths(journeyIds, ROUTES))

    expect(
      paths.filter((path) => path.includes(journeyIds.woodWithoutBark))
    ).toEqual([`/notifications/${journeyIds.woodWithoutBark}/treatments`])
    expect(
      paths.filter((path) => path.includes(journeyIds.warePotatoesLate))
    ).toEqual([`/notifications/${journeyIds.warePotatoesLate}/late-reason`])
    expect(
      paths.filter((path) => path.includes(journeyIds.warePotatoes))
    ).toEqual([
      `/notifications/${journeyIds.warePotatoes}`,
      `/notifications/${journeyIds.warePotatoes}/origin`,
      `/notifications/${journeyIds.warePotatoes}/uploads/status`
    ])
  })

  it('Should carry the query string a route needs before it will render', () => {
    const path = '/notifications/{journeyId}/origin'

    const paths = withEntries(QUERY, [[path, '?change=1']], () =>
      auditPaths(journeyIds, ROUTES)
    )

    expect(paths).toContain(
      `/notifications/${journeyIds.warePotatoes}/origin?change=1`
    )
  })

  it('Should audit a page the moment the app registers a GET route for it', () => {
    const routes = [
      ...ROUTES,
      { method: 'GET', path: '/notifications/{journeyId}/brand-new' }
    ]

    expect(auditPaths(journeyIds, routes)).toContain(
      `/notifications/${journeyIds.warePotatoes}/brand-new`
    )
  })

  it('Should refuse to audit a route whose notification shape was never seeded', () => {
    const unseeded = { ...journeyIds, woodWithoutBark: undefined }

    expect(() => withFilledBy(() => auditPaths(unseeded, ROUTES))).toThrow(
      /audits .* on the "woodWithoutBark" notification, which the setup step did not seed/
    )
  })

  it('Should audit every page the set registers today', () => {
    expect(auditPaths(journeyIds)).toEqual([
      DASHBOARD_PATH,
      `/notifications/${journeyIds.warePotatoes}`,
      `/notifications/${journeyIds.warePotatoes}/delete`,
      `/notifications/${journeyIds.warePotatoes}/commodity-type`
    ])
  })
})

describe('#auditableRoutePaths', () => {
  it('Should name every GET route the skip list does not name, journey id unsubstituted', () => {
    const paths = withSkipped(() => auditableRoutePaths(ROUTES))

    expect(paths).toHaveLength(GET_PATHS.length - SKIPPED_PATH_COUNT)
    expect(paths).toContain(TREATMENTS_PATH)
    expect(paths).not.toContain(SKIPPED_PATH)
  })

  it('Should name every GET route the set registers today', () => {
    expect(auditableRoutePaths()).toEqual([
      DASHBOARD_PATH,
      HUB_PATH,
      DELETE_PATH,
      COMMODITY_TYPE_PATH
    ])
  })
})

describe('#assertTargetsAreCurrent', () => {
  it('Should pass against a route table the three lists do not contradict', () => {
    expect(() => assertTargetsAreCurrent(ROUTES)).not.toThrow()
  })

  it('Should reject a skip list naming a route the app no longer serves', () => {
    const routes = ROUTES.filter(({ path }) => path !== SKIPPED_PATH)

    expect(() => withSkipped(() => assertTargetsAreCurrent(routes))).toThrow(
      /skip list names .*, which the app no longer serves/
    )
  })

  it('Should reject a filled-by entry naming a route the app no longer serves', () => {
    const routes = ROUTES.filter(({ path }) => path !== TREATMENTS_PATH)

    expect(() => withFilledBy(() => assertTargetsAreCurrent(routes))).toThrow(
      /filled-by list names .*, which the app no longer serves/
    )
  })

  it('Should reject a query entry naming a route the app no longer serves', () => {
    const path = '/notifications/{journeyId}/gone'

    expect(() =>
      withEntries(QUERY, [[path, '?change=1']], () =>
        assertTargetsAreCurrent(ROUTES)
      )
    ).toThrow(/query list names .*, which the app no longer serves/)
  })

  it('Should refuse a new route whose extra path parameter nothing can satisfy', () => {
    const routes = [
      ...ROUTES,
      { method: 'GET', path: '/notifications/{journeyId}/lines/{lineId}' }
    ]

    expect(() => assertTargetsAreCurrent(routes)).toThrow(
      /cannot build a URL for \/notifications\/\{journeyId}\/lines\/\{lineId}/
    )
  })
})

describe('#reportName', () => {
  it('Should name a report after its route, without the seeded journey id', () => {
    expect(
      reportName(
        `${ORIGIN}/notifications/${journeyIds.warePotatoes}/uploads/status`,
        journeyIds
      )
    ).toBe('notifications_uploads_status')
  })

  it('Should name the report for the service start page', () => {
    expect(reportName(`${ORIGIN}/`, journeyIds)).toBe('home')
  })

  it('Should drop the query string a route needs to render', () => {
    expect(
      reportName(
        `${ORIGIN}/notifications/${journeyIds.warePotatoes}/origin?change=1`,
        journeyIds
      )
    ).toBe('notifications_origin')
  })
})

describe('#reportNames', () => {
  it('Should give a page the same report name however the notifications are seeded', () => {
    const other = Object.fromEntries(
      Object.keys(journeyIds).map((shape) => [shape, `PHN-27-${shape}`])
    )

    expect(
      Object.values(reportNames(auditUrls(ORIGIN, other, ROUTES), other))
    ).toEqual(
      Object.values(
        reportNames(auditUrls(ORIGIN, journeyIds, ROUTES), journeyIds)
      )
    )
  })

  it('Should name every audited URL without leaking a journey id', () => {
    const urls = withFilledBy(() => auditUrls(ORIGIN, journeyIds, ROUTES))
    const names = reportNames(urls, journeyIds)

    expect(Object.keys(names)).toEqual(urls)
    expect(Object.values(names).filter((name) => name.includes('PHN'))).toEqual(
      []
    )
  })

  it('Should refuse two routes that would overwrite each other', () => {
    const urls = [
      `${ORIGIN}/notifications/${journeyIds.warePotatoes}/origin`,
      `${ORIGIN}/notifications/${journeyIds.seedPotatoes}/origin`
    ]

    expect(() => reportNames(urls, journeyIds)).toThrow(
      /would write both .* to notifications_origin\.report\.html/
    )
  })
})

describe('#SEED_SHAPES', () => {
  it('Should hold one shape per blueprint use case', () => {
    expect(Object.keys(SEED_SHAPES)).toEqual(USE_CASES)
  })

  it('Should seed every shape with no journey steps', () => {
    expect(Object.values(SEED_SHAPES).flatMap(({ steps }) => steps)).toEqual([])
  })
})

describe('#journeyIdIn', () => {
  it('Should read the journey id from a redirect to the first journey page', () => {
    expect(journeyIdIn('/notifications/PHN-26-0001/commodity-type')).toBe(
      'PHN-26-0001'
    )
  })

  it('Should read the journey id from a redirect to the hub', () => {
    expect(journeyIdIn('/notifications/PHN-26-0001')).toBe('PHN-26-0001')
  })

  it('Should read no journey id from a redirect somewhere else', () => {
    expect(journeyIdIn('/')).toBe('')
  })
})

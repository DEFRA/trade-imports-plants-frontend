import { SET_BASE } from '../../../set.js'
import { beforeAll, describe, expect, it } from 'vitest'

import {
  nextStepPath,
  taskRowsOfSection
} from '../../../../../flow/navigation.js'
import { journeySections } from '../../../../../flow/journey-flow.js'
import {
  installHighRiskPlantsJourney,
  PLANTS_RUN,
  POTATO_RUN,
  scopeOf
} from '../test-support.js'
import { commodityTypePage } from '../features/commodity-type/page.js'
import {
  commoditiesPage,
  commodityDetailsPage
} from '../features/commodities/page.js'
import { originPage } from '../features/origin/page.js'
import { arrivalStatusPage } from '../features/arrival-status/page.js'
import { arrivalDetailsPage } from '../features/arrival-details/page.js'
import { placeOfDestinationPage } from '../features/place-of-destination/page.js'
import { consignorPage } from '../features/consignor-select/page.js'
import { identificationNumbersPage } from '../features/identification-numbers/page.js'
import { consignmentContactSelectPage } from '../features/consignment-contact-select/page.js'
import { notificationViewPage } from '../features/check-answers/page.js'

const JOURNEY_ID = 'HRP-0001'

const journeyPath = (page) =>
  `${SET_BASE}/notifications/${JOURNEY_ID}/${page.slug}`

const nextAfter = (page, scope) => nextStepPath(page.id, scope, JOURNEY_ID)

describe('#nextStepPath — the next page that applies', () => {
  beforeAll(() => installHighRiskPlantsJourney())

  it.each([
    ['plants or wood', PLANTS_RUN],
    ['potatoes', POTATO_RUN]
  ])('Should walk a %s notification through the journey in order', (_, run) => {
    const scope = scopeOf(...run)
    const visited = []
    for (
      let path = nextAfter(commodityTypePage, scope);
      path;
      path = nextAfter(pageAt(path), scope)
    ) {
      visited.push(path)
    }
    expect(visited).toEqual(
      expectedOrder(run === POTATO_RUN).map((page) => journeyPath(page))
    )
  })

  it('Should go from the commodities list to origin, never to commodity details', () => {
    expect(nextAfter(commoditiesPage, scopeOf(...PLANTS_RUN))).toBe(
      journeyPath(originPage)
    )
  })

  it('Should go from the commodities list to origin with only the commodity type saved', () => {
    expect(
      nextAfter(commoditiesPage, scopeOf('commodityType', 'countryOfOrigin'))
    ).toBe(journeyPath(originPage))
  })

  it('Should go from origin to arrival status for plants and wood and to the arrival details for potatoes', () => {
    expect(nextAfter(originPage, scopeOf(...PLANTS_RUN))).toBe(
      journeyPath(arrivalStatusPage)
    )
    expect(nextAfter(originPage, scopeOf(...POTATO_RUN))).toBe(
      journeyPath(arrivalDetailsPage)
    )
  })

  it('Should go from the place of destination to the consignor for plants and wood and to identification numbers for potatoes', () => {
    expect(nextAfter(placeOfDestinationPage, scopeOf(...PLANTS_RUN))).toBe(
      journeyPath(consignorPage)
    )
    expect(nextAfter(placeOfDestinationPage, scopeOf(...POTATO_RUN))).toBe(
      journeyPath(identificationNumbersPage)
    )
  })

  it('Should go from the contact address to nothing, the review page being the fallback', () => {
    expect(
      nextAfter(consignmentContactSelectPage, scopeOf(...PLANTS_RUN))
    ).toBeUndefined()
  })

  it('Should go on from commodity details to origin, a sub-page leaving by the journey order', () => {
    expect(nextAfter(commodityDetailsPage, scopeOf(...PLANTS_RUN))).toBe(
      journeyPath(originPage)
    )
  })

  it('Should refuse a page that belongs to no section', () => {
    expect(() =>
      nextStepPath('not-a-real-page', scopeOf(...PLANTS_RUN), JOURNEY_ID)
    ).toThrow(/not in the journey's sections/)
  })

  it('Should leave the review page to its caller, there being nothing after it in a task row', () => {
    expect(
      nextAfter(notificationViewPage, scopeOf(...PLANTS_RUN))
    ).toBeUndefined()
  })
})

describe('#taskRowsOfSection — what Overview lists under a caption', () => {
  beforeAll(() => installHighRiskPlantsJourney())

  it('Should list the task rows of every section in the order of their first page', () => {
    expect(
      journeySections()
        .filter((section) => taskRowsOfSection(section).length > 0)
        .map((section) => [
          section.id,
          taskRowsOfSection(section).map((row) => row.id)
        ])
    ).toEqual([
      ['about-the-consignment', ['commodities', 'origin']],
      ['arrival-and-destination', ['arrival', 'destination']],
      ['consignment-parties', ['consignor', 'identificationNumbers', 'contact']]
    ])
  })
})

function pageAt(path) {
  const slug = path.split(`${JOURNEY_ID}/`)[1]
  return journeySections()
    .flatMap((section) => section.pages)
    .find((page) => page.slug === slug)
}

function expectedOrder(isPotatoes) {
  return [
    commoditiesPage,
    originPage,
    ...(isPotatoes ? [] : [arrivalStatusPage]),
    arrivalDetailsPage,
    placeOfDestinationPage,
    ...(isPotatoes ? [] : [consignorPage]),
    identificationNumbersPage,
    consignmentContactSelectPage
  ]
}

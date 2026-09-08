import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../../../../flow/dispatch.js'
import {
  configureObligationSet,
  obligationSet
} from '../../../../../model/obligations/manifest.js'
import {
  FULFILLED,
  IN_PROGRESS,
  NA,
  NOT_STARTED,
  OPTIONAL
} from '../../../../../bridge/status/index.js'
import { makeScope } from '../../../../../engine/index.js'
import { evaluateAnswers } from '../../../../../bridge/evaluation.js'
import {
  COMPLETE_POTATO_CONSIGNMENT,
  installHighRiskPlantsJourney
} from '../test-support.js'
import { GROUPS } from '../features/hub/controller.js'
import { commodityTypePage } from '../features/commodity-type/page.js'
import {
  commoditiesPage,
  commodityDetailsPage
} from '../features/commodities/page.js'
import { commodityTypes } from '../../../services/commodities/index.js'
import { dispatchPages } from '../features/index.js'
import { rowParts, rowStatus, taskRowById, taskRows } from './task-rows.js'

const REVIEW_ROW_ID = 'review'
const NO_OBLIGATIONS = { obligations: [], groups: [] }

const originPage = { id: 'originPage', slug: 'origin', collects: ['origin'] }
const referencePage = {
  id: 'referencePage',
  slug: 'reference',
  collects: ['reference']
}

const scopeOf = (...names) => new Set(names)

describe('#taskRows — the rows the hub can resolve', () => {
  it('Should hold the commodities row the commodity section landed', () => {
    expect(taskRows).toEqual([
      {
        id: 'commodities',
        pages: [commodityTypePage, commoditiesPage, commodityDetailsPage]
      }
    ])
  })

  it('Should resolve the commodities row by id', () => {
    expect(taskRowById('commodities')).toBe(taskRows[0])
  })

  it('Should resolve no id the journey has not landed', () => {
    expect(taskRowById(REVIEW_ROW_ID)).toBeUndefined()
    expect(taskRowById('about-the-consignment')).toBeUndefined()
  })

  it('Should give the hub a row for every id its groups name', () => {
    const unresolved = GROUPS.flatMap((group) => group.rows).filter(
      (id) => id !== REVIEW_ROW_ID && taskRowById(id) === undefined
    )
    expect(
      unresolved,
      'a hub group may only name a task row or the review row'
    ).toEqual([])
  })
})

describe('#rowParts and #rowStatus', () => {
  const installedSet = obligationSet()

  beforeAll(() => {
    configureObligationSet(NO_OBLIGATIONS)
    buildDispatch([...dispatchPages, originPage, referencePage])
  })
  afterAll(() => configureObligationSet(installedSet))

  it('Should take the commodities row parts from the pages it holds', () => {
    // The entry sub-page collects nothing of its own — the list page owns the
    // group — so the row is the entry question plus the collection.
    expect(rowParts(taskRows[0])).toEqual(['commodityType', 'commodityLines'])
  })

  it('Should prefer an explicit parts list over the pages the row holds', () => {
    const row = {
      id: 'origin',
      parts: ['countryOfOrigin'],
      pages: [originPage, referencePage]
    }

    expect(rowParts(row)).toEqual(['countryOfOrigin'])
  })

  it('Should otherwise take the obligations the row pages collect', () => {
    const row = { id: 'origin', pages: [originPage, referencePage] }

    expect(rowParts(row)).toEqual(['origin', 'reference'])
  })

  it('Should read no obligation from a page the dispatch index never saw', () => {
    const row = { id: 'origin', pages: [{ id: 'unindexedPage' }] }

    expect(rowParts(row)).toEqual([])
  })

  it('Should status a row over its parts — out of scope is not applicable', () => {
    const row = { id: 'origin', pages: [originPage] }

    expect(rowStatus(row, {}, scopeOf('reference'), {})).toBe(NA)
  })

  it('Should status an in-scope row nobody has answered as optional', () => {
    const row = { id: 'origin', pages: [originPage] }

    expect(rowStatus(row, {}, scopeOf('origin'), {})).toBe(OPTIONAL)
  })
})

describe('#rowStatus — one status per hub task row', () => {
  beforeAll(() => installHighRiskPlantsJourney())

  const statusIn = (rowId, answers) =>
    rowStatus(
      taskRowById(rowId),
      answers,
      makeScope(answers).inScope,
      evaluateAnswers(answers)
    )

  it('Should hold the commodities row at Not yet started while nothing is answered', () => {
    expect(statusIn('commodities', {})).toBe(NOT_STARTED)
  })

  it('Should hold the commodities row in progress on a type with no line', () => {
    expect(
      statusIn('commodities', { commodityType: commodityTypes()[0] })
    ).toBe(IN_PROGRESS)
  })

  it('Should complete the commodities row once a line is complete too', () => {
    expect(statusIn('commodities', COMPLETE_POTATO_CONSIGNMENT)).toBe(FULFILLED)
  })

  it('Should hold the row in progress while a line is missing a field', () => {
    expect(
      statusIn('commodities', {
        commodityType: 'potatoes',
        commodityLines: [{ category: 'seed-potatoes' }]
      })
    ).toBe(IN_PROGRESS)
  })

  it('Should hold the row in progress while any one line is incomplete', () => {
    expect(
      statusIn('commodities', {
        commodityType: 'potatoes',
        commodityLines: [
          ...COMPLETE_POTATO_CONSIGNMENT.commodityLines,
          { category: 'seed-potatoes' }
        ]
      })
    ).toBe(IN_PROGRESS)
  })
})

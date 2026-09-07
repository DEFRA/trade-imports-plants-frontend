import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../../../../flow/dispatch.js'
import {
  configureObligationSet,
  obligationSet
} from '../../../../../model/obligations/manifest.js'
import { NA, OPTIONAL } from '../../../../../bridge/status/index.js'
import { GROUPS } from '../features/hub/controller.js'
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

describe('#taskRows — the hub landing state', () => {
  it('Should hold no task row until a section lands one', () => {
    expect(taskRows).toEqual([])
  })

  it('Should resolve no row id while the journey has no rows', () => {
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
    buildDispatch([originPage, referencePage])
  })
  afterAll(() => configureObligationSet(installedSet))

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

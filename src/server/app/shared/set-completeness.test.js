/**
 * The mount-time completeness check.
 *
 * Each seam is filled through its real configure function rather than a stub,
 * so a seam that changes shape breaks this suite instead of leaving it green
 * against a store nothing writes to any more.
 */
import { describe, expect, it } from 'vitest'

import {
  assertSetConfigured,
  assertSetsConfigured,
  OPTIONAL_SEAMS,
  REQUIRED_SEAMS
} from './set-completeness.js'
import { knownSeamLabels, withSetContext } from './set-context.js'
import { configureAnswersForRead } from '../bridge/answers-read.js'
import { configureFulfilmentRegistry } from '../bridge/fulfilment-registry.js'
import { configureReadyForCheckYourAnswers } from '../bridge/readiness-config.js'
import { buildDispatch } from '../flow/dispatch.js'
import { configureJourneyFlow } from '../flow/journey-flow.js'
import { configureRecords } from '../engine/persistence/records.js'
import { configureSession } from '../engine/persistence/session.js'
import { configureObligationSet } from '../model/obligations/manifest.js'

const neverCalled = () => {
  throw new Error('this suite checks that a seam is filled, never runs it')
}

/**
 * The emptiest thing each required seam accepts. `Obligation set` is filled
 * first because the fulfilment registry and the dispatch index both read the
 * manifest as they are built.
 */
const SEAM_FILLERS = Object.freeze({
  'Obligation set': (setId) =>
    configureObligationSet(setId, { obligations: [], groups: [] }),
  'Fulfilment registry': (setId) => configureFulfilmentRegistry(setId, []),
  'journey flow': (setId) =>
    configureJourneyFlow(setId, {
      sections: [],
      taskRows: [],
      rowStatus: neverCalled,
      nextRunTarget: neverCalled,
      entryGuardTarget: neverCalled
    }),
  'Ready-for-check-your-answers': (setId) =>
    configureReadyForCheckYourAnswers(setId, () => false),
  dispatch: (setId) => buildDispatch(setId, []),
  records: (setId) => configureRecords(setId, {}),
  session: (setId) => configureSession(setId, {}, {})
})

const configureAllSeamsBut = (setId, omitted) =>
  withSetContext(setId, () => {
    for (const [label, fill] of Object.entries(SEAM_FILLERS)) {
      if (label !== omitted) {
        fill(setId)
      }
    }
  })

describe('#assertSetConfigured', () => {
  it('Should mount a set that has configured every required seam', () => {
    const setId = 'fully-configured-set'
    configureAllSeamsBut(setId)

    expect(() => assertSetConfigured(setId)).not.toThrow()
  })

  it('Should name the set and the seam when the journey flow is missing', () => {
    // The quiet fallback this check exists for: an unconfigured journey flow
    // answers with no sections and no task rows, so the dashboard renders empty.
    const setId = 'set-without-journey-flow'
    configureAllSeamsBut(setId, 'journey flow')

    expect(() => assertSetConfigured(setId)).toThrow(
      `Set "${setId}" was mounted without configuring: journey flow (configureJourneyFlow)`
    )
  })

  it('Should name the set and the seam when the session is missing', () => {
    // The other quiet fallback: an unconfigured session hands back the shared
    // default cookie names, so two sets would share one set of cookies.
    const setId = 'set-without-session'
    configureAllSeamsBut(setId, 'session')

    expect(() => assertSetConfigured(setId)).toThrow(
      `Set "${setId}" was mounted without configuring: session (configureSession)`
    )
  })

  it('Should name every missing seam, not only the first', () => {
    const message = () => assertSetConfigured('set-that-configured-nothing')

    for (const [label, configure] of Object.entries(REQUIRED_SEAMS)) {
      expect(message).toThrow(`${label} (${configure})`)
    }
  })

  it('Should mount a set that configured no optional seam', () => {
    const setId = 'set-without-optional-seams'
    configureAllSeamsBut(setId)

    expect(Object.keys(SEAM_FILLERS)).not.toContain(
      'Answers-for-read sanitiser'
    )
    expect(() => assertSetConfigured(setId)).not.toThrow()
  })

  it('Should still refuse a set that configured only an optional seam', () => {
    const setId = 'set-with-only-an-optional-seam'
    configureAnswersForRead(setId, async (_request, answers) => answers)

    expect(() => assertSetConfigured(setId)).toThrow(
      `Set "${setId}" was mounted without configuring:`
    )
  })
})

describe('#assertSetsConfigured', () => {
  it('Should check every mounted set, not only the first', () => {
    const goodSet = 'first-mounted-set'
    const brokenSet = 'second-mounted-set'
    configureAllSeamsBut(goodSet)
    configureAllSeamsBut(brokenSet, 'records')

    expect(() => assertSetsConfigured([goodSet, brokenSet])).toThrow(
      `Set "${brokenSet}" was mounted without configuring: records (configureRecords)`
    )
  })

  it('Should mount nothing without complaint when no set is mounted', () => {
    expect(() => assertSetsConfigured([])).not.toThrow()
  })
})

describe('the required seam list', () => {
  // A seam store's label is what the check looks the seam up by, so a label
  // renamed in its own module would make the check report that seam missing
  // for every set. Catch the drift here rather than at somebody's boot.
  it.each(Object.keys(REQUIRED_SEAMS))(
    'Should name a seam the engine actually keeps: %s',
    (label) => {
      expect(knownSeamLabels()).toContain(label)
    }
  )

  it.each(Object.keys(OPTIONAL_SEAMS))(
    'Should leave an optional seam out of the required list: %s',
    (label) => {
      expect(knownSeamLabels()).toContain(label)
      expect(REQUIRED_SEAMS).not.toHaveProperty(label)
    }
  )

  it('Should fill every required seam in this suite', () => {
    expect(Object.keys(SEAM_FILLERS)).toEqual(Object.keys(REQUIRED_SEAMS))
  })
})

/**
 * Install this journey in place of the synthetic fixture set.
 *
 * The Vitest global setup wires a journey-neutral fixture (`test/fixtures/`)
 * because the engine and the L2 model must not depend on whichever set is
 * installed. A test that drives one of THIS journey's controllers needs the
 * real thing instead: the evaluator has to recognise the answer keys the
 * controller commits, and the derived page gates read this journey's flow and
 * dispatch index.
 *
 * Vitest gives each file its own module registry, so nothing leaks to another
 * file and there is nothing to restore.
 */
import { configureFulfilmentRegistry } from '../../../../bridge/fulfilment-registry.js'
import { configureObligationSet } from '../../../../model/obligations/manifest.js'
import { configureJourneyFlow } from '../../../../flow/journey-flow.js'
import { buildDispatch } from '../../../../flow/dispatch.js'
import * as highRiskPlantsObligationSet from '../../obligations/index.js'
import { LAYOUT } from './config.js'
import { dispatchPages } from './features/index.js'
import { featureEvaluationBindings } from './features/evaluation.js'
import { FLOW_ONLY_KEYS, sections } from './flow/flow.js'
import { rowStatus, taskRows } from './flow/task-rows.js'
import { nextRunTarget } from './flow/run.js'
import { entryGuardTarget } from './flow/entry-guard.js'
import { sectionCaptionOf } from './flow/section-captions/index.js'

/**
 * A notification whose commodity section is complete: a potato consignment
 * with one line carrying every field its category asks for. Several suites
 * need "the commodities task is done" and would otherwise each hand-build the
 * same line and drift from the manifest as fields land.
 */
export const COMPLETE_POTATO_CONSIGNMENT = Object.freeze({
  commodityType: 'potatoes',
  commodityLines: [
    {
      category: 'seed-potatoes',
      quantity: '250',
      potatoVariety: 'Maris Piper',
      potatoIntendedUse: 'Planting'
    }
  ]
})

export const installHighRiskPlantsJourney = () => {
  configureObligationSet(highRiskPlantsObligationSet)
  configureFulfilmentRegistry(featureEvaluationBindings)
  configureJourneyFlow({
    sections,
    taskRows,
    rowStatus,
    nextRunTarget,
    flowOnlyKeys: FLOW_ONLY_KEYS,
    entryGuardTarget,
    sectionCaption: sectionCaptionOf,
    layout: LAYOUT
  })
  buildDispatch(dispatchPages)
}

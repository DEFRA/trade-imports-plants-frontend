import { evaluationBindings as commodityType } from './commodity-type/evaluation.js'
import { evaluationBindings as commodities } from './commodities/evaluation.js'
import { evaluationBindings as origin } from './origin/evaluation.js'
import { evaluationBindings as arrivalStatus } from './arrival-status/evaluation.js'
import { evaluationBindings as arrivalDetails } from './arrival-details/evaluation.js'

export const featureEvaluationBindings = Object.freeze([
  commodityType,
  commodities,
  origin,
  arrivalStatus,
  arrivalDetails
])

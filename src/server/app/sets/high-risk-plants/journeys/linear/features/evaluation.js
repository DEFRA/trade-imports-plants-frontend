import { evaluationBindings as commodityType } from './commodity-type/evaluation.js'
import { evaluationBindings as commodities } from './commodities/evaluation.js'
import { evaluationBindings as origin } from './origin/evaluation.js'

export const featureEvaluationBindings = Object.freeze([
  commodityType,
  commodities,
  origin
])

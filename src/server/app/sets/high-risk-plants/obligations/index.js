import { arrivalStatus } from './sections/arrival.js'
import {
  category,
  commodityCode,
  commodityLine,
  commodityType,
  eppoCode,
  genus,
  phytosanitaryTreatments,
  potatoIntendedUse,
  potatoVariety,
  quantity,
  sizeOfTree,
  species
} from './sections/commodity.js'
import { countryOfOrigin } from './sections/origin.js'

export {
  arrivalStatus,
  category,
  commodityCode,
  commodityLine,
  commodityType,
  countryOfOrigin,
  eppoCode,
  genus,
  phytosanitaryTreatments,
  potatoIntendedUse,
  potatoVariety,
  quantity,
  sizeOfTree,
  species
}

export const obligations = [
  commodityType,
  commodityLine,
  category,
  genus,
  species,
  commodityCode,
  quantity,
  potatoVariety,
  potatoIntendedUse,
  eppoCode,
  sizeOfTree,
  phytosanitaryTreatments,
  countryOfOrigin,
  arrivalStatus
]

export const groups = obligations.filter((obligation) =>
  obligations.some((other) => other.within === obligation)
)

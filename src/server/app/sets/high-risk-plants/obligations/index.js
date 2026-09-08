import {
  arrivalDate,
  arrivalStatus,
  arrivalTime,
  proposedPlaceOfLanding
} from './sections/arrival.js'
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
  arrivalDate,
  arrivalStatus,
  arrivalTime,
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
  proposedPlaceOfLanding,
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
  arrivalStatus,
  arrivalDate,
  arrivalTime,
  proposedPlaceOfLanding
]

export const groups = obligations.filter((obligation) =>
  obligations.some((other) => other.within === obligation)
)

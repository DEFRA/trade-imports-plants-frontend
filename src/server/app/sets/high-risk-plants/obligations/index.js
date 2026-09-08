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

export {
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
  phytosanitaryTreatments
]

export const groups = obligations.filter((obligation) =>
  obligations.some((other) => other.within === obligation)
)

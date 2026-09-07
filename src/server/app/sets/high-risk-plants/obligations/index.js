import { commodityType } from './sections/commodity.js'

export { commodityType }

export const obligations = [commodityType]

export const groups = obligations.filter((obligation) =>
  obligations.some((other) => other.within === obligation)
)

import { LEVELS } from './levels.js'

const BASE = '/high-risk-plants'
const JOURNEY = `${BASE}/notifications/{journeyId}`

export const PAGE_LEVELS = Object.freeze({
  [BASE]: LEVELS.exploring,
  [`${JOURNEY}/commodity-type`]: LEVELS.exploring,
  [`${JOURNEY}/origin`]: LEVELS.detailing,
  [`${JOURNEY}/arrival-details`]: LEVELS.detailing,
  [`${JOURNEY}/consignment/contact/select`]: LEVELS.exploring,
  [`${JOURNEY}/notification-view`]: LEVELS.exploring,
  [JOURNEY]: LEVELS.detailing,
  [`${JOURNEY}/consignors/select`]: LEVELS.detailing,
  [`${JOURNEY}/declaration`]: LEVELS.detailing,
  [`${JOURNEY}/confirmation`]: LEVELS.detailing
})

export const SECTION_LEVELS = Object.freeze([])

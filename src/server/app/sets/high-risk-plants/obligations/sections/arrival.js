import { includesGate } from '../../../../model/obligations/helpers/index.js'
import { commodityType } from './commodity.js'

// The two commodity types reg 26(2) gives a post-arrival branch. Reg 24A gives
// the potato notification none, so it is never asked. Listed rather than
// derived: journey-spec.json rules arrivalStatus.activatedBy.includes as this
// exact pair, so a commodity type the service starts offering stays out of the
// gate until someone rules it in.
const POST_ARRIVAL_COMMODITY_TYPES = Object.freeze([
  'plants-for-planting',
  'wood-and-cut-trees'
])

const APPLIES_BECAUSE_COMMODITY_TYPE = Object.freeze([
  Object.freeze({
    code: 'obligation.arrivalStatus.applicable.becauseCommodityType',
    explanation:
      'arrivalStatus applies to notifications for plants for planting and for wood and cut trees'
  })
])

/**
 * Whether the consignment has already arrived in Great Britain.
 *
 * The notifier says so rather than the service deriving it from the arrival
 * date: reg 26(2)(a) branches on arrival in the country and reg 26(2)(b) on
 * arrival at the intended destination, and a date alone cannot say which
 * branch a consignment arriving today is in.
 *
 * A top-level scalar gate on a top-level scalar answer, so the whole
 * notification is either asked the question or not — the engine purges the
 * answer when a change of commodity type takes it out of scope.
 */
export const arrivalStatus = {
  id: '6f29c3c3-17e4-45b0-b66d-c89124e395d1',
  name: 'arrivalStatus',
  status: 'mandatory',
  applyTo: includesGate(
    commodityType,
    POST_ARRIVAL_COMMODITY_TYPES,
    {
      inScope: true,
      status: 'mandatory',
      reasons: APPLIES_BECAUSE_COMMODITY_TYPE
    },
    { inScope: false }
  )
}

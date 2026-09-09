import { includesGate } from '../../../../model/obligations/helpers/index.js'
import { commodityType } from './commodity.js'

export const consignor = {
  id: '478148de-8e15-4c44-a435-15f24a1c177b',
  name: 'consignor',
  status: 'mandatory',
  applyTo: includesGate(
    commodityType,
    ['plants-for-planting', 'wood-and-cut-trees'],
    {
      inScope: true,
      status: 'mandatory',
      reasons: [
        {
          code: 'obligation.consignor.applicable.becauseCommodityType',
          explanation:
            'consignor applies to plants for planting and wood and cut trees'
        }
      ]
    },
    { inScope: false }
  )
}

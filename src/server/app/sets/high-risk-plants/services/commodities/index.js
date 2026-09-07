/**
 * The set-owned commodity vocabulary.
 *
 * The service holds values, never the words a page shows for them: a label or
 * a hint is a copy leaf in the feature that renders it. Keeping the values
 * here is what stops a volatile list being retyped into an obligation or a
 * copy module, where nothing would hold the two in step.
 */
const COMMODITY_TYPES = Object.freeze([
  'potatoes',
  'plants-for-planting',
  'wood-and-cut-trees'
])

/**
 * The commodity types a notification may be for, in the order the journey
 * offers them.
 *
 * @returns {readonly string[]} the frozen value list.
 */
export const commodityTypes = () => COMMODITY_TYPES

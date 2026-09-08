/**
 * The set-owned commodity vocabulary.
 *
 * The service holds values, never the words a page shows for them: a label or
 * a hint is a copy leaf in the feature that renders it. Keeping the values
 * here is what stops a volatile list being retyped into an obligation or a
 * copy module, where nothing would hold the two in step.
 */
const EMPTY = Object.freeze([])

const COMMODITY_TYPES = Object.freeze([
  'potatoes',
  'plants-for-planting',
  'wood-and-cut-trees'
])

const SEED_POTATOES = 'seed-potatoes'
const WARE_POTATOES = 'ware-potatoes'
const PLANTS_FOR_PLANTING = 'plants-for-planting'
const TREES_FOR_PLANTING = 'trees-for-planting'
const CONIFER_WOOD_WITH_BARK = 'conifer-wood-with-bark'
const CONIFER_WOOD_WITHOUT_BARK = 'conifer-wood-without-bark'
const CUT_CONIFEROUS_TREES = 'cut-coniferous-trees'
const HARDWOOD_ROUND_SURFACE = 'hardwood-round-surface'
const HARDWOOD_CHIPS = 'hardwood-chips'

const CATEGORIES = Object.freeze([
  SEED_POTATOES,
  WARE_POTATOES,
  PLANTS_FOR_PLANTING,
  TREES_FOR_PLANTING,
  CONIFER_WOOD_WITH_BARK,
  CONIFER_WOOD_WITHOUT_BARK,
  CUT_CONIFEROUS_TREES,
  HARDWOOD_ROUND_SURFACE,
  HARDWOOD_CHIPS
])

const WOOD_CATEGORIES = Object.freeze([
  CONIFER_WOOD_WITH_BARK,
  CONIFER_WOOD_WITHOUT_BARK,
  CUT_CONIFEROUS_TREES,
  HARDWOOD_ROUND_SURFACE,
  HARDWOOD_CHIPS
])

// The nine categories partition by commodity type, so changing the type of a
// notification that already holds lines can keep none of them.
const CATEGORIES_BY_COMMODITY_TYPE = Object.freeze({
  potatoes: Object.freeze([SEED_POTATOES, WARE_POTATOES]),
  'plants-for-planting': Object.freeze([
    PLANTS_FOR_PLANTING,
    TREES_FOR_PLANTING
  ]),
  'wood-and-cut-trees': WOOD_CATEGORIES
})

const CASTANEA = 'Castanea'
const FRAXINUS = 'Fraxinus'
const PLATANUS = 'Platanus'

// The fifteen entries of reg 26(1)(a). Four are species rather than genera;
// the regulation lists them that way and so does this list.
const GENERA = Object.freeze([
  CASTANEA,
  'Cedrus',
  'Coffea',
  FRAXINUS,
  'Lavandula',
  'Nerium oleander',
  'Olea europaea',
  'Picea',
  'Pinus',
  PLATANUS,
  'Polygala myrtifolia',
  'Prunus',
  'Quercus',
  'Salvia rosmarinus',
  'Ulmus'
])

// Hardwood lines are narrowed to the three genera the wood scope names. Every
// other category that asks for a genus offers all fifteen, so the page never
// offers fifteen and then rejects twelve.
const HARDWOOD_GENERA = Object.freeze([CASTANEA, FRAXINUS, PLATANUS])

const GENERA_BY_CATEGORY = Object.freeze({
  [PLANTS_FOR_PLANTING]: GENERA,
  [TREES_FOR_PLANTING]: GENERA,
  [HARDWOOD_ROUND_SURFACE]: HARDWOOD_GENERA,
  [HARDWOOD_CHIPS]: HARDWOOD_GENERA
})

/**
 * Which categories ask for each per-line field, and the order a line's fields
 * are asked in.
 *
 * One list per field, read twice: the obligation's `applyTo` gate scopes the
 * field to these categories, and the entry page renders exactly the fields
 * whose list holds the chosen category. `quantity` names every category
 * because every line carries a quantity — which is why its obligation needs no
 * gate at all.
 */
const CATEGORIES_BY_LINE_FIELD = Object.freeze({
  genus: Object.freeze([
    PLANTS_FOR_PLANTING,
    TREES_FOR_PLANTING,
    HARDWOOD_ROUND_SURFACE,
    HARDWOOD_CHIPS
  ]),
  species: Object.freeze([PLANTS_FOR_PLANTING, TREES_FOR_PLANTING]),
  commodityCode: Object.freeze([
    PLANTS_FOR_PLANTING,
    TREES_FOR_PLANTING,
    ...WOOD_CATEGORIES
  ]),
  potatoVariety: Object.freeze([SEED_POTATOES, WARE_POTATOES]),
  quantity: CATEGORIES,
  potatoIntendedUse: Object.freeze([SEED_POTATOES, WARE_POTATOES]),
  eppoCode: Object.freeze([PLANTS_FOR_PLANTING, TREES_FOR_PLANTING]),
  sizeOfTree: Object.freeze([TREES_FOR_PLANTING, CUT_CONIFEROUS_TREES]),
  phytosanitaryTreatments: WOOD_CATEGORIES
})

const LINE_FIELDS = Object.freeze(Object.keys(CATEGORIES_BY_LINE_FIELD))

/**
 * The commodity types a notification may be for, in the order the journey
 * offers them.
 *
 * @returns {readonly string[]} the frozen value list.
 */
export const commodityTypes = () => COMMODITY_TYPES

/**
 * Every category of goods, in the order the journey offers them.
 *
 * @returns {readonly string[]} the frozen value list.
 */
export const categories = () => CATEGORIES

/**
 * The categories a notification of one commodity type may hold.
 *
 * @param {string} [commodityType] - a commodity-type value.
 * @returns {readonly string[]} the frozen value list, empty for a type the
 * service does not offer.
 */
export const categoriesFor = (commodityType) =>
  Object.hasOwn(CATEGORIES_BY_COMMODITY_TYPE, commodityType)
    ? CATEGORIES_BY_COMMODITY_TYPE[commodityType]
    : EMPTY

/**
 * Every genus the regulation lists, in its order.
 *
 * @returns {readonly string[]} the frozen value list.
 */
export const genera = () => GENERA

/**
 * The genera a line of one category may name.
 *
 * @param {string} [category] - a category value.
 * @returns {readonly string[]} the frozen value list, empty for a category
 * that asks no genus.
 */
export const generaFor = (category) =>
  Object.hasOwn(GENERA_BY_CATEGORY, category)
    ? GENERA_BY_CATEGORY[category]
    : EMPTY

/**
 * Every per-line field, in the order a line's entry page asks for them.
 *
 * @returns {readonly string[]} the frozen field-name list.
 */
export const lineFields = () => LINE_FIELDS

/**
 * The categories on which one per-line field applies — the allow-list its
 * obligation gates on.
 *
 * @param {string} field - a per-line field name.
 * @returns {readonly string[]} the frozen category list, empty for a field the
 * service does not know.
 */
export const categoriesRequiring = (field) =>
  Object.hasOwn(CATEGORIES_BY_LINE_FIELD, field)
    ? CATEGORIES_BY_LINE_FIELD[field]
    : EMPTY

/**
 * The fields a line of one category is asked for, in page order.
 *
 * @param {string} [category] - a category value.
 * @returns {string[]} the field names, empty until a category is chosen.
 */
export const lineFieldsFor = (category) =>
  LINE_FIELDS.filter((field) => categoriesRequiring(field).includes(category))

import {
  createPath,
  dashboardPath,
  pagePath
} from '../../src/server/app/shared/paths.js'
import { commodityTypePage } from '../../src/server/app/sets/high-risk-plants/journeys/linear/features/commodity-type/page.js'
import { commodityDetailsPage } from '../../src/server/app/sets/high-risk-plants/journeys/linear/features/commodities/page.js'

const HTTP_FOUND = 302
const HTTP_OK = 200

const DECLARATION_SLUG = 'declaration'
const CONFIRMATION_SLUG = 'confirmation'
const DECLARATION_VALUE = 'confirmed'

/** The commodity type each use case is for. The step is what gives a seeded
 * notification a committed user answer, which is what admits it past the entry
 * guard when the audit re-fetches its URLs in a session that never walked the
 * journey. */
const commodityTypeStep = (commodityType) => ({
  slug: commodityTypePage.slug,
  fields: { commodityType }
})

/** One commodity line, which the entry sub-page takes in two posts: the
 * category creates the line, and the fields that category asks for are saved
 * against it. Without a line the commodities list has nothing to read back and
 * sends the audit straight on to the entry page. */
const commodityLineSteps = (category, fields) => [
  { slug: commodityDetailsPage.slug, fields: { category } },
  {
    slug: commodityDetailsPage.slug,
    fields: { index: '0', category, ...fields }
  }
]

const POTATO_LINE_FIELDS = {
  potatoVariety: 'Maris Piper',
  quantity: '250',
  potatoIntendedUse: 'Planting'
}

/** The notification shapes the audit needs, keyed by the name the URL list
 * refers to them by. One shape per blueprint use case, so every conditional
 * page has a notification that answers it. Each page increment adds its own
 * step to the shapes whose use case reaches that page. */
export const SEED_SHAPES = {
  warePotatoes: {
    useCase: 'Ware potatoes from Spain or Poland, notified before arrival',
    steps: [
      commodityTypeStep('potatoes'),
      ...commodityLineSteps('ware-potatoes', POTATO_LINE_FIELDS)
    ]
  },
  warePotatoesLate: {
    useCase: 'Ware potatoes from Spain or Portugal, notified after arrival',
    steps: [
      commodityTypeStep('potatoes'),
      ...commodityLineSteps('ware-potatoes', POTATO_LINE_FIELDS)
    ]
  },
  seedPotatoes: {
    useCase:
      'Seed potatoes from any EU country, so an origin outside the four ware countries',
    steps: [
      commodityTypeStep('potatoes'),
      ...commodityLineSteps('seed-potatoes', POTATO_LINE_FIELDS)
    ]
  },
  plantsForPlanting: {
    useCase:
      'Spruce (Picea) from any EU country, with genus, species and EPPO code',
    steps: [
      commodityTypeStep('plants-for-planting'),
      ...commodityLineSteps('plants-for-planting', {
        genus: 'Picea',
        species: 'Picea abies',
        commodityCode: '0602 20 20',
        quantity: '40',
        eppoCode: 'PIEAB'
      })
    ]
  },
  woodWithoutBark: {
    useCase:
      'Conifer wood from Italy, France, Portugal or Spain, with phytosanitary treatments',
    steps: [
      commodityTypeStep('wood-and-cut-trees'),
      ...commodityLineSteps('conifer-wood-without-bark', {
        commodityCode: '4403 21 10',
        quantity: '12',
        phytosanitaryTreatments: 'Kiln dried (KD)'
      })
    ]
  }
}

const fieldsFor = (step, page) =>
  typeof step.fields === 'function' ? step.fields(page) : step.fields

export const journeyIdIn = (location) => {
  const prefix = `${createPath()}/`
  if (!location?.startsWith(prefix)) {
    return ''
  }
  return location.slice(prefix.length).split(/[/?#]/)[0]
}

export const createNotification = async (client) => {
  const dashboard = await client.document(dashboardPath())
  const created = await client.submit(createPath(), {}, dashboard.crumb)
  const journeyId = journeyIdIn(created.location)
  if (created.status !== HTTP_FOUND || !journeyId) {
    throw new Error(
      `Could not create a notification (status ${created.status}, location ${created.location})`
    )
  }
  return journeyId
}

export const fillNotification = async (client, journeyId, shape) => {
  for (const step of shape.steps) {
    const path = pagePath(journeyId, step.slug)
    const page = await client.document(path)
    if (page.status !== HTTP_OK) {
      throw new Error(`Seed step ${step.slug} did not render (${page.status})`)
    }
    const posted = await client.submit(path, fieldsFor(step, page), page.crumb)
    if (posted.status !== HTTP_FOUND) {
      throw new Error(
        `Seed step ${step.slug} was rejected (${posted.status}) — the page's ` +
          'fields have moved on from what this seed sends'
      )
    }
  }
}

export const submitNotification = async (client, journeyId) => {
  const path = pagePath(journeyId, DECLARATION_SLUG)
  const page = await client.document(path)
  const posted = await client.submit(
    path,
    { declaration: DECLARATION_VALUE },
    page.crumb
  )
  const confirmation = pagePath(journeyId, CONFIRMATION_SLUG)
  if (posted.location !== confirmation) {
    throw new Error(
      `Declaration did not submit the notification (went to ${posted.location}, ` +
        `expected ${confirmation})`
    )
  }
}

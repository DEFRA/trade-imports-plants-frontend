import {
  createPath,
  dashboardPath,
  pagePath
} from '../../src/server/app/shared/paths.js'
import { commodityTypePage } from '../../src/server/app/sets/high-risk-plants/journeys/linear/features/commodity-type/page.js'

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

/** The notification shapes the audit needs, keyed by the name the URL list
 * refers to them by. One shape per blueprint use case, so every conditional
 * page has a notification that answers it. Each page increment adds its own
 * step to the shapes whose use case reaches that page. */
export const SEED_SHAPES = {
  warePotatoes: {
    useCase: 'Ware potatoes from Spain or Poland, notified before arrival',
    steps: [commodityTypeStep('potatoes')]
  },
  warePotatoesLate: {
    useCase: 'Ware potatoes from Spain or Portugal, notified after arrival',
    steps: [commodityTypeStep('potatoes')]
  },
  seedPotatoes: {
    useCase:
      'Seed potatoes from any EU country, so an origin outside the four ware countries',
    steps: [commodityTypeStep('potatoes')]
  },
  plantsForPlanting: {
    useCase:
      'Spruce (Picea) from any EU country, with genus, species and EPPO code',
    steps: [commodityTypeStep('plants-for-planting')]
  },
  woodWithoutBark: {
    useCase:
      'Conifer wood from Italy, France, Portugal or Spain, with phytosanitary treatments',
    steps: [commodityTypeStep('wood-and-cut-trees')]
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

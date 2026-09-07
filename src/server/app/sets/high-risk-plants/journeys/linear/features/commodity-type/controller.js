import { dashboardPath, hubPath } from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import * as state from '../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../lib/http-status.js'
import {
  compose,
  requiredOneOf,
  validate
} from '../../../../../../lib/validate/index.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import * as commodities from '../../../../services/commodities/index.js'
import { hasCommittedNotificationAnswers } from '../../flow/entry-guard.js'
import {
  PLANTS_WOOD_DAYS_AFTER_ARRIVAL,
  POTATO_DAYS_BEFORE_ARRIVAL
} from '../timing-windows.js'
import { commodityTypePage as page } from './page.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

export const meta = { ...page, collects: ['commodityType'] }

const view = `${TEMPLATES}/features/commodity-type/template`

const copy = copyFor({ en, cy })

// Which timing window each type's hint quotes. The number itself is the
// constants module's; this map only says which of the two applies.
const HINT_DAYS = {
  potatoes: POTATO_DAYS_BEFORE_ARRIVAL,
  'plants-for-planting': PLANTS_WOOD_DAYS_AFTER_ARRIVAL,
  'wood-and-cut-trees': PLANTS_WOOD_DAYS_AFTER_ARRIVAL
}

const fields = () =>
  compose(
    requiredOneOf(
      'commodityType',
      commodities.commodityTypes(),
      copy.errors.commodityType
    )
  )

const typeOptions = (selected) =>
  commodities.commodityTypes().map((value) => ({
    value,
    text: copy.typeLabels[value],
    hint: { text: copy.typeHints[value](HINT_DAYS[value]) },
    checked: value === selected
  }))

// The one page in the journey whose back link is told by what has been saved:
// a notification with nothing committed has no overview worth returning to,
// so it goes back to the dashboard instead.
const backLinkFor = (journey, answers) =>
  hasCommittedNotificationAnswers(answers)
    ? hubPath(journey.journeyId)
    : dashboardPath()

const render = (
  h,
  journey,
  values,
  errors = {},
  answers = values,
  recoverableError = false
) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: backLinkFor(journey, answers),
      journey,
      page,
      recoverableError
    }),
    copy,
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    typeOptions: typeOptions(values.commodityType)
  })

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  return render(
    h,
    journey,
    { commodityType: answers.commodityType ?? '' },
    {},
    answers
  )
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const values = { commodityType: payload.commodityType ?? '' }
  const { errors, value } = validate(fields(), payload)
  if (errors) {
    const { journey, answers } = await state.get(request, h)
    return render(h, journey, values, errors, answers).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }

  let committed
  const { failure } = await kit.recoverableSave(
    async () => {
      committed = await state.commit(request, h, {
        commodityType: value.commodityType
      })
    },
    async () => {
      const { journey, answers } = await state.get(request, h)
      return render(h, journey, values, {}, answers, true).code(
        HTTP_STATUS_INTERNAL_SERVER_ERROR
      )
    }
  )
  if (failure) {
    return failure
  }

  return h.redirect(await kit.nextTarget(request, page, committed.scope))
}

export const routes = kit.pageRoutes(page, { get, post })

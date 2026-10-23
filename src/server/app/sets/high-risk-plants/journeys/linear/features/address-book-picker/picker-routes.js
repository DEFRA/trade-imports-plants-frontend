import * as state from '../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../lib/http-status.js'
import * as kit from '../../../../../../shared/kit.js'
import { hubPath } from '../../../../../../shared/paths.js'
import { answerForPickedParty } from '../../parties/picked-party.js'
import { renderPicker } from './render.js'
import { resolveSelectionOnSave, SELECTION } from './save-selection.js'

const FIRST_PAGE = 1
const SEARCH_ACTION = 'search'

const parsePageNumber = (value) => {
  const number = Number.parseInt(value, 10)
  return Number.isNaN(number) ? FIRST_PAGE : number
}

const isSearch = (payload) => payload.action === SEARCH_ACTION

const logOutOfScope = (request, fieldName) =>
  kit.logRefusal(request, { reason: `${fieldName}-out-of-scope` })

const postedPageState = (payload, extra) => ({
  query: payload.q ?? '',
  page: parsePageNumber(payload.page),
  ...extra
})

/**
 * The GET and POST routes of one address-book picker page.
 *
 * @param {object} picker
 * @param {object} picker.page - the page's id and slug.
 * @param {string} picker.fieldName - the answer name the page collects.
 * @param {object} picker.copy - the page's resolved copy bundle.
 * @param {Function} picker.pickerViewModel - the page's bound view model.
 * @param {Function} picker.heading - gives the question, as this page asks it, from the journey state.
 * @param {Function} picker.description - gives the text under the question from the journey state.
 * @param {Function} [picker.inScope] - tells from the journey state whether the page applies; out of scope it redirects to the overview.
 * @returns {object[]} the Hapi routes.
 */
export const pickerRoutes = ({
  page,
  fieldName,
  copy,
  pickerViewModel,
  heading,
  description,
  inScope = () => true
}) => {
  const render = (request, h, current, pageState) =>
    renderPicker(request, h, current, pageState, {
      page,
      copy,
      fieldName,
      pickerViewModel,
      heading: heading(current),
      description: description(current)
    })

  const redirectOutOfScope = (request, h, current) => {
    logOutOfScope(request, fieldName)
    return h.redirect(hubPath(current.journey.journeyId))
  }

  const renderNotInBook = async (request, h, current, payload) =>
    (
      await render(
        request,
        h,
        current,
        postedPageState(payload, {
          selectedId: '',
          error: copy.errors[fieldName]
        })
      )
    ).code(HTTP_STATUS_BAD_REQUEST)

  const commitSelection = async (request, h, current, chosen, payload) => {
    let committed
    const { failure } = await kit.recoverableSave(
      request,
      async () => {
        committed = await state.commit(request, h, {
          [fieldName]: answerForPickedParty(chosen)
        })
      },
      async () =>
        (
          await render(
            request,
            h,
            current,
            postedPageState(payload, {
              selectedId: chosen.id,
              recoverableError: true
            })
          )
        ).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    )
    return (
      failure ??
      h.redirect(await kit.nextTarget(request, page, committed.scope))
    )
  }

  const get = async (request, h) => {
    const current = await state.get(request, h)
    if (!inScope(current)) {
      return redirectOutOfScope(request, h, current)
    }
    return render(request, h, current, {
      query: request.query.q ?? '',
      page: parsePageNumber(request.query.page),
      selectedId:
        request.query.selected ?? current.answers[fieldName]?.pickedFromId
    })
  }

  const post = async (request, h) => {
    const payload = request.payload ?? {}
    const current = await state.get(request, h)
    if (!inScope(current)) {
      return redirectOutOfScope(request, h, current)
    }

    const selectedId = payload[fieldName] || payload.selected || ''
    if (isSearch(payload)) {
      return render(request, h, current, {
        query: payload.q ?? '',
        page: FIRST_PAGE,
        selectedId
      })
    }

    const selection = await resolveSelectionOnSave(request, {
      fieldName,
      selectedId,
      notInBookMessage: copy.errors[fieldName]
    })
    if (selection.outcome === SELECTION.nothingChosen) {
      return h.redirect(await kit.nextTarget(request, page, current.scope))
    }
    if (selection.outcome === SELECTION.notInBook) {
      return renderNotInBook(request, h, current, payload)
    }
    return commitSelection(request, h, current, selection.record, payload)
  }

  return kit.pageRoutes(page, { get, post })
}

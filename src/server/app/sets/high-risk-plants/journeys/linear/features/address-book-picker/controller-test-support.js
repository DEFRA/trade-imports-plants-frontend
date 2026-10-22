import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'
import { load } from 'cheerio'

import { SET_ID } from '../../../../set.js'
import { config } from '../../../../../../../../config/config.js'
import { nunjucksConfig } from '../../../../../../../../config/nunjucks/nunjucks.js'
import { store } from '../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { records as realRecords } from '../../../../../../services/persistence/records/real/index.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import {
  driveHandler,
  expectOneRefusalLogged
} from '../../../../../../engine/test-support.js'
import { hubPath } from '../../../../../../shared/paths.js'
import { SURFACES } from '../../../../../../shared/kit.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../lib/http-status.js'
import { STUB_BOOK } from '../../../../../../services/address-book/stub/index.js'
import { answerForPickedParty } from '../../parties/picked-party.js'
import { installHighRiskPlantsJourney } from '../../test-support.js'
import { copy as pickerCopy } from './copy/copy.en.js'
import {
  bookHoldingADeletedRecord,
  DELETED_ID,
  NOT_IN_THE_BOOK
} from './test-support.js'

const PAGE_SIZE = 5
const STUB_BOOK_SIZE = 13
const LAST_PAGE = 3
const DENMARK = 'Denmark'
const DENMARK_ROWS = ['copenhagen-exports-aps', 'aarhus-trading-aps']
const MATCHES_NOTHING = 'nothing matches this'
const TECH_IMPORTS = 'tech-imports-ltd'
const TECH_IMPORTS_NAME = 'Tech Imports Ltd'
const IMPORT_CO = 'import-co-uk'
const ALPINE = 'alpine-supplies-gmbh'
const EDITED_NAME = 'Tech Imports (UK) Ltd'
const MARKUP_IN_A_NAME = '</span><a href="https://evil.example">x</a><span>'
const MARKUP_LINK = '<a href="https://evil.example"'

export const copied = (id) =>
  answerForPickedParty(STUB_BOOK.find((record) => record.id === id))

export const installStubs = () => {
  configureRecords(SET_ID, recordsStub)
  configureSession(SET_ID, sessionStub)
  installHighRiskPlantsJourney()
}

const rowIds = (result) => result.view.context.picker.rows.map((row) => row.id)

export const checkedId = (result) =>
  result.view.context.picker.rows.find((row) => row.checked)?.id

const pickedFrom = (id) => ({ ...copied(TECH_IMPORTS), pickedFromId: id })

const savedWithFor =
  ({ post, seed }) =>
  (payload, answers) =>
    driveHandler(post, { seed: seed(answers), payload })

const renderPageFor = (template) => (context) =>
  nunjucksConfig.options.compileOptions.environment.render(template, {
    userSession: { isAuthenticated: true },
    getAssetPath: (asset) => `/assets/${asset}`,
    ...context
  })

const describePageServed = ({ pickerName, get, seed }) => {
  describe(`GET ${pickerName} — the page it serves`, () => {
    beforeAll(installStubs)
    beforeEach(() => store.clear())

    it('Should render the results table on the full-width surface', async () => {
      const result = await driveHandler(get, { seed: seed() })

      expect(result.view.context.contentColumnClass).toBe(SURFACES.display)
    })

    it('Should send Back to the overview and raise no error summary', async () => {
      const result = await driveHandler(get, { seed: seed() })

      expect(result.view.context.backLink).toBe(hubPath(result.journeyId))
      expect(result.view.context.errorSummary).toBeNull()
    })

    it('Should show the first page of the organisation book, counted against the whole', async () => {
      const result = await driveHandler(get, { seed: seed() })

      expect(result.view.context.picker.rows).toHaveLength(PAGE_SIZE)
      expect(result.view.context.picker.resultsCount).toBe(
        pickerCopy.resultsCount(PAGE_SIZE, STUB_BOOK_SIZE)
      )
      expect(result.view.context.picker.page).toBe(1)
    })

    it('Should narrow the rows to the search term in the query string', async () => {
      const result = await driveHandler(get, {
        seed: seed(),
        query: { q: DENMARK }
      })

      expect(rowIds(result)).toEqual(DENMARK_ROWS)
      expect(result.view.context.picker.query).toBe(DENMARK)
    })

    it('Should show the page the query string asks for', async () => {
      const result = await driveHandler(get, {
        seed: seed(),
        query: { page: String(LAST_PAGE) }
      })

      expect(result.view.context.picker.page).toBe(LAST_PAGE)
      expect(rowIds(result)).toContain(ALPINE)
    })

    it('Should list no rows and no paging when nothing matches', async () => {
      const result = await driveHandler(get, {
        seed: seed(),
        query: { q: MATCHES_NOTHING }
      })

      expect(result.view.context.picker.rows).toEqual([])
      expect(result.view.context.picker.pagination).toBeNull()
    })
  })
}

const describeSelectionShown = ({
  pickerName,
  template,
  get,
  seed,
  fieldName
}) => {
  const renderPage = renderPageFor(template)

  describe(`GET ${pickerName} — the selection it shows`, () => {
    beforeAll(installStubs)
    beforeEach(() => store.clear())

    it('Should tick the record the copy was picked from', async () => {
      const result = await driveHandler(get, {
        seed: seed({ [fieldName]: copied(TECH_IMPORTS) })
      })

      expect(checkedId(result)).toBe(TECH_IMPORTS)
      expect(result.view.context.picker.tickedRecord.name).toBe(
        TECH_IMPORTS_NAME
      )
    })

    it('Should carry a selection the query string names over the stored one', async () => {
      const result = await driveHandler(get, {
        seed: seed({ [fieldName]: copied(TECH_IMPORTS) }),
        query: { selected: IMPORT_CO }
      })

      expect(checkedId(result)).toBe(IMPORT_CO)
    })

    it('Should show no selection for a record the book no longer holds', async () => {
      const result = await driveHandler(get, {
        seed: seed({ [fieldName]: pickedFrom(NOT_IN_THE_BOOK) })
      })

      expect(result.view.context.picker.tickedRecord).toBeUndefined()
      expect(checkedId(result)).toBeUndefined()
    })

    it('Should escape a record name rather than render it as markup', async () => {
      const result = await driveHandler(get, { seed: seed() })
      const { picker } = result.view.context

      const html = renderPage({
        ...result.view.context,
        picker: {
          ...picker,
          rows: [{ ...picker.rows[0], name: MARKUP_IN_A_NAME }]
        }
      })

      expect(html).toContain('&lt;a href=')
      expect(html).not.toContain(MARKUP_LINK)
    })
  })
}

const describeSearching = (picker) => {
  const { pickerName, fieldName } = picker
  const savedWith = savedWithFor(picker)

  describe(`POST ${pickerName} — searching`, () => {
    beforeAll(installStubs)
    beforeEach(() => store.clear())

    it('Should re-render the narrowed results without committing anything', async () => {
      const result = await savedWith({ action: 'search', q: DENMARK })

      expect(rowIds(result)).toEqual(DENMARK_ROWS)
      expect(result.after[fieldName]).toBeUndefined()
      expect(result.view.context.errorSummary).toBeNull()
    })

    it('Should start a new search at the first page', async () => {
      const result = await savedWith({
        action: 'search',
        q: '',
        page: String(LAST_PAGE)
      })

      expect(result.view.context.picker.page).toBe(1)
    })

    it('Should keep a row already ticked while the results change', async () => {
      const result = await savedWith({
        action: 'search',
        q: 'Imports',
        selected: TECH_IMPORTS
      })

      expect(checkedId(result)).toBe(TECH_IMPORTS)
    })
  })
}

const describeNothingChosen = (picker) => {
  const { pickerName, fieldName } = picker
  const savedWith = savedWithFor(picker)

  describe(`POST ${pickerName} — a save with nothing chosen`, () => {
    beforeAll(installStubs)
    beforeEach(() => store.clear())

    it('Should move on to the overview, committing nothing and raising no error', async () => {
      const result = await savedWith({ action: 'save' })

      expect(result.view).toBeUndefined()
      expect(result.after[fieldName]).toBeUndefined()
      expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
    })

    it('Should move on from Save and return to overview, committing nothing', async () => {
      const result = await savedWith({ exit: 'hub' })

      expect(result.after[fieldName]).toBeUndefined()
      expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
    })

    it('Should keep a copy already held, edited since it was picked', async () => {
      const edited = { ...copied(TECH_IMPORTS), name: EDITED_NAME }
      delete edited.pickedFromId

      const result = await savedWith(
        { action: 'save' },
        { [fieldName]: edited }
      )

      expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
      expect(result.after[fieldName]).toEqual(edited)
    })
  })
}

const describeAddressNotInTheBook = (pickerConfig) => {
  const { pickerName, template, fieldName, errorText } = pickerConfig
  const renderPage = renderPageFor(template)
  const savedWith = savedWithFor(pickerConfig)

  describe(`POST ${pickerName} — an address the book does not hold`, () => {
    beforeAll(installStubs)
    beforeEach(() => store.clear())

    it('Should refuse the id, linking the error to the first row and describing the group by it', async () => {
      const result = await savedWith({
        action: 'save',
        [fieldName]: NOT_IN_THE_BOOK
      })

      expect(result.response.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
      expect(result.view.context.picker.error).toBe(errorText)
      expect(result.view.context.errorSummary.errorList).toEqual([
        { text: errorText, href: `#${fieldName}` }
      ])
      const $ = load(renderPage(result.view.context))
      expect($(`#${fieldName}-error`)).toHaveLength(1)
      expect(
        $(`#${fieldName}`).closest('fieldset').attr('aria-describedby')
      ).toBe(`${fieldName}-error`)
      expect(result.after[fieldName]).toBeUndefined()
      expectOneRefusalLogged(result.logger, {
        journeyId: result.journeyId,
        errorCodes: [fieldName],
        reason: 'not-in-address-book',
        addressId: NOT_IN_THE_BOOK
      })
    })

    it('Should refuse the id on Save and return to overview too', async () => {
      const result = await savedWith({
        exit: 'hub',
        [fieldName]: NOT_IN_THE_BOOK
      })

      expect(result.response.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
      expect(result.after[fieldName]).toBeUndefined()
    })

    it('Should refuse a source record id posted back once the book no longer holds it, committing nothing', async () => {
      const result = await savedWith(
        { action: 'save', [fieldName]: 'gone' },
        { [fieldName]: pickedFrom('gone') }
      )

      expect(result.response.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
      expect(result.view.context.picker.error).toBe(errorText)
      expect(result.after).toEqual(result.before)
    })
  })
}

const describeRefusalKeepsSearchAndPage = (pickerConfig) => {
  const { pickerName, fieldName, errorText } = pickerConfig
  const savedWith = savedWithFor(pickerConfig)

  describe(`POST ${pickerName} — a refused save keeps the search and page`, () => {
    beforeAll(installStubs)
    beforeEach(() => store.clear())

    it('Should keep the refused search term so the results are still there', async () => {
      const result = await savedWith({
        action: 'save',
        q: DENMARK,
        [fieldName]: NOT_IN_THE_BOOK
      })

      expect(result.view.context.picker.query).toBe(DENMARK)
      expect(rowIds(result)).toEqual(DENMARK_ROWS)
    })

    it('Should point the refusal at the search box when the search found nothing', async () => {
      const result = await savedWith({
        action: 'save',
        q: MATCHES_NOTHING,
        [fieldName]: NOT_IN_THE_BOOK
      })

      expect(result.view.context.errorSummary.errorList).toEqual([
        { text: errorText, href: '#q' }
      ])
    })

    it('Should re-render the page the refusal was made on and link it to that page’s first row', async () => {
      const result = await savedWith({
        action: 'save',
        page: String(LAST_PAGE),
        [fieldName]: NOT_IN_THE_BOOK
      })

      const { picker, errorSummary } = result.view.context
      expect(result.response.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
      expect(picker.page).toBe(LAST_PAGE)
      expect(rowIds(result)).toContain(ALPINE)
      expect(picker.rows[0].idPrefix).toBe(fieldName)
      expect(errorSummary.errorList[0].href).toBe(`#${picker.rows[0].idPrefix}`)
    })
  })
}

const describeDeletedRecord = (picker) => {
  const { pickerName, get, seed, fieldName, errorText } = picker
  const savedWith = savedWithFor(picker)

  describe(`${pickerName} — a record the organisation has deleted`, () => {
    const originalMode = config.get('stubMode')

    beforeAll(installStubs)

    beforeEach(async () => {
      await store.clear()
      config.set('stubMode', false)
      vi.stubGlobal('fetch', bookHoldingADeletedRecord())
    })

    afterEach(() => {
      config.set('stubMode', originalMode)
      vi.unstubAllGlobals()
    })

    it('Should show no selection for a record deleted since it was chosen', async () => {
      const result = await driveHandler(get, {
        seed: seed({ [fieldName]: pickedFrom(DELETED_ID) })
      })

      expect(result.view.context.picker.tickedRecord).toBeUndefined()
      expect(checkedId(result)).toBeUndefined()
    })

    it('Should refuse a save naming a record the organisation has deleted', async () => {
      const result = await savedWith({
        action: 'save',
        [fieldName]: DELETED_ID
      })

      expect(result.response.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
      expect(result.view.context.errorSummary.errorList).toEqual([
        { text: errorText, href: `#${fieldName}` }
      ])
      expect(result.after[fieldName]).toBeUndefined()
    })
  })
}

const describeAcceptedAnswers = (picker) => {
  const { pickerName, get, fieldName } = picker
  const savedWith = savedWithFor(picker)

  describe(`POST ${pickerName} — accepted answers`, () => {
    beforeAll(installStubs)
    beforeEach(() => store.clear())

    it('Should commit a copy of the chosen record and move on to the overview', async () => {
      const result = await savedWith({
        action: 'save',
        [fieldName]: TECH_IMPORTS
      })

      expect(result.after[fieldName]).toEqual(copied(TECH_IMPORTS))
      expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
    })

    it('Should accept the row carried in the hidden field when no radio is posted', async () => {
      const result = await savedWith({ action: 'save', selected: ALPINE })

      expect(result.after[fieldName]).toEqual(copied(ALPINE))
    })

    it('Should honour Save and return to overview', async () => {
      const result = await savedWith({ [fieldName]: TECH_IMPORTS, exit: 'hub' })

      expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
      expect(result.after[fieldName]).toEqual(copied(TECH_IMPORTS))
    })

    it('Should replace a copy already held rather than keeping both', async () => {
      const result = await savedWith(
        { action: 'save', [fieldName]: IMPORT_CO },
        { [fieldName]: copied(TECH_IMPORTS) }
      )

      expect(result.after[fieldName]).toEqual(copied(IMPORT_CO))
    })

    it('Should tick the committed copy on the next GET', async () => {
      const saved = await savedWith({
        action: 'save',
        [fieldName]: TECH_IMPORTS
      })

      const result = await driveHandler(get, { seed: saved.after })

      expect(checkedId(result)).toBe(TECH_IMPORTS)
    })
  })
}

const describeSaveFailures = (picker) => {
  const { pickerName, fieldName } = picker
  const savedWith = savedWithFor(picker)

  describe(`POST ${pickerName} — save failures`, () => {
    beforeAll(installStubs)

    beforeEach(async () => {
      await store.clear()
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => ({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable'
        }))
      )
    })

    afterEach(() => {
      configureRecords(SET_ID, recordsStub)
      vi.unstubAllGlobals()
    })

    const holdsThePostedParty = (fulfilment) =>
      JSON.stringify(fulfilment).includes(TECH_IMPORTS)

    const failingOnControllerCommit = (failure) => {
      configureRecords(SET_ID, {
        ...recordsStub,
        replaceFulfilment: (journeyId, fulfilment, ...rest) =>
          holdsThePostedParty(fulfilment)
            ? failure(journeyId, fulfilment, ...rest)
            : recordsStub.replaceFulfilment(journeyId, fulfilment, ...rest)
      })
    }

    it('Should re-render a backend request failure at 500 with the banner and the selection', async () => {
      failingOnControllerCommit(realRecords.replaceFulfilment)

      const result = await savedWith({
        action: 'save',
        [fieldName]: TECH_IMPORTS
      })

      expect(result.response.statusCode).toBe(HTTP_STATUS_INTERNAL_SERVER_ERROR)
      expect(result.view.context.recoverableError).toBe(true)
      expect(checkedId(result)).toBe(TECH_IMPORTS)
    })

    it('Should rethrow a programming error rather than re-rendering the page', async () => {
      failingOnControllerCommit(async () => {
        throw new TypeError('programming failure')
      })

      await expect(
        savedWith({ action: 'save', [fieldName]: TECH_IMPORTS })
      ).rejects.toThrow(new TypeError('programming failure'))
    })
  })
}

/**
 * Declares the controller tests every address picker shares, driving the
 * page's real handlers against the stub address book.
 *
 * @param {object} picker
 * @param {string} picker.pickerName - names the picker in the group titles
 * @param {string} picker.template - the page template, as the view engine resolves it
 * @param {Function} picker.get - the picker's GET handler
 * @param {Function} picker.post - the picker's POST handler
 * @param {(answers?: object) => object} picker.seed - the answers a notification opens the picker with
 * @param {string} picker.fieldName - the answer name the page collects
 * @param {string} picker.errorText - the error shown for an address not in the book
 */
export const describeAddressBookPickerController = (picker) => {
  describePageServed(picker)
  describeSelectionShown(picker)
  describeSearching(picker)
  describeNothingChosen(picker)
  describeAddressNotInTheBook(picker)
  describeRefusalKeepsSearchAndPage(picker)
  describeDeletedRecord(picker)
  describeAcceptedAnswers(picker)
  describeSaveFailures(picker)
}

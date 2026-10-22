import {
  ADDRESS_BOOK_PARTY,
  ALPINE,
  CHECK_ANSWERS_URL,
  COPENHAGEN,
  DENMARK,
  IMPORT_CO,
  MATCHES_NOTHING,
  NOT_IN_THE_BOOK,
  SECOND_PAGE_LINK,
  STUB_BOOK_SIZE,
  addressRowRadio,
  backLink,
  describeSubmittedSearchPicker,
  expectNoSeriousOrCriticalViolations,
  expectPickerResultsLayout,
  expectSelectedAddressCarriedToSecondPage,
  expectThreeSaveControls,
  pickerResultsSummary,
  postAnIdNotInTheBook,
  saveAndContinue,
  selectedAddressInset,
  startWoodNotificationWithOriginSaved
} from '../../../../../../../../../fit/high-risk-plants-journey.js'
import { BASE } from '../../../../../../../../../fit/set-base.js'
import { expect, test } from '@playwright/test'

import { signIn } from '../../../../../../../../../fit/sign-in.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { PAGE_SIZE } from '../../../../../../services/address-book/index.js'
import { copy as captionCopy } from '../../flow/section-captions/copy/copy.en.js'
import { copy as checkAnswersCopy } from '../check-answers/copy/copy.en.js'
import { copy as hubCopy } from '../hub/copy/copy.en.js'
import { copy as pickerCopy } from '../address-book-picker/copy/copy.en.js'
import { copy } from './copy/copy.en.js'

const HUB_URL = /\/notifications\/[^/]+$/
const PAGE_URL = /\/notifications\/[^/]+\/consignment\/contact\/select/

const saveAndReturn = (page) =>
  page.getByRole('button', {
    name: sharedCopy.saveActions.saveAndReturnToHub
  })

const errorSummaryLink = (page) =>
  page
    .getByRole('alert')
    .getByRole('link', { name: copy.errors.contactAddress })

const contactPathOf = (reference) =>
  `${BASE}/notifications/${reference}/consignment/contact/select`

const contactRow = (page) =>
  page.getByRole('listitem').filter({
    has: page.getByRole('link', {
      name: hubCopy.rows.contact.title,
      exact: true
    })
  })

const startInTheRunAtContact = async (page) => {
  const reference = await startWoodNotificationWithOriginSaved(page)
  await page.goto(contactPathOf(reference))
  await expect(page).toHaveURL(PAGE_URL)
  return reference
}

const startAtContact = async (page) => {
  const reference = await startInTheRunAtContact(page)
  await page.goto(`${BASE}/notifications/${reference}`)
  await expect(page).toHaveURL(HUB_URL)
  await page.goto(contactPathOf(reference))
  await expect(page).toHaveURL(PAGE_URL)
  return reference
}

describeSubmittedSearchPicker({
  pickerName: 'consignment contact',
  openPicker: startAtContact
})

test.describe('consignment-contact-select feature', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('renders the heading, the description and the search box', async ({
    page
  }) => {
    await startAtContact(page)

    await expect(
      page.getByRole('heading', { name: copy.title, level: 1 })
    ).toBeVisible()
    await expect(
      page.getByText(captionCopy.sections.consignmentParties, { exact: true })
    ).toHaveCount(0)
    await expect(
      page.getByText(copy.description, { exact: true })
    ).toBeVisible()
    await expect(
      page.getByLabel(pickerCopy.search.label, { exact: true })
    ).toBeVisible()
    await expect(
      page.getByText(pickerCopy.search.hint, { exact: true })
    ).toBeVisible()
  })

  test('is reachable from the overview contact task row', async ({ page }) => {
    const reference = await startAtContact(page)
    await page.goto(`${BASE}/notifications/${reference}`)

    await page
      .getByRole('link', { name: hubCopy.rows.contact.title, exact: true })
      .click()

    await expect(page).toHaveURL(PAGE_URL)
  })

  test('shows the first page of the organisation address book with its count', async ({
    page
  }) => {
    await startAtContact(page)

    await expectPickerResultsLayout(
      page,
      pickerCopy.resultsCount(PAGE_SIZE, STUB_BOOK_SIZE)
    )
    await expect(addressRowRadio(page, ADDRESS_BOOK_PARTY)).toBeVisible()
    await expect(addressRowRadio(page, ALPINE)).toHaveCount(0)
    await expect(
      page.getByRole('link', { name: SECOND_PAGE_LINK, exact: true })
    ).toBeVisible()
  })

  test('offers the three save controls', async ({ page }) => {
    await startAtContact(page)

    await expectThreeSaveControls(page)
  })

  test('sends Back to the overview', async ({ page }) => {
    const reference = await startAtContact(page)

    await expect(backLink(page)).toHaveAttribute(
      'href',
      `${BASE}/notifications/${reference}`
    )
    await backLink(page).click()
    await expect(page).toHaveURL(HUB_URL)
  })

  test('narrows the results to the search term', async ({ page }) => {
    await startAtContact(page)

    await page
      .getByLabel(pickerCopy.search.label, { exact: true })
      .fill(DENMARK)
    await page.getByRole('button', { name: pickerCopy.search.button }).click()

    await expect(addressRowRadio(page, COPENHAGEN)).toBeVisible()
    await expect(addressRowRadio(page, ADDRESS_BOOK_PARTY)).toHaveCount(0)
  })

  test('says so rather than showing an empty table when nothing matches', async ({
    page
  }) => {
    await startAtContact(page)

    await page
      .getByLabel(pickerCopy.search.label, { exact: true })
      .fill(MATCHES_NOTHING)
    await page.getByRole('button', { name: pickerCopy.search.button }).click()

    await expect(pickerResultsSummary(page)).toHaveText(pickerCopy.noMatches)
  })

  test('keeps a ticked row while the search narrows the results', async ({
    page
  }) => {
    await startAtContact(page)

    await addressRowRadio(page, ADDRESS_BOOK_PARTY).check()
    await page
      .getByLabel(pickerCopy.search.label, { exact: true })
      .fill(DENMARK)
    await page.getByRole('button', { name: pickerCopy.search.button }).click()

    await expect(selectedAddressInset(page, ADDRESS_BOOK_PARTY)).toBeVisible()
  })

  test('carries a saved address through the paging links', async ({ page }) => {
    const reference = await startAtContact(page)
    await addressRowRadio(page, ADDRESS_BOOK_PARTY).check()
    await saveAndContinue(page).click()
    await page.goto(contactPathOf(reference))

    await expectSelectedAddressCarriedToSecondPage(page)
  })

  test('carries a newly ticked address through the paging links', async ({
    page
  }) => {
    await startAtContact(page)
    await addressRowRadio(page, ADDRESS_BOOK_PARTY).check()

    await expectSelectedAddressCarriedToSecondPage(page)
  })
})

test.describe('consignment-contact-select — saving an address', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('saves the chosen address, returns to the overview with the row complete and shows it again on return', async ({
    page
  }) => {
    const reference = await startAtContact(page)

    await addressRowRadio(page, ADDRESS_BOOK_PARTY).check()
    await saveAndContinue(page).click()

    await expect(page).toHaveURL(HUB_URL)
    await expect(contactRow(page)).toContainText(hubCopy.statuses.completed)

    await page.goto(contactPathOf(reference))
    await expect(addressRowRadio(page, ADDRESS_BOOK_PARTY)).toBeChecked()
    await expect(selectedAddressInset(page, ADDRESS_BOOK_PARTY)).toBeVisible()
  })

  test('a row ticked on the second page saves, and re-entering shows it as the selected address', async ({
    page
  }) => {
    const reference = await startAtContact(page)
    await page
      .getByRole('link', { name: SECOND_PAGE_LINK, exact: true })
      .click()
    await expect(addressRowRadio(page, COPENHAGEN)).toBeVisible()

    await addressRowRadio(page, COPENHAGEN).check()
    await saveAndContinue(page).click()

    await expect(page).toHaveURL(HUB_URL)
    await expect(contactRow(page)).toContainText(hubCopy.statuses.completed)

    await page.goto(contactPathOf(reference))
    await expect(selectedAddressInset(page, COPENHAGEN)).toBeVisible()
    await expect(addressRowRadio(page, COPENHAGEN)).toHaveCount(0)
  })

  test('replaces the address already saved rather than keeping both', async ({
    page
  }) => {
    const reference = await startAtContact(page)
    await addressRowRadio(page, ADDRESS_BOOK_PARTY).check()
    await saveAndContinue(page).click()
    await page.goto(contactPathOf(reference))

    await addressRowRadio(page, IMPORT_CO).check()
    await saveAndContinue(page).click()
    await page.goto(contactPathOf(reference))

    await expect(addressRowRadio(page, IMPORT_CO)).toBeChecked()
    await expect(addressRowRadio(page, ADDRESS_BOOK_PARTY)).not.toBeChecked()
  })

  test('Save and return to overview saves the address and reaches the overview', async ({
    page
  }) => {
    const reference = await startAtContact(page)

    await addressRowRadio(page, ADDRESS_BOOK_PARTY).check()
    await saveAndReturn(page).click()

    await expect(page).toHaveURL(HUB_URL)
    await expect(contactRow(page)).toContainText(hubCopy.statuses.completed)

    await page.goto(contactPathOf(reference))
    await expect(addressRowRadio(page, ADDRESS_BOOK_PARTY)).toBeChecked()
  })

  test('Cancel and return to overview reaches the overview without saving', async ({
    page
  }) => {
    const reference = await startAtContact(page)

    await addressRowRadio(page, ADDRESS_BOOK_PARTY).check()
    await page
      .getByRole('link', {
        name: sharedCopy.saveActions.cancelAndReturnToHub
      })
      .click()

    await expect(page).toHaveURL(HUB_URL)
    await expect(contactRow(page)).toContainText(hubCopy.statuses.notYetStarted)

    await page.goto(contactPathOf(reference))
    await expect(addressRowRadio(page, ADDRESS_BOOK_PARTY)).not.toBeChecked()
  })
})

test.describe('consignment-contact-select — the end of the opening run', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('in the opening run, Continue goes to check your answers even though the notification is incomplete', async ({
    page
  }) => {
    await startInTheRunAtContact(page)

    await addressRowRadio(page, ADDRESS_BOOK_PARTY).check()
    await saveAndContinue(page).click()

    await expect(page).toHaveURL(CHECK_ANSWERS_URL)
    await expect(
      page.getByRole('heading', { name: checkAnswersCopy.title, level: 1 })
    ).toBeVisible()
    await expect(
      page.getByRole('alert').getByRole('link', {
        name: checkAnswersCopy.errors.cards.arrivalDetails
      })
    ).toBeVisible()
  })
})

test.describe('consignment-contact-select — a blank save', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  for (const action of [
    sharedCopy.saveActions.saveAndContinue,
    sharedCopy.saveActions.saveAndReturnToHub
  ]) {
    test(`blank contact permits ${action} and leaves the task not yet started`, async ({
      page
    }) => {
      const reference = await startAtContact(page)

      await page.getByRole('button', { name: action, exact: true }).click()

      await expect(page).toHaveURL(HUB_URL)
      await expect(contactRow(page)).toContainText(
        hubCopy.statuses.notYetStarted
      )

      await page.goto(contactPathOf(reference))
      await expect(
        page.getByText(new RegExp(`^${pickerCopy.selectedAddressPrefix}`))
      ).toHaveCount(0)
      await expect(page.getByRole('radio', { checked: true })).toHaveCount(0)
    })
  }
})

test.describe('consignment-contact-select — the answers it refuses', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('rejects an id the address book does not hold, focuses the first row and preserves the search', async ({
    page
  }) => {
    await startAtContact(page)
    await page
      .getByLabel(pickerCopy.search.label, { exact: true })
      .fill('Imports')

    await postAnIdNotInTheBook(page)

    await expect(page).toHaveURL(PAGE_URL)
    await expect(errorSummaryLink(page)).toBeVisible()
    await expect(
      page.getByLabel(pickerCopy.search.label, { exact: true })
    ).toHaveValue('Imports')
    await expect(page.getByRole('radio', { checked: true })).toHaveCount(0)
    await expect(page.getByRole('radio').first()).not.toHaveValue(
      NOT_IN_THE_BOOK
    )

    await errorSummaryLink(page).click()
    await expect(page.getByRole('radio').first()).toBeFocused()
  })

  test('recovers from the error once an address is chosen', async ({
    page
  }) => {
    await startAtContact(page)
    await postAnIdNotInTheBook(page)
    await expect(errorSummaryLink(page)).toBeVisible()

    await addressRowRadio(page, ADDRESS_BOOK_PARTY).check()
    await saveAndContinue(page).click()

    await expect(page).toHaveURL(HUB_URL)
    await expect(contactRow(page)).toContainText(hubCopy.statuses.completed)
  })
})

test.describe('consignment-contact-select — accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('has no serious or critical axe violations on the initial render', async ({
    page
  }) => {
    await startAtContact(page)
    await expect(
      page.getByRole('heading', { name: copy.title, level: 1 })
    ).toBeVisible()

    await expectNoSeriousOrCriticalViolations(page, 'Contact initial render')
  })

  test('has no serious or critical axe violations in the error state', async ({
    page
  }) => {
    await startAtContact(page)
    await postAnIdNotInTheBook(page)
    await expect(errorSummaryLink(page)).toBeVisible()

    await expectNoSeriousOrCriticalViolations(page, 'Contact error state')
  })
})

import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { signIn } from '../../../../../../../../../fit/sign-in.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { copy as commoditiesCopy } from '../commodities/copy/copy.en.js'
import { copy as commodityTypeCopy } from '../commodity-type/copy/copy.en.js'
import { copy as dashboardCopy } from '../dashboard/copy/copy.en.js'
import { copy as hubCopy } from '../hub/copy/copy.en.js'
import { copy } from './copy/copy.en.js'
import { STUB_BOOK } from '../../../../../../services/address-book/stub/index.js'

const COMMODITY_TYPE_URL = /\/notifications\/[^/]+\/commodity-type$/
const COMMODITY_DETAILS_URL = /\/notifications\/[^/]+\/commodities\/details/
const COMMODITY_LIST_URL = /\/notifications\/[^/]+\/commodities$/
const ORIGIN_URL = /\/notifications\/[^/]+\/origin$/
const HUB_URL = /\/notifications\/[^/]+$/
const PAGE_URL = /\/notifications\/[^/]+\/consignment\/contact\/select/
const JOURNEY_ID_SEGMENT = 2

const COUNTRY_INPUT = 'input#countryOfOrigin'

const FRANCE = 'France'
const WOOD_AND_CUT_TREES = 'wood-and-cut-trees'
const CUT_CONIFEROUS_TREES = 'cut-coniferous-trees'

const WOOD_LINE_FIELDS = {
  commodityCode: '06042020',
  quantity: '40',
  sizeOfTree: '3.5',
  phytosanitaryTreatments: 'Heat treatment'
}

const backLink = (page) =>
  page.getByRole('link', { name: sharedCopy.layout.back, exact: true })

const saveAndContinue = (page) =>
  page.getByRole('button', { name: sharedCopy.saveActions.saveAndContinue })

const contactPathOf = (reference) =>
  `/notifications/${reference}/consignment/contact/select`

const startNotification = async (page) => {
  await page.goto('/')
  await page.getByRole('button', { name: dashboardCopy.startButton }).click()
  await expect(page).toHaveURL(COMMODITY_TYPE_URL)
  return new URL(page.url()).pathname.split('/')[JOURNEY_ID_SEGMENT]
}

const pickCommodityType = async (page, commodityType) => {
  await page
    .getByRole('radio', {
      name: commodityTypeCopy.typeLabels[commodityType],
      exact: true
    })
    .check()
  await saveAndContinue(page).click()
}

// The first choice, made with no lines saved, carries on to the details page.
const chooseCommodityType = async (page, commodityType) => {
  await pickCommodityType(page, commodityType)
  await expect(page).toHaveURL(COMMODITY_DETAILS_URL)
}

const addLine = async (page, category, values) => {
  await page
    .getByRole('radio', {
      name: commoditiesCopy.categoryLabels[category],
      exact: true
    })
    .check()
  await page
    .getByRole('button', { name: commoditiesCopy.details.continue })
    .click()
  for (const [field, value] of Object.entries(values)) {
    await page
      .getByLabel(commoditiesCopy.details.fields[field].label, { exact: true })
      .fill(value)
  }
  await saveAndContinue(page).click()
  await expect(page).toHaveURL(COMMODITY_LIST_URL)
}

// The country list enhances a native select, so the visible combobox keeps the
// field's own id.
const chooseCountry = async (page, name) => {
  const field = page.locator(COUNTRY_INPUT)
  await field.click()
  await field.fill(name)
  await page.getByRole('option', { name, exact: true }).click()
}

const saveOrigin = async (page, reference, country) => {
  await page.goto(`/notifications/${reference}/origin`)
  await expect(page).toHaveURL(ORIGIN_URL)
  await chooseCountry(page, country)
  await saveAndContinue(page).click()
}

// A wood notification with the prerequisite origin answered.
const startAtContact = async (page) => {
  const reference = await startNotification(page)
  await chooseCommodityType(page, WOOD_AND_CUT_TREES)
  await addLine(page, CUT_CONIFEROUS_TREES, WOOD_LINE_FIELDS)
  await saveOrigin(page, reference, FRANCE)
  await page.goto(contactPathOf(reference))
  await expect(page).toHaveURL(PAGE_URL)
  return reference
}

const contactRow = (page) =>
  page.getByRole('listitem').filter({
    has: page.getByRole('link', {
      name: hubCopy.rows.contact.title,
      exact: true
    })
  })

test.beforeEach(async ({ page }) => {
  await signIn(page)
})

test('lists every record with its name and address hint and saves an inline contact', async ({
  page
}) => {
  const reference = await startAtContact(page)
  await expect(
    page.getByRole('heading', { name: copy.title, exact: true })
  ).toBeVisible()
  await expect(page.getByText(copy.hint, { exact: true })).toBeVisible()
  await expect(page.getByRole('radio')).toHaveCount(STUB_BOOK.length)
  for (const record of STUB_BOOK) {
    await expect(
      page.getByRole('radio', { name: record.name, exact: true })
    ).toHaveAccessibleDescription(new RegExp(record.address.postalOrZipCode))
  }
  await page
    .getByRole('radio', { name: STUB_BOOK[0].name, exact: true })
    .check()
  await saveAndContinue(page).click()
  await expect(page).toHaveURL(HUB_URL)
  await expect(contactRow(page)).toContainText(hubCopy.statuses.completed)
  await page
    .getByRole('link', { name: hubCopy.rows.contact.title, exact: true })
    .click()
  await expect(page).toHaveURL(PAGE_URL)
  await page.reload()
  await expect(
    page.getByRole('radio', { name: STUB_BOOK[0].name, exact: true })
  ).toBeChecked()
  await page
    .getByRole('radio', { name: STUB_BOOK[1].name, exact: true })
    .check()
  await page
    .getByRole('link', {
      name: sharedCopy.saveActions.cancelAndReturnToHub,
      exact: true
    })
    .click()
  await expect(page).toHaveURL(HUB_URL)
  await page.goto(contactPathOf(reference))
  await expect(
    page.getByRole('radio', { name: STUB_BOOK[0].name, exact: true })
  ).toBeChecked()
  await backLink(page).click()
  await expect(page).toHaveURL(HUB_URL)
})

for (const action of [
  sharedCopy.saveActions.saveAndContinue,
  sharedCopy.saveActions.saveAndReturnToHub
]) {
  test(`blank contact permits ${action} and leaves the task incomplete`, async ({
    page
  }) => {
    await startAtContact(page)
    await page.getByRole('button', { name: action, exact: true }).click()
    await expect(page).toHaveURL(HUB_URL)
    await expect(contactRow(page)).toContainText(hubCopy.statuses.notYetStarted)
  })
}

test('initial and invalid selection states have no serious accessibility violations', async ({
  page
}) => {
  await startAtContact(page)
  let results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  expect(
    results.violations.filter(({ impact }) =>
      ['serious', 'critical'].includes(impact)
    )
  ).toEqual([])
  await page
    .getByRole('radio')
    .first()
    .evaluate((radio) => {
      radio.value = 'not-in-this-book'
    })
  await page.getByRole('radio').first().check()
  await saveAndContinue(page).click()
  const errorLink = page.getByRole('link', {
    name: copy.errors.contactRequired,
    exact: true
  })
  await expect(errorLink).toBeVisible()
  await errorLink.click()
  await expect(page.getByRole('radio').first()).toBeFocused()
  results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  expect(
    results.violations.filter(({ impact }) =>
      ['serious', 'critical'].includes(impact)
    )
  ).toEqual([])
})

import {
  addCommodityLine,
  chooseCommodityType,
  chooseCountryOfOrigin,
  expectNoSeriousOrCriticalViolations,
  expectThreeSaveControls,
  saveAndContinue,
  startNotification,
  startNotificationAtOrigin
} from '../../../../../../../../../fit/high-risk-plants-journey.js'
import { BASE, setUrl } from '../../../../../../../../../fit/set-base.js'
import { expect, test } from '@playwright/test'

import { signIn } from '../../../../../../../../../fit/sign-in.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { originPageCountryEntries } from '../../../../../../services/_capture/fixtures.js'
import { copy as captionsCopy } from '../../flow/section-captions/copy/copy.en.js'
import { copy as hubCopy } from '../hub/copy/copy.en.js'
import { copy } from './copy/copy.en.js'

const HUB_URL = setUrl('/notifications/[^/]+$')
const ORIGIN_URL = setUrl('/notifications/[^/]+/origin$')
const ARRIVAL_DETAILS_URL = setUrl('/notifications/[^/]+/arrival-details$')

const COUNTRY_INPUT = 'input#countryOfOrigin'
const COUNTRY_SELECT = 'select[name="countryOfOrigin"]'
const AUTOCOMPLETE_OPTION = '.autocomplete__option'
const ERROR_MESSAGE = '.govuk-error-message'

const FRANCE = 'France'
const NORWAY = 'Norway'
const SPAIN = 'Spain'

const WARE_POTATOES = 'ware-potatoes'
const CUT_CONIFEROUS_TREES = 'cut-coniferous-trees'
const EU_MEMBER_STATES = 'eu-member-states'

const backLink = (page) =>
  page.getByRole('link', { name: sharedCopy.layout.back, exact: true })

const originPathOf = (reference) => `${BASE}/notifications/${reference}/origin`

test.describe('origin feature', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('renders the caption, the heading, the label and the hint', async ({
    page
  }) => {
    await startNotificationAtOrigin(page)

    await expect(
      page.getByText(captionsCopy.sections.aboutTheConsignment, { exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: copy.title, level: 1 })
    ).toBeVisible()
    await expect(
      page.getByText(copy.country.label, { exact: true })
    ).toBeVisible()
    await expect(
      page.getByText(copy.country.hint, { exact: true })
    ).toBeVisible()
  })

  test('is reachable from the overview origin task row', async ({ page }) => {
    const reference = await startNotificationAtOrigin(page)
    await page.goto(`${BASE}/notifications/${reference}`)

    await page.getByRole('link', { name: hubCopy.rows.origin.title }).click()

    await expect(page).toHaveURL(ORIGIN_URL)
  })

  test('offers a placeholder ahead of every country and territory the service primes, by name', async ({
    page
  }) => {
    await startNotificationAtOrigin(page)

    const rendered = await page
      .locator(`${COUNTRY_SELECT} option`)
      .evaluateAll((options) =>
        options.map((option) => ({
          code: option.value,
          name: option.textContent
        }))
      )

    expect(rendered).toEqual([
      { code: '', name: copy.country.placeholder },
      ...originPageCountryEntries()
    ])
  })

  test('offers the three save controls', async ({ page }) => {
    await startNotificationAtOrigin(page)

    await expectThreeSaveControls(page)
  })

  test('sends Back to the overview once the notification has an answer', async ({
    page
  }) => {
    const reference = await startNotificationAtOrigin(page)

    await expect(backLink(page)).toHaveAttribute(
      'href',
      `${BASE}/notifications/${reference}`
    )
  })

  test('saves a country, reaches the arrival details and shows it again on return', async ({
    page
  }) => {
    const reference = await startNotificationAtOrigin(page)

    await chooseCountryOfOrigin(page, FRANCE)
    await saveAndContinue(page).click()

    await expect(page).toHaveURL(ARRIVAL_DETAILS_URL)

    await page.goto(originPathOf(reference))
    await expect(page.locator(COUNTRY_INPUT)).toHaveValue(FRANCE)
  })

  test('Save and return to overview saves the country and reaches the overview', async ({
    page
  }) => {
    const reference = await startNotificationAtOrigin(page)

    await chooseCountryOfOrigin(page, FRANCE)
    await page
      .getByRole('button', {
        name: sharedCopy.saveActions.saveAndReturnToHub
      })
      .click()

    await expect(page).toHaveURL(HUB_URL)

    await page.goto(originPathOf(reference))
    await expect(page.locator(COUNTRY_INPUT)).toHaveValue(FRANCE)
  })

  test('Cancel and return to overview reaches the overview without saving', async ({
    page
  }) => {
    const reference = await startNotificationAtOrigin(page)

    await chooseCountryOfOrigin(page, FRANCE)
    await page
      .getByRole('link', {
        name: sharedCopy.saveActions.cancelAndReturnToHub
      })
      .click()

    await expect(page).toHaveURL(HUB_URL)

    await page.goto(originPathOf(reference))
    await expect(page.locator(COUNTRY_INPUT)).toHaveValue('')
  })

  test('continuing with nothing chosen shows the error and focuses the field', async ({
    page
  }) => {
    await startNotificationAtOrigin(page)

    await saveAndContinue(page).click()

    await expect(page).toHaveURL(ORIGIN_URL)
    const summaryLink = page
      .getByRole('alert')
      .getByRole('link', { name: copy.errors.countryRequired })
    await expect(summaryLink).toBeVisible()

    await summaryLink.click()
    await expect(page.locator(COUNTRY_INPUT)).toBeFocused()
  })

  test('recovers from the error once a country is chosen', async ({ page }) => {
    await startNotificationAtOrigin(page)
    await saveAndContinue(page).click()
    await expect(
      page.getByRole('alert').getByRole('link', {
        name: copy.errors.countryRequired
      })
    ).toBeVisible()

    await chooseCountryOfOrigin(page, FRANCE)
    await saveAndContinue(page).click()

    await expect(page).toHaveURL(ARRIVAL_DETAILS_URL)
  })

  test('has no serious or critical axe violations on the initial render', async ({
    page
  }) => {
    await startNotificationAtOrigin(page)
    await expect(
      page.getByRole('heading', { name: copy.title, level: 1 })
    ).toBeVisible()

    await expectNoSeriousOrCriticalViolations(page, 'Origin initial render')
  })

  test('has no serious or critical axe violations in the error state', async ({
    page
  }) => {
    await startNotificationAtOrigin(page)
    await saveAndContinue(page).click()
    await expect(
      page.getByRole('alert').getByRole('link', {
        name: copy.errors.countryRequired
      })
    ).toBeVisible()

    await expectNoSeriousOrCriticalViolations(page, 'Origin error state')
  })
})

test.describe('country of origin type-ahead', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await startNotificationAtOrigin(page)
  })

  test('offers the whole country list on focus, without typing', async ({
    page
  }) => {
    await page.locator(COUNTRY_INPUT).click()

    await expect(
      page.getByRole('option', { name: FRANCE, exact: true })
    ).toBeVisible()
    await expect(page.getByRole('option')).toHaveCount(
      originPageCountryEntries().length
    )
  })

  test('tells the user when nothing matches what they typed', async ({
    page
  }) => {
    await page.locator(COUNTRY_INPUT).fill('zzzzzz')

    await expect(page.getByText(copy.country.noResults)).toBeVisible()
  })
})

test.describe('origin accessible-autocomplete styles', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('uses GOV.UK typography for the enhanced input and its options', async ({
    page
  }) => {
    await startNotificationAtOrigin(page)
    const input = page.getByRole('combobox', { name: copy.country.label })
    await input.fill('Fr')
    await expect(
      page.getByRole('option', { name: FRANCE, exact: true })
    ).toBeVisible()

    const typography = await page.evaluate(
      ({ inputSelector, optionSelector }) => {
        const enhancedInput = document.querySelector(inputSelector)
        const option = document.querySelector(optionSelector)
        const reference = document.createElement('input')
        reference.className = 'govuk-input'
        document.body.append(reference)

        const inputStyle = getComputedStyle(enhancedInput)
        const optionStyle = getComputedStyle(option)
        const referenceStyle = getComputedStyle(reference)
        const result = {
          inputFamily: inputStyle.fontFamily,
          inputSize: inputStyle.fontSize,
          optionFamily: optionStyle.fontFamily,
          optionSize: optionStyle.fontSize,
          referenceFamily: referenceStyle.fontFamily,
          referenceSize: referenceStyle.fontSize
        }
        reference.remove()
        return result
      },
      { inputSelector: COUNTRY_INPUT, optionSelector: AUTOCOMPLETE_OPTION }
    )

    expect(typography.inputFamily).toBe(typography.referenceFamily)
    expect(typography.optionFamily).toBe(typography.referenceFamily)
    expect(typography.inputFamily).toMatch(/^"?GDS Transport/)
    expect(typography.inputSize).toBe(typography.referenceSize)
    expect(typography.optionSize).toBe(typography.referenceSize)
  })

  test('keeps the upstream focus indicator on the enhanced input', async ({
    page
  }) => {
    await startNotificationAtOrigin(page)
    const input = page.getByRole('combobox', { name: copy.country.label })

    await input.focus()

    const indicator = await input.evaluate((enhancedInput) => {
      const reference = document.createElement('span')
      reference.style.color = 'var(--govuk-focus-colour)'
      document.body.append(reference)
      const inputStyle = getComputedStyle(enhancedInput)
      const result = {
        boxShadow: inputStyle.boxShadow,
        focusColour: getComputedStyle(reference).color,
        outlineColour: inputStyle.outlineColor,
        outlineWidth: inputStyle.outlineWidth
      }
      reference.remove()
      return result
    })

    expect(indicator.outlineColour).toBe(indicator.focusColour)
    expect(indicator.outlineWidth).toBe('3px')
    expect(indicator.boxShadow).toContain('inset')
  })

  test('gives the enhanced input the standard GOV.UK error border', async ({
    page
  }) => {
    await startNotificationAtOrigin(page)
    await saveAndContinue(page).click()
    await expect(
      page.getByRole('alert').getByRole('link', {
        name: copy.errors.countryRequired
      })
    ).toBeVisible()

    const borders = await page.evaluate(
      ({ inputSelector, errorSelector }) => {
        const enhancedInput = document.querySelector(inputSelector)
        const errorMessage = document.querySelector(errorSelector)
        const reference = document.createElement('input')
        reference.className = 'govuk-input govuk-input--error'
        document.body.append(reference)

        const inputStyle = getComputedStyle(enhancedInput)
        const errorStyle = getComputedStyle(errorMessage)
        const referenceStyle = getComputedStyle(reference)
        const result = {
          inputColour: inputStyle.borderTopColor,
          inputWidth: inputStyle.borderTopWidth,
          errorColour: errorStyle.color,
          referenceColour: referenceStyle.borderTopColor,
          referenceWidth: referenceStyle.borderTopWidth
        }
        reference.remove()
        return result
      },
      { inputSelector: COUNTRY_INPUT, errorSelector: ERROR_MESSAGE }
    )

    expect(borders.inputColour).toBe(borders.errorColour)
    expect(borders.inputColour).toBe(borders.referenceColour)
    expect(borders.inputWidth).toBe(borders.referenceWidth)
  })
})

test.describe('origin — the country list narrowed by the commodities', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('shows the ware-potato scope guidance and refuses a country outside the four', async ({
    page
  }) => {
    const reference = await startNotification(page)
    await chooseCommodityType(page, 'potatoes')
    await addCommodityLine(page, WARE_POTATOES, {
      potatoVariety: 'Maris Piper',
      quantity: '250',
      potatoIntendedUse: 'Eating'
    })
    await page.goto(originPathOf(reference))

    await expect(
      page.getByText(copy.guidance[WARE_POTATOES], { exact: true })
    ).toBeVisible()

    await chooseCountryOfOrigin(page, FRANCE)
    await saveAndContinue(page).click()

    await expect(page).toHaveURL(ORIGIN_URL)
    await expect(
      page.getByRole('alert').getByRole('link', {
        name: copy.errors.narrowing[WARE_POTATOES]
      })
    ).toBeVisible()
  })

  test('accepts one of the four ware-potato countries', async ({ page }) => {
    const reference = await startNotification(page)
    await chooseCommodityType(page, 'potatoes')
    await addCommodityLine(page, WARE_POTATOES, {
      potatoVariety: 'Maris Piper',
      quantity: '250',
      potatoIntendedUse: 'Eating'
    })
    await page.goto(originPathOf(reference))

    await chooseCountryOfOrigin(page, SPAIN)
    await saveAndContinue(page).click()

    await expect(page).toHaveURL(ARRIVAL_DETAILS_URL)
  })

  test('refuses a country outside the EU for a wood consignment', async ({
    page
  }) => {
    const reference = await startNotification(page)
    await chooseCommodityType(page, 'wood-and-cut-trees')
    await addCommodityLine(page, CUT_CONIFEROUS_TREES, {
      commodityCode: '06042020',
      quantity: '40',
      sizeOfTree: '3.5',
      phytosanitaryTreatments: 'Heat treatment'
    })
    await page.goto(originPathOf(reference))

    await expect(
      page.getByText(copy.guidance[WARE_POTATOES], { exact: true })
    ).toHaveCount(0)

    await chooseCountryOfOrigin(page, NORWAY)
    await saveAndContinue(page).click()

    await expect(page).toHaveURL(ORIGIN_URL)
    await expect(
      page.getByRole('alert').getByRole('link', {
        name: copy.errors.narrowing[EU_MEMBER_STATES]
      })
    ).toBeVisible()
  })
})

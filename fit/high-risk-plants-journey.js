import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { BASE, journeyIdFromPage, setUrl } from './set-base.js'
import { copy as sharedCopy } from '../src/server/app/shared/copy.en.js'
import { copy as dashboardCopy } from '../src/server/app/sets/high-risk-plants/journeys/linear/features/dashboard/copy/copy.en.js'
import { copy as commodityTypeCopy } from '../src/server/app/sets/high-risk-plants/journeys/linear/features/commodity-type/copy/copy.en.js'
import { copy as commodityCopy } from '../src/server/app/sets/high-risk-plants/journeys/linear/features/commodities/copy/copy.en.js'
import { copy as arrivalCopy } from '../src/server/app/sets/high-risk-plants/journeys/linear/features/arrival-details/copy/copy.en.js'
import { copy as idsCopy } from '../src/server/app/sets/high-risk-plants/journeys/linear/features/identification-numbers/copy/copy.en.js'
import { copy as checkAnswersCopy } from '../src/server/app/sets/high-risk-plants/journeys/linear/features/check-answers/copy/copy.en.js'

export const POTATO_VARIETY = 'Maris Piper'
export const ADDRESS_BOOK_PARTY = 'Tech Imports Ltd'
export const CHECK_ANSWERS_URL = setUrl(
  '/notifications/[^/]+/notification-view$'
)

const COMMODITY_TYPE_URL = setUrl('/notifications/[^/]+/commodity-type$')
const COMMODITY_DETAILS_URL = setUrl('/notifications/[^/]+/commodities/details')
const COMMODITY_LIST_URL = setUrl('/notifications/[^/]+/commodities$')
const ORIGIN_URL = setUrl('/notifications/[^/]+/origin$')
const COUNTRY_OF_ORIGIN_INPUT = 'input#countryOfOrigin'

export const FORM_GROUP_ANCESTOR_XPATH =
  'xpath=ancestor::*[contains(@class,"govuk-form-group")][1]'

export const childTagsAndClassesOf = (formGroup) =>
  formGroup.evaluate((group) =>
    [...group.children].map(({ tagName, className }) => ({
      tagName,
      className
    }))
  )

export const expectedFormGroupChildren = ({
  hint,
  labelSize,
  enhanced = false
}) => [
  { tagName: 'LABEL', className: `govuk-label govuk-label--${labelSize}` },
  ...(hint ? [{ tagName: 'DIV', className: 'govuk-hint' }] : []),
  ...(enhanced ? [{ tagName: 'DIV', className: 'app-autocomplete' }] : []),
  { tagName: 'SELECT', className: 'govuk-select' }
]

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const BLOCKING_IMPACTS = ['serious', 'critical']
const JSON_INDENT = 2

const DAYS_AHEAD_ON_TIME = 7

export const GOVUK_BLUE = 'rgb(29, 112, 184)'
export const GOVUK_BLUE_SHADE_50 = 'rgb(15, 56, 92)'
export const WHITE = 'rgb(255, 255, 255)'
const GOVUK_BLUE_SHADE_25 = 'rgb(22, 84, 138)'
const GOVUK_FOCUS = 'rgb(255, 221, 0)'
const GOVUK_FOCUS_TEXT = 'rgb(11, 12, 12)'
const GOVUK_BORDER_WIDTH = '2px'
const BLUE_ICON_BUTTON_EDGE = `${GOVUK_BLUE_SHADE_50} 0px -2px 0px 0px inset`

export const saveAndContinue = (page) =>
  page.getByRole('button', {
    name: sharedCopy.saveActions.saveAndContinue,
    exact: true
  })

const documentTop = (locator) =>
  locator.evaluate((el) => el.getBoundingClientRect().top + window.scrollY)

const documentBottom = (locator) =>
  locator.evaluate((el) => el.getBoundingClientRect().bottom + window.scrollY)

const computedStyle = (locator, property) =>
  locator.evaluate(
    (el, name) => window.getComputedStyle(el).getPropertyValue(name),
    property
  )

const datePickerOf = (page, label) =>
  page.locator('.moj-datepicker', { has: page.getByLabel(label) })

const dateToggleOf = (page, label) =>
  datePickerOf(page, label).getByRole('button', { name: 'Choose date' })

const openDatePicker = async (page, label) => {
  await dateToggleOf(page, label).click()
  const dialog = datePickerOf(page, label).getByRole('dialog')
  await expect(dialog).toBeVisible()
  return dialog
}

const expectDateToggleLook = async (page, label) => {
  const toggle = dateToggleOf(page, label)
  await expect(toggle).toHaveCSS('background-color', GOVUK_BLUE)
  await expect(toggle).toHaveCSS('color', WHITE)
  await expect(toggle).toHaveCSS('border-bottom-width', '0px')
  await expect(toggle).toHaveCSS('box-shadow', BLUE_ICON_BUTTON_EDGE)

  await toggle.hover()
  await expect(toggle).toHaveCSS('background-color', GOVUK_BLUE_SHADE_25)
  await expect(toggle).toHaveCSS('color', WHITE)

  await toggle.focus()
  await expect(toggle).toHaveCSS('background-color', GOVUK_FOCUS)
  await expect(toggle).toHaveCSS('color', GOVUK_FOCUS_TEXT)
}

const expectCalendarEndsAboveNextQuestion = async (
  page,
  label,
  nextQuestionLabel
) => {
  const dialog = await openDatePicker(page, label)
  await expect(nextQuestionLabel).toBeVisible()
  const calendarBottom = await documentBottom(dialog)
  const nextQuestionTop = await documentTop(nextQuestionLabel)

  expect(calendarBottom).toBeLessThanOrEqual(nextQuestionTop)
}

const restingBackgroundOfButton = (page, name) =>
  computedStyle(
    page.getByRole('button', { name, exact: true }),
    'background-color'
  )

const expectMouseOpenedCalendarLook = async (page, label) => {
  const primaryBackground = await restingBackgroundOfButton(
    page,
    sharedCopy.saveActions.saveAndContinue
  )
  const secondaryBackground = await restingBackgroundOfButton(
    page,
    sharedCopy.saveActions.saveAndReturnToHub
  )
  const dialog = await openDatePicker(page, label)

  await expect(dialog).toHaveCSS('outline-style', 'solid')
  await expect(dialog).toHaveCSS('outline-width', GOVUK_BORDER_WIDTH)
  await expect(dialog).toHaveCSS('outline-color', GOVUK_FOCUS_TEXT)

  const openedOnDay = dialog.locator('.moj-datepicker__button--selected')
  await expect(openedOnDay).toBeFocused()
  await expect(openedOnDay).toHaveCSS('background-color', GOVUK_BLUE)
  await expect(openedOnDay).toHaveCSS('color', WHITE)
  await expect(dialog.locator('tbody')).toHaveCSS('outline-style', 'none')

  await expect(
    dialog.getByRole('button', { name: 'Select', exact: true })
  ).toHaveCSS('background-color', primaryBackground)
  await expect(
    dialog.getByRole('button', { name: 'Close', exact: true })
  ).toHaveCSS('background-color', secondaryBackground)
}

const expectKeyboardOpenedCalendarLook = async (page, label) => {
  await dateToggleOf(page, label).focus()
  await page.keyboard.press('Enter')
  const dialog = datePickerOf(page, label).getByRole('dialog')
  await expect(dialog).toBeVisible()

  const focusedDay = dialog.locator('.moj-datepicker__button:focus')
  await expect(focusedDay).toHaveCSS('background-color', GOVUK_FOCUS)
  await expect(focusedDay).toHaveCSS('color', GOVUK_FOCUS_TEXT)
  await expect(dialog.locator('tbody')).toHaveCSS(
    'outline-width',
    GOVUK_BORDER_WIDTH
  )
  await expect(dialog.locator('tbody')).toHaveCSS('outline-color', GOVUK_FOCUS)
}

export const describeDatePickerLook = ({
  fieldName,
  label,
  nextQuestionLabel
}) => {
  test(`the ${fieldName} button that opens the calendar is GOV.UK blue with a white icon, darkens on hover and turns yellow when focused`, async ({
    page
  }) => {
    await expectDateToggleLook(page, label)
  })

  test(`the ${fieldName} calendar ends above the next question`, async ({
    page
  }) => {
    await expectCalendarEndsAboveNextQuestion(
      page,
      label,
      nextQuestionLabel(page)
    )
  })

  test(`the ${fieldName} calendar opened with the mouse has a 2px black outline, the opened-on day in GOV.UK blue with white text, and Select and Close buttons matching the page's primary and secondary buttons`, async ({
    page
  }) => {
    await expectMouseOpenedCalendarLook(page, label)
  })

  test(`the ${fieldName} calendar opened with the keyboard shows the focused day and calendar body in the GOV.UK focus yellow`, async ({
    page
  }) => {
    await expectKeyboardOpenedCalendarLook(page, label)
  })
}

/**
 * Fails unless the page offers Save and continue, Save and return to overview
 * and Cancel and return to overview.
 *
 * @param {import('@playwright/test').Page} page
 */
export const expectThreeSaveControls = async (page) => {
  await expect(saveAndContinue(page)).toBeVisible()
  await expect(
    page.getByRole('button', {
      name: sharedCopy.saveActions.saveAndReturnToHub
    })
  ).toBeVisible()
  await expect(
    page.getByRole('link', {
      name: sharedCopy.saveActions.cancelAndReturnToHub
    })
  ).toBeVisible()
}

/**
 * Types into an accessible-autocomplete input and picks the option named.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} input - the autocomplete's combobox
 * @param {string} optionName - the option's full accessible name
 */
export const chooseAutocompleteOption = async (page, input, optionName) => {
  await input.click()
  await input.fill(optionName)
  await page.getByRole('option', { name: optionName, exact: true }).click()
}

export const chooseCountryOfOrigin = (page, country) =>
  chooseAutocompleteOption(page, page.locator(COUNTRY_OF_ORIGIN_INPUT), country)

/**
 * Fails the test on any serious or critical WCAG 2.0, 2.1 or 2.2 violation.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} subject - what is being checked, named in the failure
 */
export const expectNoSeriousOrCriticalViolations = async (page, subject) => {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
  const blocking = results.violations.filter(({ impact }) =>
    BLOCKING_IMPACTS.includes(impact)
  )
  expect(
    blocking,
    `${subject} has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, JSON_INDENT)}`
  ).toEqual([])
}

/**
 * Starts a notification from the dashboard.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string>} the notification's reference
 */
export const startNotification = async (page) => {
  await page.goto(BASE)
  await page.getByRole('button', { name: dashboardCopy.startButton }).click()
  await expect(page).toHaveURL(COMMODITY_TYPE_URL)
  return journeyIdFromPage(page)
}

/**
 * Answers the commodity-type question for a notification with no commodity
 * lines, landing on the commodity details page.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} commodityType - a commodity-type value, such as `potatoes`
 */
export const chooseCommodityType = async (page, commodityType) => {
  await page
    .getByRole('radio', {
      name: commodityTypeCopy.typeLabels[commodityType],
      exact: true
    })
    .check()
  await saveAndContinue(page).click()
  await expect(page).toHaveURL(COMMODITY_DETAILS_URL)
}

/**
 * Chooses the commodity category on the commodity details page and continues
 * to the page that asks for the line's fields.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} category - a commodity category value, such as `ware-potatoes`
 */
export const chooseCommodityCategory = async (page, category) => {
  await page
    .getByRole('radio', {
      name: commodityCopy.categoryLabels[category],
      exact: true
    })
    .check()
  await page
    .getByRole('button', { name: commodityCopy.details.continue, exact: true })
    .click()
}

/**
 * Fills the commodity details page and saves the line, landing on the list.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} category - a commodity category value, such as `ware-potatoes`
 * @param {Record<string, string>} fields - each details field's value, by field name
 */
export const addCommodityLine = async (page, category, fields) => {
  await chooseCommodityCategory(page, category)
  for (const [field, value] of Object.entries(fields)) {
    await page
      .getByLabel(commodityCopy.details.fields[field].label, { exact: true })
      .fill(value)
  }
  await saveAndContinue(page).click()
  await expect(page).toHaveURL(COMMODITY_LIST_URL)
}

const openOrigin = async (page, reference) => {
  await page.goto(`${BASE}/notifications/${reference}/origin`)
  await expect(page).toHaveURL(ORIGIN_URL)
}

/**
 * Opens the origin page of a notification, chooses a country and saves it.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} reference - the notification's reference
 * @param {string} country - the country's name as the list shows it
 */
export const saveOrigin = async (page, reference, country) => {
  await openOrigin(page, reference)
  await chooseCountryOfOrigin(page, country)
  await saveAndContinue(page).click()
}

/**
 * Starts a potato notification and opens its origin page.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string>} the notification's reference
 */
export const startNotificationAtOrigin = async (page) => {
  const reference = await startNotification(page)
  await chooseCommodityType(page, 'potatoes')
  await openOrigin(page, reference)
  return reference
}

const WOOD_LINE_FIELDS = {
  commodityCode: '06042020',
  quantity: '40',
  sizeOfTree: '3.5',
  phytosanitaryTreatments: 'Heat treatment'
}

/**
 * Starts a notification for cut coniferous trees and saves France as the
 * country of origin.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string>} the notification's reference
 */
export const startWoodNotificationWithOriginSaved = async (page) => {
  const reference = await startNotification(page)
  await chooseCommodityType(page, 'wood-and-cut-trees')
  await addCommodityLine(page, 'cut-coniferous-trees', WOOD_LINE_FIELDS)
  await saveOrigin(page, reference, 'France')
  return reference
}

const pickAddressBookParty = async (page) => {
  await page
    .getByRole('radio', { name: `Select ${ADDRESS_BOOK_PARTY}`, exact: true })
    .check()
  await saveAndContinue(page).click()
}

/**
 * Starts a seed-potato notification from the dashboard and walks it to the
 * arrival details page.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string>} the notification's reference
 */
export const startPotatoNotification = async (page) => {
  const reference = await startNotification(page)
  await chooseCommodityType(page, 'potatoes')
  await addCommodityLine(page, 'seed-potatoes', {
    potatoVariety: POTATO_VARIETY,
    quantity: '250',
    potatoIntendedUse: 'Planting'
  })
  await saveAndContinue(page).click()
  await expect(page).toHaveURL(ORIGIN_URL)
  await chooseAutocompleteOption(page, page.getByRole('combobox'), 'France')
  await saveAndContinue(page).click()
  await expect(page).toHaveURL(/\/arrival-details$/)
  return reference
}

/**
 * Walks a seed-potato notification through every task and lands on check
 * answers, ready to continue to the declaration.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ late?: boolean }} [options] - `late` arrives today, inside the
 *   potato notice period, so the notification is late
 * @returns {Promise<string>} the notification's reference
 */
export const completePotatoNotification = async (
  page,
  { late = false } = {}
) => {
  const reference = await startPotatoNotification(page)
  const arrival = new Date()
  arrival.setDate(arrival.getDate() + (late ? 0 : DAYS_AHEAD_ON_TIME))
  await page
    .getByLabel(arrivalCopy.dateLabels.potatoes, { exact: true })
    .fill(
      `${arrival.getDate()}/${arrival.getMonth() + 1}/${arrival.getFullYear()}`
    )
  await page.getByLabel(arrivalCopy.time.label, { exact: true }).fill('14:30')
  await chooseAutocompleteOption(
    page,
    page.getByRole('combobox'),
    'Port of Dover - GB DVR'
  )
  await saveAndContinue(page).click()
  await expect(page).toHaveURL(/\/destinations\/select$/)
  await pickAddressBookParty(page)
  await expect(page).toHaveURL(/\/identification-numbers$/)
  await page
    .getByLabel(idsCopy.fields.producerIdentificationNumber.label, {
      exact: true
    })
    .fill('P123')
  await page
    .getByLabel(idsCopy.fields.cropIdentificationNumber.label, { exact: true })
    .fill('C123')
  await saveAndContinue(page).click()
  await expect(page).toHaveURL(/\/consignment\/contact\/select$/)
  await pickAddressBookParty(page)
  await expect(page).toHaveURL(CHECK_ANSWERS_URL)
  await expect(
    page.getByRole('heading', {
      name: checkAnswersCopy.submit.heading,
      level: 2
    })
  ).toBeVisible()
  await expect(
    page.getByText(checkAnswersCopy.submit.body, { exact: true })
  ).toBeVisible()
  return reference
}

/**
 * Completes a seed-potato notification and continues from check answers to
 * the declaration page.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ late?: boolean }} [options] - passed to `completePotatoNotification`
 * @returns {Promise<string>} the notification's reference
 */
export const openDeclaration = async (page, options) => {
  const reference = await completePotatoNotification(page, options)
  await page
    .getByRole('button', { name: checkAnswersCopy.continue, exact: true })
    .click()
  await expect(page).toHaveURL(
    new RegExp(`${BASE}/notifications/${reference}/declaration$`)
  )
  return reference
}

/**
 * The radio for one address on an address picker page.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ selectRowPrefix: string }} pickerCopy - the picker page's copy
 * @param {string} name - the address's name
 */
export const addressRowRadio = (page, pickerCopy, name) =>
  page.getByRole('radio', {
    name: `${pickerCopy.selectRowPrefix} ${name}`,
    exact: true
  })

/**
 * The inset that names the address already chosen on an address picker page.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ selectedAddressPrefix: string }} pickerCopy - the picker page's copy
 * @param {string} name - the address's name
 */
export const selectedAddressInset = (page, pickerCopy, name) =>
  page.getByText(`${pickerCopy.selectedAddressPrefix} ${name}`, { exact: true })

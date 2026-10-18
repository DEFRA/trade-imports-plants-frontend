import AxeBuilder from '@axe-core/playwright'
import { expect } from '@playwright/test'

import { BASE, journeyIdFromPage, setUrl } from './set-base.js'
import { copy as sharedCopy } from '../src/server/app/shared/copy.en.js'
import { copy as dashboardCopy } from '../src/server/app/sets/high-risk-plants/journeys/linear/features/dashboard/copy/copy.en.js'
import { copy as commodityCopy } from '../src/server/app/sets/high-risk-plants/journeys/linear/features/commodities/copy/copy.en.js'
import { copy as arrivalCopy } from '../src/server/app/sets/high-risk-plants/journeys/linear/features/arrival-details/copy/copy.en.js'
import { copy as idsCopy } from '../src/server/app/sets/high-risk-plants/journeys/linear/features/identification-numbers/copy/copy.en.js'
import { copy as checkAnswersCopy } from '../src/server/app/sets/high-risk-plants/journeys/linear/features/check-answers/copy/copy.en.js'

export const POTATO_VARIETY = 'Maris Piper'
export const ADDRESS_BOOK_PARTY = 'Tech Imports Ltd'
export const CHECK_ANSWERS_URL = setUrl(
  '/notifications/[^/]+/notification-view$'
)

const DAYS_AHEAD_ON_TIME = 7

export const saveAndContinue = (page) =>
  page.getByRole('button', {
    name: sharedCopy.saveActions.saveAndContinue,
    exact: true
  })

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

export const expectNoSeriousAxeViolations = async (page) => {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  expect(
    violations.filter(
      ({ impact }) => impact === 'serious' || impact === 'critical'
    )
  ).toEqual([])
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
 * @returns {Promise<string>} the notification's journey id
 */
export const startPotatoNotification = async (page) => {
  await page.goto(BASE)
  await page.getByRole('button', { name: dashboardCopy.startButton }).click()
  await expect(page).toHaveURL(/\/commodity-type$/)
  const reference = journeyIdFromPage(page)
  await page
    .getByRole('radio', {
      name: checkAnswersCopy.typeLabels.potatoes,
      exact: true
    })
    .check()
  await saveAndContinue(page).click()
  await expect(page).toHaveURL(/\/commodities\/details$/)
  await page
    .getByRole('radio', {
      name: checkAnswersCopy.categoryLabels['seed-potatoes'],
      exact: true
    })
    .check()
  await page
    .getByRole('button', { name: commodityCopy.details.continue, exact: true })
    .click()
  await page
    .getByLabel(checkAnswersCopy.labels.potatoVariety, { exact: true })
    .fill(POTATO_VARIETY)
  await page
    .getByLabel(checkAnswersCopy.labels.quantity, { exact: true })
    .fill('250')
  await page
    .getByLabel(checkAnswersCopy.labels.potatoIntendedUse, { exact: true })
    .fill('Planting')
  await saveAndContinue(page).click()
  await expect(page).toHaveURL(/\/commodities$/)
  await saveAndContinue(page).click()
  await expect(page).toHaveURL(/\/origin$/)
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
 * @returns {Promise<string>} the notification's journey id
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
 * @returns {Promise<string>} the notification's journey id
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

import { BASE } from './set-base.js'
import { createRequire } from 'node:module'
import { expect, test } from '@playwright/test'
import { signIn } from './sign-in.js'
import { seedFields } from './seed-fields.js'
const happyPaths = createRequire(import.meta.url)(
  '../src/server/app/sets/high-risk-plants/journeys/linear/flow/fixtures/happy-path.json'
)
import { copy as sharedCopy } from '../src/server/app/shared/copy.en.js'
import { copy as commodityCopy } from '../src/server/app/sets/high-risk-plants/journeys/linear/features/commodities/copy/copy.en.js'
import { copy as arrivalCopy } from '../src/server/app/sets/high-risk-plants/journeys/linear/features/arrival-details/copy/copy.en.js'
import { copy as statusCopy } from '../src/server/app/sets/high-risk-plants/journeys/linear/features/arrival-status/copy/copy.en.js'
import { copy as idsCopy } from '../src/server/app/sets/high-risk-plants/journeys/linear/features/identification-numbers/copy/copy.en.js'
import { copy as reviewCopy } from '../src/server/app/sets/high-risk-plants/journeys/linear/features/check-answers/copy/copy.en.js'
import { copy as declarationCopy } from '../src/server/app/sets/high-risk-plants/journeys/linear/features/declaration/copy/copy.en.js'
import { copy as confirmationCopy } from '../src/server/app/sets/high-risk-plants/journeys/linear/features/confirmation/copy/copy.en.js'
import {
  backLink,
  chooseAutocompleteOption,
  expectNoSeriousOrCriticalViolations,
  saveAndContinue,
  startNotification,
  startPotatoNotification
} from './high-risk-plants-journey.js'

const chooseOption = (page, name) =>
  chooseAutocompleteOption(page, page.getByRole('combobox'), name)

const chooseRadio = (page, name) =>
  page.getByRole('radio', { name, exact: true }).check()

const fillCommodity = async (page, fields) => {
  if (fields.index === undefined) {
    await chooseRadio(page, commodityCopy.categoryLabels[fields.category])
    return
  }
  for (const [field, value] of Object.entries(fields)) {
    if (field === 'index' || field === 'category') continue
    if (field === 'genus') {
      await chooseOption(page, commodityCopy.genusLabels[value])
    } else {
      await page
        .getByLabel(commodityCopy.details.fields[field].label, { exact: true })
        .fill(value)
    }
  }
}

const fillArrival = async (page, fields) => {
  const dateLabel = fields.arrivalTime
    ? arrivalCopy.dateLabels.potatoes
    : arrivalCopy.dateLabels['not-yet-arrived']
  await page.getByLabel(dateLabel, { exact: true }).fill(fields.arrivalDate)
  if (fields.arrivalTime) {
    await page
      .getByLabel(arrivalCopy.time.label, { exact: true })
      .fill(fields.arrivalTime)
    await chooseOption(page, 'Port of Dover - GB DVR')
  }
}

const fillSteps = {
  'commodity-type': (page, fields) =>
    chooseRadio(page, commodityCopy.typeLabels[fields.commodityType]),
  'commodities/details': fillCommodity,
  commodities: async () => {},
  origin: (page, fields, shape) => chooseOption(page, shape.countryName),
  'arrival-status': (page, fields) =>
    chooseRadio(page, statusCopy.statusLabels[fields.arrivalStatus]),
  'arrival-details': fillArrival,
  'destinations/select': (page, fields, shape) =>
    chooseRadio(page, `Select ${shape.partyName}`),
  'consignors/select': (page, fields, shape) =>
    chooseRadio(page, `Select ${shape.partyName}`),
  'identification-numbers': async (page, fields) => {
    for (const [field, value] of Object.entries(fields)) {
      await page
        .getByLabel(idsCopy.fields[field].label, { exact: true })
        .fill(value)
    }
  },
  'consignment/contact/select': (page, fields, shape) =>
    chooseRadio(page, `Select ${shape.partyName}`)
}

for (const [name, shape] of Object.entries(happyPaths)) {
  test(`${name}: ${shape.useCase} reaches confirmation`, async ({ page }) => {
    await signIn(page)
    const reference = await startNotification(page)

    for (const step of shape.steps) {
      await test.step(step.slug, async () => {
        const path = `${BASE}/notifications/${reference}/${step.slug}`
        await expect(page).toHaveURL((url) => url.pathname === path)
        await fillSteps[step.slug](page, seedFields(step), shape)
        const button =
          step.slug === 'commodities/details' && step.fields.index === undefined
            ? commodityCopy.details.continue
            : sharedCopy.saveActions.saveAndContinue
        await page.getByRole('button', { name: button, exact: true }).click()
      })
    }

    await expect(page).toHaveURL(/\/notification-view$/)
    await expect(
      page.getByRole('heading', { name: reviewCopy.title, level: 1 })
    ).toBeVisible()
    await page
      .getByRole('button', { name: reviewCopy.continue, exact: true })
      .click()
    await expect(page).toHaveURL(/\/declaration$/)
    await page
      .getByRole('checkbox', { name: declarationCopy.declarationLabel })
      .check()
    await page
      .getByRole('button', {
        name: declarationCopy.continueButton,
        exact: true
      })
      .click()
    await expect(page).toHaveURL(
      new RegExp(`${BASE}/notifications/${reference}/confirmation$`)
    )
    await expect(
      page.getByRole('heading', { name: confirmationCopy.title, level: 1 })
    ).toBeVisible()
    await expect(
      page.getByText(confirmationCopy.reference, { exact: false })
    ).toContainText(reference)
    await expect(
      page.getByRole('heading', { name: confirmationCopy.late.heading })
    ).toHaveCount(shape.late ? 1 : 0)
    await expectNoSeriousOrCriticalViolations(page, `${name} confirmation`)
  })
}

const startPotatoNotificationAtArrivalDetails = async (page) => {
  await signIn(page)
  const reference = await startPotatoNotification(page)
  return (slug) => `${BASE}/notifications/${reference}/${slug}`
}

test('following Back through the opening run and choosing Save and continue carries on to the next step, not the overview', async ({
  page
}) => {
  const pathOf = await startPotatoNotificationAtArrivalDetails(page)

  await backLink(page).click()
  await expect(page).toHaveURL(pathOf('origin'))

  await saveAndContinue(page).click()
  await expect(page).toHaveURL(pathOf('arrival-details'))
})

test('following Back from the arrival details reaches origin and then the commodities list', async ({
  page
}) => {
  const pathOf = await startPotatoNotificationAtArrivalDetails(page)

  for (const slug of ['origin', 'commodities']) {
    await backLink(page).click()
    await expect(page).toHaveURL(pathOf(slug))
  }
})

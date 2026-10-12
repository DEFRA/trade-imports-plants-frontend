import {
  BASE,
  journeyIdFromPage,
  setUrl
} from '../../../../../../../../../fit/set-base.js'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { signIn } from '../../../../../../../../../fit/sign-in.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { copy as dashboardCopy } from '../dashboard/copy/copy.en.js'
import { copy as commodityCopy } from '../commodities/copy/copy.en.js'
import { copy as arrivalCopy } from '../arrival-details/copy/copy.en.js'
import { copy as idsCopy } from '../identification-numbers/copy/copy.en.js'
import { copy as declarationCopy } from '../declaration/copy/copy.en.js'
import { copy } from './copy/copy.en.js'

const save = (page) =>
  page.getByRole('button', {
    name: sharedCopy.saveActions.saveAndContinue,
    exact: true
  })
const cyaUrl = setUrl('/notifications/[^/]+/notification-view$')
const VARIETY = 'Maris Piper'
const contactName = 'Tech Imports Ltd'

const startNotification = async (page) => {
  await page.goto(BASE)
  await page.getByRole('button', { name: dashboardCopy.startButton }).click()
  await expect(page).toHaveURL(/\/commodity-type$/)
  const reference = journeyIdFromPage(page)
  await page
    .getByRole('radio', { name: copy.typeLabels.potatoes, exact: true })
    .check()
  await save(page).click()
  await expect(page).toHaveURL(/\/commodities\/details$/)
  await page
    .getByRole('radio', {
      name: copy.categoryLabels['seed-potatoes'],
      exact: true
    })
    .check()
  await page
    .getByRole('button', { name: commodityCopy.details.continue, exact: true })
    .click()
  await page
    .getByLabel(copy.labels.potatoVariety, { exact: true })
    .fill(VARIETY)
  await page.getByLabel(copy.labels.quantity, { exact: true }).fill('250')
  await page
    .getByLabel(copy.labels.potatoIntendedUse, { exact: true })
    .fill('Planting')
  await save(page).click()
  await expect(page).toHaveURL(/\/commodities$/)
  await save(page).click()
  await expect(page).toHaveURL(/\/origin$/)
  await page.getByRole('combobox').fill('France')
  await page.getByRole('option', { name: 'France', exact: true }).click()
  await save(page).click()
  await expect(page).toHaveURL(/\/arrival-details$/)
  return reference
}

const completeNotification = async (page) => {
  const reference = await startNotification(page)
  const date = new Date()
  date.setDate(date.getDate() + 7)
  await page
    .getByLabel(arrivalCopy.dateLabels.potatoes, { exact: true })
    .fill(`${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`)
  await page.getByLabel(arrivalCopy.time.label, { exact: true }).fill('14:30')
  await page.getByRole('combobox').fill('Dover')
  await page
    .getByRole('option', { name: 'Port of Dover - GB DVR', exact: true })
    .click()
  await save(page).click()
  await expect(page).toHaveURL(/\/destinations\/select$/)
  await page
    .getByRole('radio', { name: `Select ${contactName}`, exact: true })
    .check()
  await save(page).click()
  // The linear opening run carries straight on into the next unanswered
  // section rather than stopping at the hub — potatoes skip consignor, so
  // Save and continue here lands on identification numbers.
  await expect(page).toHaveURL(/\/identification-numbers$/)
  await page
    .getByLabel(idsCopy.fields.producerIdentificationNumber.label, {
      exact: true
    })
    .fill('P123')
  await page
    .getByLabel(idsCopy.fields.cropIdentificationNumber.label, { exact: true })
    .fill('C123')
  await save(page).click()
  await expect(page).toHaveURL(/\/consignment\/contact\/select$/)
  await page
    .getByRole('radio', { name: `Select ${contactName}`, exact: true })
    .check()
  await save(page).click()
  await expect(page).toHaveURL(cyaUrl)
  await expect(
    page.getByRole('heading', { name: copy.submit.heading, level: 2 })
  ).toBeVisible()
  await expect(page.getByText(copy.submit.body, { exact: true })).toBeVisible()
  return reference
}

const assertAccessible = async (page) => {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  expect(
    violations.filter(
      ({ impact }) => impact === 'serious' || impact === 'critical'
    )
  ).toEqual([])
}

test.beforeEach(async ({ page }) => signIn(page))

test('renders saved answers, scoped cards and accessible Change links that return to review', async ({
  page
}) => {
  const reference = await completeNotification(page)
  await expect(
    page.getByRole('heading', { name: copy.title, level: 1 })
  ).toBeVisible()
  for (const heading of Object.values(copy.sections)) {
    await expect(
      page.getByRole('heading', { name: heading, level: 2 })
    ).toBeVisible()
  }
  await expect(
    page.getByRole('heading', { name: copy.cards.consignor, exact: true })
  ).toHaveCount(0)
  await expect(page.getByText(VARIETY, { exact: true })).toBeVisible()
  await expect(
    page.getByText('tech-imports-ltd@example.com', { exact: true })
  ).toHaveCount(0)
  const contactCard = page.locator('.govuk-summary-card').filter({
    has: page.getByRole('heading', { name: copy.cards.contact, exact: true })
  })
  await expect(contactCard.getByRole('term')).toHaveText([
    copy.labels.name,
    copy.labels.address
  ])
  await expect(
    contactCard
      .locator('.govuk-summary-list__row', {
        has: page
          .getByRole('term')
          .and(page.getByText(copy.labels.address, { exact: true }))
      })
      .locator('.govuk-summary-list__value')
  ).toHaveJSProperty(
    'innerText',
    '18 Dockside Road\nLondon\nE14 9GE\nUnited Kingdom'
  )
  await assertAccessible(page)
  await page
    .getByRole('link', {
      name: 'Change country of origin (Import details)',
      exact: true
    })
    .click()
  await expect(page).toHaveURL(/\/origin\?change=1$/)
  await save(page).click()
  await expect(page).toHaveURL(cyaUrl)
  await page
    .getByRole('link', {
      name: 'Change Commodity 1 (Commodity 1)',
      exact: true
    })
    .click()
  await expect(page).toHaveURL(/\/commodities\/details\?index=0&change=1$/)
  await page.getByLabel(copy.labels.quantity, { exact: true }).fill('300')
  await save(page).click()
  await expect(page).toHaveURL(/\/commodities\?change=1$/)
  await save(page).click()
  await expect(page).toHaveURL(cyaUrl)
  await page.reload()
  await expect(page.getByText('300', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: copy.continue, exact: true }).click()
  await expect(page).toHaveURL(
    new RegExp(`${BASE}/notifications/${reference}/declaration$`)
  )
})

test('offers Back, Delete notification, Save and return, and Cancel to Overview', async ({
  page
}) => {
  const reference = await completeNotification(page)
  const hub = `${BASE}/notifications/${reference}`
  const deleteButton = page.getByRole('button', {
    name: copy.delete,
    exact: true
  })
  await expect(deleteButton).toBeVisible()
  await expect(deleteButton).toHaveClass(/govuk-button--warning/)
  await expect(deleteButton).toHaveAttribute('href', /\/delete$/)
  await expect(
    page.getByRole('button', { name: copy.viewHeader.amend })
  ).toHaveCount(0)
  await expect(
    page.getByRole('region', { name: copy.importReferences.heading })
  ).toHaveCount(0)
  await expect(
    page
      .locator('.govuk-button-group')
      .filter({ has: page.getByRole('button', { name: copy.continue }) })
      .locator('> :nth-child(2)')
  ).toHaveText(copy.delete)
  await expect(
    page.getByRole('link', { name: sharedCopy.layout.back, exact: true })
  ).toHaveAttribute('href', hub)
  await expect(
    page.getByRole('link', {
      name: sharedCopy.saveActions.cancelAndReturnToHub,
      exact: true
    })
  ).toHaveAttribute('href', hub)
  await page
    .getByRole('button', {
      name: sharedCopy.saveActions.saveAndReturnToHub,
      exact: true
    })
    .click()
  await expect(page).toHaveURL(new RegExp(`${hub}$`))
})

test("Delete notification on a draft's check answers opens the delete page", async ({
  page
}) => {
  await completeNotification(page)

  await page.getByRole('button', { name: copy.delete, exact: true }).click()

  await expect(page).toHaveURL(/\/delete$/)
})

test('rechecks a saved origin after a commodity change and exposes an accessible correction link', async ({
  page
}) => {
  const reference = await completeNotification(page)
  await page
    .getByRole('link', {
      name: 'Change Commodity 1 (Commodity 1)',
      exact: true
    })
    .click()
  await page
    .getByRole('radio', {
      name: copy.categoryLabels['ware-potatoes'],
      exact: true
    })
    .check()
  await save(page).click()
  await expect(page).toHaveURL(/\/commodities\/details\?index=0&change=1$/)
  await page
    .getByLabel(copy.labels.potatoVariety, { exact: true })
    .fill(VARIETY)
  await page.getByLabel(copy.labels.quantity, { exact: true }).fill('250')
  await page
    .getByLabel(copy.labels.potatoIntendedUse, { exact: true })
    .fill('Planting')
  await save(page).click()
  await expect(page).toHaveURL(/\/commodities\?change=1$/)
  await save(page).click()
  await expect(page).toHaveURL(cyaUrl)
  await page.getByRole('button', { name: copy.continue, exact: true }).click()
  await expect(page).toHaveURL(cyaUrl)
  const error = page.getByRole('link', { name: /Poland/ })
  await expect(error).toHaveAttribute(
    'href',
    `${BASE}/notifications/${reference}/origin?change=1`
  )
  await assertAccessible(page)
  await error.click()
  await expect(page).toHaveURL(/\/origin\?change=1$/)
})

const submitNotification = async (page) => {
  const reference = await completeNotification(page)
  await page.getByRole('button', { name: copy.continue, exact: true }).click()
  await page
    .getByRole('checkbox', { name: declarationCopy.declarationLabel })
    .check()
  await page
    .getByRole('button', { name: declarationCopy.continueButton, exact: true })
    .click()
  await expect(page).toHaveURL(/\/confirmation$/)
  return reference
}

test("a submitted notification's view is headed by its reference with a Submitted tag and the date submitted, titled by its reference, with Back to the notification list", async ({
  page
}) => {
  const reference = await submitNotification(page)

  await page.goto(`${BASE}/notifications/${reference}/notification-view`)

  await expect(
    page.getByRole('heading', { level: 1, name: reference, exact: true })
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: copy.title, level: 1 })
  ).toHaveCount(0)
  const tag = page
    .getByRole('main')
    .getByText(sharedCopy.journeyStrip.submitted, { exact: true })
  await expect(tag).toHaveClass(/govuk-tag--green/)
  await expect(page.locator('.app-journey-strip')).toHaveCount(0)
  await expect(page).toHaveTitle(
    `${reference} - ${sharedCopy.layout.serviceName} - ${sharedCopy.layout.govukSuffix}`
  )
  await expect(
    page.getByText(/^Date submitted: \d{1,2} [A-Z][a-z]+ \d{4}$/)
  ).toBeVisible()
  await assertAccessible(page)

  await page.getByRole('link', { name: 'Back', exact: true }).click()

  await expect(page).toHaveURL(setUrl('/?$'))
  await expect(
    page.getByRole('heading', { level: 1, name: dashboardCopy.title })
  ).toBeVisible()
})

test("a submitted notification's view offers Amend this notification and a red Delete notification in its header, and no Copy as new", async ({
  page
}) => {
  const reference = await submitNotification(page)
  await page.goto(`${BASE}/notifications/${reference}/notification-view`)

  const group = page.locator('.govuk-button-group').filter({
    has: page.getByRole('button', { name: copy.viewHeader.amend, exact: true })
  })
  await expect(group.getByRole('button')).toHaveText([
    copy.viewHeader.amend,
    copy.delete
  ])
  await expect(
    page.getByRole('button', { name: copy.delete, exact: true })
  ).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Copy as new' })).toHaveCount(0)

  await expect(
    page.getByRole('button', { name: copy.viewHeader.amend, exact: true })
  ).not.toHaveClass(/govuk-button--(secondary|warning)/)
  await page
    .getByRole('button', { name: copy.viewHeader.amend, exact: true })
    .click()

  await expect(page).toHaveURL(
    new RegExp(`${BASE}/notifications/${reference}$`)
  )
  await expect(
    page.getByRole('main').getByText(sharedCopy.journeyStrip.amend, {
      exact: true
    })
  ).toBeVisible()
})

test("a submitted notification's view shows its notification reference as plain text without JavaScript, with no customs document code and no Copy button", async ({
  page,
  browser
}) => {
  const reference = await submitNotification(page)
  const context = await browser.newContext({
    javaScriptEnabled: false,
    storageState: await page.context().storageState()
  })
  const noJs = await context.newPage()

  await noJs.goto(`${BASE}/notifications/${reference}/notification-view`)

  const region = noJs.getByRole('region', {
    name: copy.importReferences.heading
  })
  await expect(region).toContainText(copy.importReferences.warning)
  await expect(
    region
      .getByRole('term')
      .filter({ hasText: copy.importReferences.notificationReference })
      .locator('..')
      .getByRole('definition')
  ).toHaveText(reference)
  await expect(noJs.getByText('Customs document code')).toHaveCount(0)
  await expect(region.getByRole('button')).toHaveCount(0)

  await context.close()
})

test('opening the view of a notification that does not exist goes to the notification list', async ({
  page
}) => {
  await page.goto(`${BASE}/notifications/GBN-HRP-00-000000/notification-view`)

  await expect(page).toHaveURL(setUrl('/?$'))
})

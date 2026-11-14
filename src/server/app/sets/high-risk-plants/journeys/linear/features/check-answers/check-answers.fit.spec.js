import {
  BASE,
  notificationPageWithTrail
} from '../../../../../../../../../fit/set-base.js'
import {
  POTATO_CHANGE_LINK_TRAIL,
  POTATO_VARIETY,
  REVIEW_URL_WITHOUT_TRAIL,
  completePotatoNotification,
  expectNoSeriousOrCriticalViolations,
  saveAndReturnToHub,
  continueFromChangedCommodityLine,
  saveAndContinue,
  submitDeclarationFromCheckAnswers,
  withoutJavaScript
} from '../../../../../../../../../fit/high-risk-plants-journey.js'
import { expect, test } from '@playwright/test'
import { signIn } from '../../../../../../../../../fit/sign-in.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { notificationDateText } from '../review/notification-date.js'
import { copy } from './copy/copy.en.js'
import { copy as deleteCopy } from '../delete-notification/copy/copy.en.js'
import { copy as destinationCopy } from '../place-of-destination/copy/copy.en.js'
import { TECH_IMPORTS_ADDRESS_LINES } from '../../../../../../../../../fit/address-read-back.js'

const NOTIFICATION_VIEW = 'notification-view'

test.beforeEach(async ({ page }) => signIn(page))

test('renders saved answers, scoped cards and accessible Change links that open their page on the review trail and go on with Save and continue', async ({
  page
}) => {
  const reference = await completePotatoNotification(page)
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
  await expect(page.getByText(POTATO_VARIETY, { exact: true })).toBeVisible()
  const addressValueIn = (cardTitle) =>
    page
      .locator('.govuk-summary-card', {
        has: page.getByRole('heading', { name: cardTitle, exact: true })
      })
      .locator('.govuk-summary-list__row', {
        has: page.getByRole('term').getByText(copy.labels.address, {
          exact: true
        })
      })
      .getByRole('definition')
  const expectedAddress = TECH_IMPORTS_ADDRESS_LINES.join('\n')
  await expect(addressValueIn(destinationCopy.headings.potatoes)).toHaveText(
    expectedAddress,
    { useInnerText: true }
  )
  await expect(addressValueIn(copy.cards.contact)).toHaveText(expectedAddress, {
    useInnerText: true
  })
  await expectNoSeriousOrCriticalViolations(page, 'Check answers')
  await page
    .getByRole('link', {
      name: 'Change country of origin (Import details)',
      exact: true
    })
    .click()
  await expect(page).toHaveURL(
    notificationPageWithTrail('origin', POTATO_CHANGE_LINK_TRAIL)
  )
  await saveAndContinue(page).click()
  await expect(page).toHaveURL(
    notificationPageWithTrail('arrival-details', [
      ...POTATO_CHANGE_LINK_TRAIL,
      'origin'
    ])
  )
  await page.goto(`${BASE}/notifications/${reference}/notification-view`)
  await expect(page).toHaveURL(REVIEW_URL_WITHOUT_TRAIL)
  await page
    .getByRole('link', {
      name: 'Change Commodity 1 (Commodity 1)',
      exact: true
    })
    .click()
  await expect(page).toHaveURL(
    notificationPageWithTrail('commodities/details\\?index=0', [
      NOTIFICATION_VIEW
    ])
  )
  await page.getByLabel(copy.labels.quantity, { exact: true }).fill('300')
  await continueFromChangedCommodityLine(page, [NOTIFICATION_VIEW])
  await page.goto(`${BASE}/notifications/${reference}/notification-view`)
  await expect(page).toHaveURL(REVIEW_URL_WITHOUT_TRAIL)
  await page.reload()
  await expect(page.getByText('300', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: copy.continue, exact: true }).click()
  await expect(page).toHaveURL(
    new RegExp(`${BASE}/notifications/${reference}/declaration$`)
  )
})

const deleteButton = (page) =>
  page.getByRole('button', { name: copy.delete, exact: true })

test('a draft check answers ends with Continue, a warning Delete notification button linking to the delete page and Save and return in one button group', async ({
  page
}) => {
  const reference = await completePotatoNotification(page)
  const hub = `${BASE}/notifications/${reference}`
  const endingGroup = page.locator('form[novalidate] .govuk-button-group > *')
  await expect(endingGroup).toHaveText([
    copy.continue,
    copy.delete,
    sharedCopy.saveActions.saveAndReturnToHub
  ])
  await expect(deleteButton(page)).toHaveAttribute('href', `${hub}/delete`)
  await expect(deleteButton(page)).toHaveClass(/govuk-button--warning/)
  await saveAndReturnToHub(page).click()
  await expect(page).toHaveURL(new RegExp(`${hub}$`))
})

test('a draft check answers offers Cancel and return to overview below the group and Back to the contact page', async ({
  page
}) => {
  const reference = await completePotatoNotification(page)
  const hub = `${BASE}/notifications/${reference}`
  await expect(
    page.getByRole('link', { name: sharedCopy.layout.back, exact: true })
  ).toHaveAttribute('href', new RegExp(`^${hub}/consignment/contact/select`))
  await expect(
    page.getByRole('link', {
      name: sharedCopy.saveActions.cancelAndReturnToHub,
      exact: true
    })
  ).toHaveAttribute('href', hub)
})

test('Delete notification on a draft opens the delete page', async ({
  page
}) => {
  await completePotatoNotification(page)

  await deleteButton(page).click()

  await expect(
    page.getByRole('heading', { name: deleteCopy.title, level: 1 })
  ).toBeVisible()
})

test('rechecks a saved origin after a commodity change and exposes an accessible correction link', async ({
  page
}) => {
  const reference = await completePotatoNotification(page)
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
  await saveAndContinue(page).click()
  await expect(page).toHaveURL(
    notificationPageWithTrail(
      'commodities/details\\?index=0',
      POTATO_CHANGE_LINK_TRAIL
    )
  )
  await page
    .getByLabel(copy.labels.potatoVariety, { exact: true })
    .fill(POTATO_VARIETY)
  await page.getByLabel(copy.labels.quantity, { exact: true }).fill('250')
  await page
    .getByLabel(copy.labels.potatoIntendedUse, { exact: true })
    .fill('Planting')
  await continueFromChangedCommodityLine(page, POTATO_CHANGE_LINK_TRAIL)
  await page.goto(`${BASE}/notifications/${reference}/notification-view`)
  await expect(page).toHaveURL(REVIEW_URL_WITHOUT_TRAIL)
  await page.getByRole('button', { name: copy.continue, exact: true }).click()
  await expect(page).toHaveURL(REVIEW_URL_WITHOUT_TRAIL)
  const error = page.getByRole('link', { name: /Poland/ })
  await expect(error).toHaveAttribute(
    'href',
    `${BASE}/notifications/${reference}/origin?from=notification-view`
  )
  await expectNoSeriousOrCriticalViolations(
    page,
    'Check answers with an origin error'
  )
  await error.click()
  await expect(page).toHaveURL(
    notificationPageWithTrail('origin', [NOTIFICATION_VIEW])
  )
})

test.describe('a submitted notification', () => {
  let reference

  const main = (page) => page.getByRole('main')
  const importReferences = (page) =>
    page.getByRole('region', { name: copy.importReferences.heading })

  let submittedBefore
  let submittedAfter

  test.beforeEach(async ({ page }) => {
    reference = await completePotatoNotification(page)
    submittedBefore = Date.now()
    await submitDeclarationFromCheckAnswers(page, reference)
    submittedAfter = Date.now()
    await page.goto(`${BASE}/notifications/${reference}/notification-view`)
    await expect(
      page.getByRole('heading', { level: 1, name: reference, exact: true })
    ).toBeVisible()
  })

  test('is headed by its reference with a green Submitted tag beside it, no status bar and a title naming the reference', async ({
    page
  }) => {
    await expect(main(page).locator('.govuk-tag')).toHaveText(
      sharedCopy.journeyStrip.submitted
    )
    await expect(main(page).locator('.govuk-tag')).toHaveClass(
      /govuk-tag--green/
    )
    await expect(page.locator('.app-journey-strip')).toHaveCount(0)
    await expect(page).toHaveTitle(
      `${reference} - ${sharedCopy.layout.serviceName} - ${sharedCopy.layout.govukSuffix}`
    )
  })

  test('dates the notification under its header', async ({ page }) => {
    const submittedLines = new Set(
      [submittedBefore, submittedAfter].map((instant) =>
        copy.submittedHeader.dateSubmitted(notificationDateText(instant))
      )
    )
    const alternatives = [...submittedLines].map(RegExp.escape).join('|')

    await expect(page.getByText(/^Date submitted: /)).toHaveText(
      new RegExp(`^(${alternatives})$`)
    )
  })

  test('offers Amend this notification and a warning Delete notification in its header, and Delete notification nowhere else', async ({
    page
  }) => {
    const controls = main(page)
      .locator('.govuk-button-group')
      .first()
      .locator('> *')

    await expect(controls).toHaveText([copy.submittedHeader.amend, copy.delete])
    await expect(controls.nth(1)).toHaveClass(/govuk-button--warning/)
    await expect(deleteButton(page)).toHaveCount(1)
  })

  test('Amend this notification opens the amendment review', async ({
    page
  }) => {
    await page.getByRole('button', { name: copy.submittedHeader.amend }).click()

    await expect(page.locator('.app-journey-strip .govuk-tag')).toHaveText(
      sharedCopy.journeyStrip.amend
    )
  })

  test('shows the import reference numbers with the warning and the notification reference, and no customs document code', async ({
    page
  }) => {
    const section = importReferences(page)

    await expect(section.getByText(copy.importReferences.warning)).toBeVisible()
    await expect(section.locator('.govuk-summary-list__key')).toHaveText([
      copy.importReferences.notificationReference
    ])
    await expect(section.locator('.govuk-summary-list__value')).toHaveText([
      reference
    ])
  })

  test('shows the import reference numbers as text with no button when JavaScript is off', async ({
    page,
    browser
  }) => {
    await withoutJavaScript(page, browser, async (noJs) => {
      const section = importReferences(noJs)

      await expect(
        section.getByText(copy.importReferences.warning)
      ).toBeVisible()
      await expect(section.locator('.govuk-summary-list__value')).toHaveText([
        reference
      ])
      await expect(section.getByRole('button')).toHaveCount(0)
    })
  })
})

test('opening the view of a notification that does not exist goes to the notification list', async ({
  page
}) => {
  await page.goto(`${BASE}/notifications/GBN-0000-0000-0000/notification-view`)

  await expect(page).toHaveURL(BASE)
})

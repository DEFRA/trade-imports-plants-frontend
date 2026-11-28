import { expect, test } from '@playwright/test'
import { BASE } from '../../../../../../../../../fit/set-base.js'
import {
  completePotatoNotification,
  confirmAmendment,
  expectNoSeriousOrCriticalViolations,
  journeyStripStatus,
  openAmendConfirmationFromCard,
  submitDeclarationFromCheckAnswers,
  viewHeaderTag,
  withoutJavaScript
} from '../../../../../../../../../fit/high-risk-plants-journey.js'
import { signIn } from '../../../../../../../../../fit/sign-in.js'
import { copy as dashboardCopy } from '../dashboard/copy/copy.en.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { copy } from './copy/copy.en.js'

const goBackLink = (page) =>
  page.getByRole('link', { name: copy.goBackLink, exact: true })

const amendForm = (page) =>
  page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: copy.confirmButton }) })

const submittedReference = async (page) => {
  const reference = await completePotatoNotification(page)
  await submitDeclarationFromCheckAnswers(page, reference)
  return reference
}

test.describe('amend feature', () => {
  let reference

  test.beforeEach(async ({ page }) => {
    await signIn(page)
    reference = await submittedReference(page)
    await openAmendConfirmationFromCard(page, reference)
  })

  test('the page title and heading read the amend title, and it asks the question', async ({
    page
  }) => {
    await expect(page).toHaveTitle(new RegExp(`^${copy.title}`))
    await expect(
      page.getByRole('heading', { name: copy.title, level: 1 })
    ).toBeVisible()
    await expect(page.getByText(copy.question)).toBeVisible()
  })

  test('the whole content is the status strip, the heading, the question and the form holding the confirm button and the go-back control, with a Back link to the notification view', async ({
    page
  }) => {
    const contentColumn = page.locator('.govuk-grid-column-two-thirds')

    await expect(contentColumn.locator('> *')).toHaveCount(4)
    await expect(contentColumn.locator('> form')).toHaveCount(1)
    await expect(
      contentColumn.locator('> form .govuk-button-group > *')
    ).toHaveCount(2)
    await expect(
      viewHeaderTag(page, sharedCopy.journeyStrip.submitted)
    ).toBeVisible()
    await expect(page.getByText(reference, { exact: true })).toBeVisible()
    await expect(
      page.getByRole('heading', { name: copy.title, level: 1 })
    ).toBeVisible()
    await expect(page.getByText(copy.question)).toBeVisible()
    await expect(
      page.getByRole('button', { name: copy.confirmButton })
    ).toBeVisible()
    await expect(goBackLink(page)).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Back', exact: true })
    ).toHaveAttribute(
      'href',
      new RegExp(`/notifications/${reference}/notification-view$`)
    )
  })

  test('the confirm control is the submit button of a form posting only the crumb to the amend address', async ({
    page
  }) => {
    const form = amendForm(page)

    await expect(form).toHaveAttribute(
      'action',
      new RegExp(`/notifications/${reference}/amend$`)
    )
    await expect(form.locator('input')).toHaveCount(1)
    await expect(form.locator('input[name="crumb"]')).toHaveCount(1)
  })

  test('confirming lands on the notification review showing it being amended', async ({
    page
  }) => {
    await confirmAmendment(page)

    await expect(
      journeyStripStatus(page, sharedCopy.journeyStrip.amend)
    ).toBeVisible()
  })

  test('the go-back control returns to the notification view, still Submitted, with no Change links', async ({
    page
  }) => {
    await goBackLink(page).click()

    await expect(
      viewHeaderTag(page, sharedCopy.journeyStrip.submitted)
    ).toBeVisible()
    await expect(page.getByRole('link', { name: /^Change/ })).toHaveCount(0)
  })

  test('the Back link returns to the notification view', async ({ page }) => {
    await page.getByRole('link', { name: 'Back', exact: true }).click()

    await expect(
      viewHeaderTag(page, sharedCopy.journeyStrip.submitted)
    ).toBeVisible()
  })

  test('opening the amend address again once the amendment has started opens the notification list', async ({
    page
  }) => {
    await confirmAmendment(page)

    await page.goto(`${BASE}/notifications/${reference}/amend`)

    await expect(page).toHaveURL(BASE)
    await expect(
      page.getByRole('heading', { name: dashboardCopy.notificationsHeading })
    ).toBeVisible()
  })

  test('confirmation page has no serious or critical axe violations', async ({
    page
  }) => {
    await expectNoSeriousOrCriticalViolations(page, 'Amend notification')
  })
})

test('opening the amend address for a reference the service does not hold opens the notification list', async ({
  page
}) => {
  await signIn(page)

  await page.goto(`${BASE}/notifications/REFERENCE-UNKNOWN/amend`)

  await expect(page).toHaveURL(BASE)
  await expect(
    page.getByRole('heading', { name: dashboardCopy.notificationsHeading })
  ).toBeVisible()
})

test.describe('amend feature without JavaScript', () => {
  test('the card Amend opens the page and the confirm control starts the amendment', async ({
    page,
    browser
  }) => {
    await signIn(page)
    const reference = await submittedReference(page)
    await withoutJavaScript(page, browser, async (noJs) => {
      await openAmendConfirmationFromCard(noJs, reference)

      await confirmAmendment(noJs)

      await expect(
        journeyStripStatus(noJs, sharedCopy.journeyStrip.amend)
      ).toBeVisible()
    })
  })
})

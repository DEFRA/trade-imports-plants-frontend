import {
  BASE,
  journeyIdFromPage,
  pageUrlWithTrail,
  setPath,
  setUrl
} from '../../../../../../../../../fit/set-base.js'
import {
  amendFromCard,
  errorSummary,
  notificationReferenceHeading,
  viewHeaderTag,
  journeyStrip,
  journeyStripStatus,
  reviewFootControls,
  changeCommodityType,
  completePotatoNotification,
  REVIEW_URL_WITHOUT_TRAIL,
  expectNoSeriousOrCriticalViolations,
  saveAndContinue,
  withoutJavaScript
} from '../../../../../../../../../fit/high-risk-plants-journey.js'
import { expect, test } from '@playwright/test'
import { signIn } from '../../../../../../../../../fit/sign-in.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { copy as dashboardCopy } from '../dashboard/copy/copy.en.js'
import { copy as idsCopy } from '../identification-numbers/copy/copy.en.js'
import { copy } from '../check-answers/copy/copy.en.js'
import { copy as cancelCopy } from './copy/copy.en.js'
import { copy as declarationCopy } from '../declaration/copy/copy.en.js'

const cancelAmendLink = (page) =>
  page.getByRole('link', {
    name: sharedCopy.journeyStrip.cancelAmend,
    exact: true
  })
const goBackLink = (page) =>
  page.getByRole('link', { name: cancelCopy.goBackLink, exact: true })
const CANCEL_AMEND_URL = /\/cancel-amend$/
const cyaHref = setPath('/notifications/[^/]+/notification-view$')

test.beforeEach(async ({ page }) => {
  await signIn(page)
  const reference = await completePotatoNotification(page)
  await page.getByRole('button', { name: copy.continue, exact: true }).click()
  await page
    .getByRole('checkbox', { name: declarationCopy.declarationLabel })
    .check()
  await page
    .getByRole('button', { name: declarationCopy.continueButton, exact: true })
    .click()
  await expect(page).toHaveURL(/\/confirmation$/)
  await amendFromCard(page, reference)
  await page.goto(`${BASE}/notifications/${reference}/identification-numbers`)
  await page
    .getByLabel(idsCopy.fields.producerIdentificationNumber.label, {
      exact: true
    })
    .fill('DiscardMe99')
  await saveAndContinue(page).click()
  await page.goto(BASE)
  await page
    .getByRole('link', {
      name: `${dashboardCopy.actions.cancelAmend} (${reference})`,
      exact: true
    })
    .click()
  await expect(page).toHaveURL(CANCEL_AMEND_URL)
})

test('the whole content is the question, the confirm button and Go back, with nothing above the heading', async ({
  page
}) => {
  const contentColumn = page.locator('.govuk-grid-column-two-thirds')
  const heading = page.getByRole('heading', {
    name: cancelCopy.title,
    level: 1
  })
  const goBack = goBackLink(page)

  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
  await expect(contentColumn.locator('> *')).toHaveCount(2)
  await expect(contentColumn.locator('> form')).toHaveCount(1)
  await expect(
    contentColumn.locator('> form .govuk-button-group > *')
  ).toHaveCount(2)
  await expect(contentColumn).toHaveText(
    `${cancelCopy.title} ${cancelCopy.confirmButton} ${cancelCopy.goBackLink}`
  )
  await expect(goBack).toHaveAttribute('href', cyaHref)
  await expect(
    page.getByRole('link', { name: sharedCopy.layout.back, exact: true })
  ).toHaveCount(0)

  const beforeTitle = heading.locator('xpath=preceding-sibling::*')
  await expect(beforeTitle).toHaveCount(0)

  await expectNoSeriousOrCriticalViolations(page, 'Cancel amendment page')
})

test('Go back preserves the amendment and its changes after reload', async ({
  page
}) => {
  await goBackLink(page).click()
  await expect(page).toHaveURL(REVIEW_URL_WITHOUT_TRAIL)
  await page.reload()
  await expect(
    journeyStripStatus(page, sharedCopy.journeyStrip.amend)
  ).toBeVisible()
  await expect(page.getByText('DiscardMe99', { exact: true })).toBeVisible()
})

test('Cancel amend in the strip of a question page opens the confirmation page and Go back keeps the amendment', async ({
  page
}) => {
  const reference = journeyIdFromPage(page)
  await page.goto(`${BASE}/notifications/${reference}/identification-numbers`)
  await expect(
    journeyStripStatus(page, sharedCopy.journeyStrip.amend)
  ).toBeVisible()
  await expect(journeyStrip(page)).toContainText(reference)

  await cancelAmendLink(page).click()

  await expect(page).toHaveURL(CANCEL_AMEND_URL)
  await expect(
    page.getByRole('heading', { name: cancelCopy.title, level: 1 })
  ).toBeVisible()
  await expect(cancelAmendLink(page)).toHaveCount(0)

  await goBackLink(page).click()
  await expect(page).toHaveURL(REVIEW_URL_WITHOUT_TRAIL)
  await expect(
    journeyStripStatus(page, sharedCopy.journeyStrip.amend)
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: sharedCopy.journeyStrip.cancelAmend })
  ).toBeVisible()
})

test('Overview offers Cancel amend in its status strip while amending', async ({
  page
}) => {
  const reference = journeyIdFromPage(page)
  await page.goto(`${BASE}/notifications/${reference}`)
  await expect(cancelAmendLink(page)).toBeVisible()
})

test('The amendment review ends with Continue, a secondary Cancel amend and Save and return in one group, offers no Delete notification, and Cancel amend opens the confirmation', async ({
  page
}) => {
  const reference = journeyIdFromPage(page)
  await page.goto(`${BASE}/notifications/${reference}/notification-view`)
  const cancelAmendButton = page
    .getByRole('main')
    .getByRole('button', { name: sharedCopy.journeyStrip.cancelAmend })

  await expect(reviewFootControls(page)).toHaveText([
    copy.continue,
    sharedCopy.journeyStrip.cancelAmend,
    sharedCopy.saveActions.saveAndReturnToHub
  ])
  await expect(cancelAmendButton).toHaveAttribute('href', CANCEL_AMEND_URL)
  await expect(
    page
      .getByRole('button', { name: sharedCopy.journeyStrip.cancelAmend })
      .or(page.getByRole('link', { name: sharedCopy.journeyStrip.cancelAmend }))
  ).toHaveCount(1)
  await expect(
    page.getByRole('button', { name: copy.delete, exact: true })
  ).toHaveCount(0)

  await cancelAmendButton.click()

  await expect(page).toHaveURL(CANCEL_AMEND_URL)
  await expect(
    page.getByRole('heading', { name: cancelCopy.title, level: 1 })
  ).toBeVisible()
})

test('Continue on an incomplete amendment shows There is a problem, naming the outstanding task', async ({
  page
}) => {
  const reference = journeyIdFromPage(page)
  await changeCommodityType(page, reference, 'wood-and-cut-trees')
  await page.goto(`${BASE}/notifications/${reference}/notification-view`)
  await expect(errorSummary(page)).toHaveCount(0)

  await page.getByRole('button', { name: copy.continue, exact: true }).click()

  await expect(page).toHaveURL(REVIEW_URL_WITHOUT_TRAIL)
  const summary = errorSummary(page)
  await expect(
    summary.getByRole('heading', { name: sharedCopy.errorSummary.title })
  ).toBeVisible()
  await expect(
    summary.getByRole('link', {
      name: copy.errors.cards.commodities,
      exact: true
    })
  ).toBeVisible()
  await expect(
    journeyStripStatus(page, sharedCopy.journeyStrip.amend)
  ).toBeVisible()
})

test('The commodities list ends as it does on a draft while amending, and Save and continue opens origin', async ({
  page
}) => {
  const reference = journeyIdFromPage(page)
  const listUrl = `${BASE}/notifications/${reference}/commodities`
  await page.goto(listUrl)
  await expect(saveAndContinue(page)).toBeVisible()
  await expect(
    page.getByRole('button', {
      name: sharedCopy.saveActions.saveAndReturnToHub
    })
  ).toHaveCount(0)

  await saveAndContinue(page).click()
  await expect(page).toHaveURL(
    pageUrlWithTrail(`/notifications/${reference}/origin`, ['commodities'])
  )
})

test('Cancel and return to overview while amending opens Overview without saving, and the strip keeps Amend and Cancel amend', async ({
  page
}) => {
  const reference = journeyIdFromPage(page)
  await page.goto(`${BASE}/notifications/${reference}/identification-numbers`)
  await page
    .getByLabel(idsCopy.fields.producerIdentificationNumber.label, {
      exact: true
    })
    .fill('NotSaved1')
  await page
    .getByRole('link', { name: sharedCopy.saveActions.cancelAndReturnToHub })
    .click()

  await expect(page).toHaveURL(setUrl(`/notifications/${reference}$`))
  await expect(
    journeyStripStatus(page, sharedCopy.journeyStrip.amend)
  ).toBeVisible()
  await expect(cancelAmendLink(page)).toBeVisible()
  await page.goto(`${BASE}/notifications/${reference}/identification-numbers`)
  await expect(
    page.getByLabel(idsCopy.fields.producerIdentificationNumber.label, {
      exact: true
    })
  ).not.toHaveValue('NotSaved1')
})

test('Cancel amend on the Overview opens the confirmation page', async ({
  page
}) => {
  const reference = journeyIdFromPage(page)
  await page.goto(`${BASE}/notifications/${reference}`)
  await cancelAmendLink(page).click()
  await expect(page).toHaveURL(CANCEL_AMEND_URL)
  await expect(
    page.getByRole('heading', { name: cancelCopy.title, level: 1 })
  ).toBeVisible()
})

test.describe('without JavaScript', () => {
  test('the strip Cancel amend reaches the confirmation and Yes restores Submitted', async ({
    page,
    browser
  }) => {
    const reference = journeyIdFromPage(page)
    await withoutJavaScript(page, browser, async (noJs) => {
      await noJs.goto(
        `${BASE}/notifications/${reference}/identification-numbers`
      )
      await cancelAmendLink(noJs).click()
      await expect(noJs).toHaveURL(CANCEL_AMEND_URL)
      await noJs.getByRole('button', { name: cancelCopy.confirmButton }).click()

      await expect(noJs).toHaveURL(/\/notification-view\?cancelled=1$/)
      await expect(
        viewHeaderTag(noJs, sharedCopy.journeyStrip.submitted)
      ).toBeVisible()
    })
  })
})

test('Back from the restored submitted view opens the notification list', async ({
  page
}) => {
  await page.getByRole('button', { name: cancelCopy.confirmButton }).click()
  await expect(page).toHaveURL(/\/notification-view\?cancelled=1$/)

  await page
    .getByRole('link', { name: sharedCopy.layout.back, exact: true })
    .click()

  await expect(page).toHaveURL(BASE)
  await expect(
    page.getByRole('heading', { name: dashboardCopy.notificationsHeading })
  ).toBeVisible()
})

test('confirmation opens the notification view showing it Submitted with its submitted answer restored, no banner above the reference, and no accessibility violations', async ({
  page
}) => {
  await page.getByRole('button', { name: cancelCopy.confirmButton }).click()
  await expect(page).toHaveURL(/\/notification-view\?cancelled=1$/)
  const referenceHeading = notificationReferenceHeading(page)
  await expect(referenceHeading).toBeVisible()
  await expect(
    referenceHeading.locator('xpath=preceding-sibling::*')
  ).toHaveCount(0)
  await expect(
    viewHeaderTag(page, sharedCopy.journeyStrip.submitted)
  ).toBeVisible()
  await expect(page.getByText('DiscardMe99', { exact: true })).toHaveCount(0)
  await expect(page.getByText('P123', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: /^Change/ })).toHaveCount(0)
  await expectNoSeriousOrCriticalViolations(
    page,
    'Submitted notification after a cancelled amendment'
  )
  await page.reload()
  await expect(page.getByText('P123', { exact: true })).toBeVisible()
})

test('opening the cancel-amendment address again once the amendment has been cancelled opens the notification list', async ({
  page
}) => {
  await page.getByRole('button', { name: cancelCopy.confirmButton }).click()
  await expect(page).toHaveURL(/\/notification-view\?cancelled=1$/)
  const reference = journeyIdFromPage(page)

  await page.goto(`${BASE}/notifications/${reference}/cancel-amend`)

  await expect(page).toHaveURL(BASE)
  await expect(
    page.getByRole('heading', { name: dashboardCopy.notificationsHeading })
  ).toBeVisible()
})

import { copyFor } from '../../../../../../../shared/copy.js'
import { pagePath } from '../../../../../../../shared/paths.js'
import { statusOf } from '../../../../../../../bridge/status/index.js'
import { collectsOf } from '../../../../../../../flow/dispatch.js'
import { pageGatePasses } from '../../../../../../../flow/gates.js'
import { rowEntry } from '../../../../../../../flow/navigation.js'
import { rowReady } from '../../../../../../../flow/section-status.js'
import {
  rowParts,
  rowStatus,
  taskRowById,
  taskRows
} from '../../../flow/task-rows.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { withChange } from './rows/change-link.js'

const copy = copyFor({ en, cy })

export const ROW_KEY_PREFIX = 'row:'

const rowOutstanding = (row, { answers, scope, evaluation }) =>
  !rowReady(rowStatus(row, answers, scope.inScope, evaluation))

/**
 * One error per task row that is not yet ready, in task-row order, keyed
 * `row:<rowId>` so a row never collides with a field or party error. A row
 * that collects a field already named by a field or party error is not named
 * twice: pass those keys as `coveredKeys`.
 */
export const outstandingRowErrors = (current, coveredKeys = []) =>
  Object.fromEntries(
    taskRows
      .filter(
        (row) =>
          !rowParts(row).some((part) => coveredKeys.includes(part)) &&
          rowOutstanding(row, current)
      )
      .map((row) => [`${ROW_KEY_PREFIX}${row.id}`, copy.errors.rows[row.id]])
  )

const pageOutstanding = (page, { answers, scope, evaluation }) =>
  pageGatePasses(page, scope) &&
  !rowReady(statusOf(collectsOf(page.id), answers, scope.inScope, evaluation))

/**
 * The first page of the row that still owes an answer, which returns to check
 * your answers once saved. Not the row's first page: when a later page is what
 * is missing, the first page is already answered, and saving it would come
 * straight back here with the same error. A row with no such page falls back
 * to its entry page.
 */
export const outstandingRowHref = (key, current) => {
  const row = taskRowById(key.slice(ROW_KEY_PREFIX.length))
  const { journeyId } = current.journey
  const page = row.pages.find((candidate) =>
    pageOutstanding(candidate, current)
  )
  return withChange(
    page
      ? pagePath(journeyId, page.slug)
      : rowEntry(row, current.scope, journeyId)
  )
}

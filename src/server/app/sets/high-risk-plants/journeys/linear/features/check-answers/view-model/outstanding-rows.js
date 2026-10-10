import { copyFor } from '../../../../../../../shared/copy.js'
import { rowEntry } from '../../../../../../../flow/navigation.js'
import {
  FULFILLED,
  NA,
  OPTIONAL
} from '../../../../../../../bridge/status/index.js'
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

const READY_STATUSES = [FULFILLED, NA, OPTIONAL]

const rowOutstanding = (row, { answers, scope, evaluation }) =>
  !READY_STATUSES.includes(rowStatus(row, answers, scope.inScope, evaluation))

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

/** The row's entry page, which returns to check your answers once saved. */
export const outstandingRowHref = (key, scope, journeyId) =>
  withChange(
    rowEntry(taskRowById(key.slice(ROW_KEY_PREFIX.length)), scope, journeyId)
  )

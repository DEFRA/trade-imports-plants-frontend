import { changeAction, editableActions } from './change-link.js'
import { escapeHtml, valueText } from './value-text.js'

export const row = (
  journeyId,
  readOnly,
  key,
  value,
  obligationId,
  visuallyHiddenText = null
) => ({
  key: { text: key },
  value: { text: valueText(value) },
  ...editableActions(
    readOnly,
    changeAction(
      journeyId,
      obligationId,
      visuallyHiddenText ?? key.toLowerCase()
    )
  )
})

export const readOnlyRow = (key, value) => ({
  key: { text: key },
  value: { text: valueText(value) }
})

/** A read-only row that shows a multi-line value one line per line, and
 * "Not provided" when there are none. */
export const readOnlyLinesRow = (key, lines) => ({
  key: { text: key },
  value:
    lines.length > 0
      ? { html: lines.map(escapeHtml).join('<br>') }
      : { text: valueText(undefined) }
})

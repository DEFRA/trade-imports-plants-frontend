import { formatMomentAsLongDay } from '../../../../../../../lib/validate/index.js'

/**
 * The day a notification was submitted, as the long day shown to the trader.
 *
 * @param {{ submittedAt?: (string|number|Date|null) }} journey - the journey.
 * @returns {string|null} null until the journey holds a submission instant.
 */
export const submittedDayText = (journey) =>
  journey.submittedAt
    ? formatMomentAsLongDay(new Date(journey.submittedAt))
    : null

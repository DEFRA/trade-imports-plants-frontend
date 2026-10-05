import { addDays, addMonths, format, isValid, parse, parseISO } from 'date-fns'

// Every Date here is midnight UTC, whatever the process timezone: the app runs
// UTC, vitest forces TZ=UTC, but the Playwright drivers run on the developer's
// clock, and a helper that quietly meant something different there would be
// worse than useless. date-fns `addDays`/`addMonths` preserve wall-clock time,
// so they hold that invariant and bring month-end clamping with them.
// `startOfDay` and `format` do NOT — both normalise to local — so day starts
// and formatting are done through the UTC accessors instead.
const DATE_TEXT_FORMAT = 'd/M/yyyy'
const DATE_TEXT_SHAPE = /^\d{1,2}\/\d{1,2}\/\d{4}$/
const MONTHS_IN_YEAR = 12
const DISPLAY_DATE_FORMAT = 'd MMM yyyy'

/** The delimiters an ISO value may use between the date and the time. */
const TIME_DELIMITER = /[T ]/

/** A trailing `Z`, `+01`, `+0100` or `+01:00` on the time part. */
const ZONE_DESIGNATOR = /(?:Z|[+-]\d\d(?::?\d\d)?)$/

/**
 * The zone this service reasons in and renders moments in. A code constant,
 * not config: the displayed day must not depend on whichever `TZ` the process
 * carries — `Europe/London` in the container, `UTC` under vitest.
 */
export const SERVICE_TIME_ZONE = 'Europe/London'

/**
 * @param {number} year
 * @param {number} month - 1-based (1 = January).
 * @param {number} day
 */
export const isRealDate = (year, month, day) => {
  if (![year, month, day].every(Number.isInteger)) {
    return false
  }
  if (month < 1 || month > MONTHS_IN_YEAR) {
    return false
  }
  if (day < 1) {
    return false
  }
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

/**
 * @param {Date} date
 * @returns {Date} Midnight UTC on the same calendar day.
 */
export const startOfUtcDay = (date) =>
  new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  )

/**
 * @param {Date} date
 * @param {string} timeZone - An IANA zone name.
 * @returns {Date} Midnight UTC standing for the calendar day the instant falls
 * on in `timeZone`.
 */
export const startOfDayInZone = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date)
  const partValue = (type) =>
    Number(parts.find((part) => part.type === type).value)
  return new Date(
    Date.UTC(partValue('year'), partValue('month') - 1, partValue('day'))
  )
}

/**
 * @param {Date} date
 * @param {number} days - May be negative.
 * @returns {Date} Midnight UTC, `days` whole days away.
 */
export const addUtcDays = (date, days) => addDays(startOfUtcDay(date), days)

/**
 * `addMonths` clamps to the last day of the target month, so 31 August plus six
 * months is 28 February rather than the 3 March plain rollover would give.
 * @param {Date} date
 * @param {number} months - May be negative.
 * @returns {Date} Midnight UTC in the target month.
 */
export const addUtcMonths = (date, months) =>
  addMonths(startOfUtcDay(date), months)

/**
 * @param {string} raw - A `d/m/yyyy` or `dd/mm/yyyy` value, four-digit year.
 * @returns {Date|null} Midnight UTC, or null when the value is not a real date.
 */
export const parseDateText = (raw) => {
  const text = String(raw ?? '').trim()
  // date-fns reads `yyyy` as one to four digits, so without this guard
  // `27/3/26` parses as the year 26 and slips under a `max` bound.
  if (!DATE_TEXT_SHAPE.test(text)) {
    return null
  }
  const parsed = parse(text, DATE_TEXT_FORMAT, new Date())
  // `parse` returns a local-time Date; the calendar day it names is what
  // matters, so it is re-anchored at midnight UTC.
  return isValid(parsed)
    ? new Date(
        Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
      )
    : null
}

/**
 * The shape the MoJ date picker itself writes back when `leadingZeros` is unset.
 * @param {Date} date
 * @returns {string} `d/m/yyyy`, no leading zeros.
 */
export const formatDateText = (date) =>
  `${date.getUTCDate()}/${date.getUTCMonth() + 1}/${date.getUTCFullYear()}`

/**
 * @param {string} text - An ISO 8601 date or date-time, with or without a zone.
 * @returns {string} The same value with a zone: UTC wherever none was given.
 */
const labelAsUtc = (text) => {
  const [, time] = text.split(TIME_DELIMITER)
  if (time === undefined) {
    return `${text}T00:00:00Z`
  }
  return ZONE_DESIGNATOR.test(time) ? text : `${text}Z`
}

/**
 * Reads a wire value as the instant it stands for, whatever the process zone.
 *
 * The plants backend stamps `created` and `submittedAt` as `LocalDateTime` on a
 * UTC clock, so they arrive with no zone — `2026-10-01T23:29:00`. `new Date`
 * and `parseISO` both resolve such a value against the process zone, and the
 * container runs `Europe/London`: during British Summer Time 23:29 UTC was read
 * as 23:29 London, an hour early, and a notification submitted at 00:29 on
 * 2 October was dated 1 October. A value with no zone is UTC; a date-only
 * value is midnight UTC.
 * @param {string|Date|null|undefined} value
 * @returns {Date|null} The instant, or null when the value is missing or not a date.
 */
export const parseInstant = (value) => {
  if (!value) {
    return null
  }
  if (value instanceof Date) {
    return isValid(value) ? value : null
  }
  const date = parseISO(labelAsUtc(String(value)))
  return isValid(date) ? date : null
}

/**
 * `format` reads the process zone, so the day comes from the UTC accessors and
 * is handed back as plain local components purely for date-fns' month names.
 * `Intl.DateTimeFormat` would be shorter, but ICU's `en-GB` short month for
 * September is `Sept`, which would reword every September date in the service.
 * @param {Date} date
 * @returns {string} e.g. `5 Mar 2026`.
 */
const formatUtcComponents = (date) =>
  format(
    new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    DISPLAY_DATE_FORMAT
  )

/**
 * A calendar date — a day the user chose, carried as midnight UTC. Read
 * straight off the UTC components: the value already is the day.
 * @param {Date} date
 * @returns {string} e.g. `21 Jul 2026` for `2026-07-21T00:00:00.000Z`.
 */
export const formatCalendarDate = (date) => formatUtcComponents(date)

/**
 * A moment — when a notification was created or submitted — as the day it
 * fell on in {@link SERVICE_TIME_ZONE}: `2026-10-01T23:29:00Z` is 2 October in
 * the UK.
 * @param {Date} date
 * @returns {string} e.g. `2 Oct 2026` for `2026-10-01T23:29:00Z`.
 */
export const formatMomentAsDay = (date) =>
  formatUtcComponents(startOfDayInZone(date, SERVICE_TIME_ZONE))

/**
 * A moment as the long-form day it fell on in {@link SERVICE_TIME_ZONE}, the
 * way a receipt dates it. Long month names have no `Sept` problem, so `Intl`
 * does the work.
 * @param {Date} date
 * @returns {string} e.g. `2 October 2026` for `2026-10-01T23:29:00Z`.
 */
export const formatMomentAsLongDay = (date) =>
  date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: SERVICE_TIME_ZONE
  })

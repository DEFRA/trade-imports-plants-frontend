import { randomInt } from 'node:crypto'

export const CROCKFORD_BASE32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
export const REFERENCE_BODY_LENGTH = 6

const YEAR_DIGITS = 2
const TWO_DIGIT_YEAR_MODULUS = 100

/** Mints a reference number as `{YY}-{XXXXXX}`, matching the backend's
 * `ReferenceNumberGenerator`. */
export const mintReferenceNumber = () => {
  const year = String(
    new Date().getFullYear() % TWO_DIGIT_YEAR_MODULUS
  ).padStart(YEAR_DIGITS, '0')
  const body = Array.from(
    { length: REFERENCE_BODY_LENGTH },
    () => CROCKFORD_BASE32[randomInt(CROCKFORD_BASE32.length)]
  ).join('')
  // PENDING REQUIREMENTS: the human-facing type code that prefixes the
  // reference number is not yet agreed. Prepend it here, and to the backend's
  // ReferenceNumberGenerator, when it is.
  return `${year}-${body}`
}

import { expect } from 'vitest'

/** Any fixed summer instant will do; the zones this helper is given are never on UTC then. */
const PROBE_INSTANT = '2026-07-21T00:00:00Z'

/**
 * Runs `assertions` with the process timezone moved to `zone`, then puts `TZ`
 * back exactly as it was.
 *
 * The unit suite runs under `TZ=UTC` (see `package.json`), the one setting
 * where an ambient-zone bug and a zone-explicit fix agree — so a test that does
 * not move the zone cannot fail even when the bug is live.
 *
 * Restoring deletes rather than assigns because `process.env` coerces values to
 * strings: assigning back an absent `TZ` writes the literal `'undefined'`.
 * @param {string} zone - An IANA zone name, away from UTC.
 * @param {() => void} assertions
 */
export const runInZone = (zone, assertions) => {
  const originalZone = process.env.TZ
  process.env.TZ = zone
  try {
    // Prove the override took: if a runtime stops honouring reassignment these
    // tests would otherwise pass vacuously.
    expect(new Date(PROBE_INSTANT).getTimezoneOffset()).not.toBe(0)
    assertions()
  } finally {
    if (originalZone === undefined) {
      delete process.env.TZ
    } else {
      process.env.TZ = originalZone
    }
  }
}

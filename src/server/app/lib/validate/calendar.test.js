import { describe, expect, it } from 'vitest'

import { runInZone } from '../../../common/test-helpers/run-in-zone.js'
import {
  addUtcDays,
  addUtcMonths,
  formatCalendarDate,
  formatDateText,
  formatMomentAsDay,
  formatMomentAsLongDay,
  parseDateText,
  parseInstant,
  SERVICE_TIME_ZONE,
  startOfDayInZone,
  startOfUtcDay
} from './calendar.js'

const utc = (year, month, day) => new Date(Date.UTC(year, month - 1, day))

/** 00:29 on 2 October in London: the UTC day is still the 1st. */
const BST_FIRST_HOUR = '2026-10-01T23:29:00Z'

describe('#startOfUtcDay', () => {
  it('strips the time from an instant', () => {
    expect(startOfUtcDay(new Date('2026-08-12T23:45:12.500Z'))).toEqual(
      utc(2026, 8, 12)
    )
  })
})

describe('#startOfDayInZone', () => {
  it('takes the London day, not the UTC one, in the hour they disagree', () => {
    // 00:30 on 12 August in London is still 23:30 on the 11th in UTC.
    expect(
      startOfDayInZone(new Date('2026-08-11T23:30:00Z'), 'Europe/London')
    ).toEqual(utc(2026, 8, 12))
  })

  it('agrees with the UTC day outside British Summer Time', () => {
    expect(
      startOfDayInZone(new Date('2026-01-11T23:30:00Z'), 'Europe/London')
    ).toEqual(utc(2026, 1, 11))
  })
})

describe('#addUtcDays', () => {
  it('moves forward across a month boundary', () => {
    expect(addUtcDays(utc(2026, 8, 30), 3)).toEqual(utc(2026, 9, 2))
  })

  it('moves backward when given a negative count', () => {
    expect(addUtcDays(utc(2026, 3, 2), -3)).toEqual(utc(2026, 2, 27))
  })

  it('crosses a leap day', () => {
    expect(addUtcDays(utc(2028, 2, 28), 1)).toEqual(utc(2028, 2, 29))
  })
})

describe('#addUtcMonths', () => {
  it('clamps to the last day of a shorter target month', () => {
    expect(addUtcMonths(utc(2026, 8, 31), 6)).toEqual(utc(2027, 2, 28))
  })

  it('clamps to 29 February in a leap year', () => {
    expect(addUtcMonths(utc(2027, 8, 31), 6)).toEqual(utc(2028, 2, 29))
  })

  it('moves backward across a year boundary', () => {
    expect(addUtcMonths(utc(2026, 2, 15), -3)).toEqual(utc(2025, 11, 15))
  })
})

describe('#parseDateText', () => {
  it.each([
    ['5/8/2026', utc(2026, 8, 5)],
    ['05/08/2026', utc(2026, 8, 5)],
    ['  5/8/2026  ', utc(2026, 8, 5)]
  ])('parses %s', (raw, expected) => {
    expect(parseDateText(raw)).toEqual(expected)
  })

  it.each([
    ['31/2/2026'],
    ['32/1/2026'],
    ['5/13/2026'],
    ['5-8-2026'],
    ['27/3/26'],
    ['5/8/26'],
    ['not a date'],
    [''],
    ['   '],
    [null],
    [undefined]
  ])('rejects %s', (raw) => {
    expect(parseDateText(raw)).toBeNull()
  })
})

describe('#formatDateText', () => {
  it('drops leading zeros, matching what the picker writes back', () => {
    expect(formatDateText(utc(2026, 8, 5))).toBe('5/8/2026')
  })

  it('keeps two-digit days and months intact', () => {
    expect(formatDateText(utc(2026, 12, 25))).toBe('25/12/2026')
  })

  it('round-trips with parseDateText', () => {
    expect(parseDateText(formatDateText(utc(2027, 2, 28)))).toEqual(
      utc(2027, 2, 28)
    )
  })
})

describe('#parseInstant', () => {
  it('reads a value with no zone as UTC, the way the backend stamps it', () => {
    expect(parseInstant('2026-10-01T23:29:00')).toEqual(
      new Date(BST_FIRST_HOUR)
    )
  })

  it('keeps a value that already carries a zone', () => {
    expect(parseInstant('2026-10-02T00:29:00+01:00')).toEqual(
      new Date(BST_FIRST_HOUR)
    )
    expect(parseInstant('2026-10-01T23:29:00.123Z')).toEqual(
      new Date('2026-10-01T23:29:00.123Z')
    )
  })

  it('reads a date-only value as midnight UTC', () => {
    expect(parseInstant('2026-03-05')).toEqual(utc(2026, 3, 5))
  })

  it('passes a Date through', () => {
    const date = new Date(BST_FIRST_HOUR)
    expect(parseInstant(date)).toBe(date)
  })

  it.each([[null], [undefined], [''], ['not-a-date']])(
    'answers null for %s',
    (value) => {
      expect(parseInstant(value)).toBeNull()
    }
  )
})

describe('#formatMomentAsLongDay', () => {
  it('dates a moment in the first hour of a BST day on the UK day', () => {
    expect(formatMomentAsLongDay(new Date(BST_FIRST_HOUR))).toBe(
      '2 October 2026'
    )
  })

  it('dates a late-evening GMT moment on the same day', () => {
    expect(formatMomentAsLongDay(new Date('2026-01-15T23:29:00Z'))).toBe(
      '15 January 2026'
    )
  })

  it('dates a backend timestamp on the UK day in a Europe/London process', () => {
    runInZone(SERVICE_TIME_ZONE, () => {
      expect(formatMomentAsLongDay(parseInstant('2026-10-01T23:29:00'))).toBe(
        '2 October 2026'
      )
      expect(formatMomentAsLongDay(parseInstant('2026-01-15T23:29:00'))).toBe(
        '15 January 2026'
      )
    })
  })
})

describe('#formatMomentAsDay', () => {
  it('takes the UK day in the hour BST and UTC disagree', () => {
    expect(formatMomentAsDay(new Date(BST_FIRST_HOUR))).toBe('2 Oct 2026')
  })

  it('agrees with the UTC day in GMT', () => {
    expect(formatMomentAsDay(new Date('2026-01-15T23:29:00Z'))).toBe(
      '15 Jan 2026'
    )
  })
})

describe('#formatCalendarDate', () => {
  it('renders the day a midnight-UTC value names', () => {
    expect(formatCalendarDate(utc(2026, 9, 5))).toBe('5 Sep 2026')
  })
})

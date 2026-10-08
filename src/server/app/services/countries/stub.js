import { countries, countriesOrigin } from '../_capture/fixtures.js'

export const ADDRESS_BOOK_COUNTRY_LABELS = Object.fromEntries(
  countries.map(({ code, name }) => [code, name])
)

export const COUNTRY_LABELS = Object.fromEntries(
  countriesOrigin.map(({ code, name }) => [code, name])
)

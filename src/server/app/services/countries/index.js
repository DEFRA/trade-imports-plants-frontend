import { referenceDataUnavailable } from '../reference-data-unavailable.js'
import {
  ADDRESS_BOOK_COUNTRY_LABELS,
  COUNTRY_LABELS,
  COUNTRY_SUBDIVISIONS
} from './stub.js'
import { fetchCountries } from './client.js'
import { isStubMode } from '../../../common/services/mode.js'

let labels = { ...COUNTRY_LABELS }
let subdivisionLabels = { ...COUNTRY_SUBDIVISIONS.labels }
let subdivisionToParent = { ...COUNTRY_SUBDIVISIONS.parents }
let loaded = false
let addressBookLabels = { ...ADDRESS_BOOK_COUNTRY_LABELS }
let addressBookLoaded = false

const indexSubDivisions = (countries) => {
  const nextSubdivisionLabels = {}
  const nextSubdivisionToParent = {}

  for (const country of countries) {
    for (const subdivision of country.subDivisions ?? []) {
      nextSubdivisionLabels[subdivision.code] = subdivision.name
      nextSubdivisionToParent[subdivision.code] = country.code
    }
  }

  subdivisionLabels = nextSubdivisionLabels
  subdivisionToParent = nextSubdivisionToParent
}

/**
 * Loads the SPS country list from reference data unless it is already loaded
 * or the service runs in stub mode.
 *
 * @throws {import('@hapi/boom').Boom} a 503 when the load fails; the next call
 * tries again.
 */
export const ensureLoaded = async () => {
  if (isStubMode() || loaded) {
    return
  }
  try {
    const countries = await fetchCountries(['GBNAG_SPS_EX'])
    labels = Object.fromEntries(countries.map(({ code, name }) => [code, name]))
    indexSubDivisions(countries)
    loaded = true
  } catch (err) {
    throw referenceDataUnavailable('countries', err)
  }
}

const UNITED_KINGDOM = 'United Kingdom'
const UNITED_KINGDOM_CODE = 'GB'

export const isSubdivisionCode = (code) =>
  code != null && Object.hasOwn(subdivisionLabels, code)

export const parentCountryCode = (code) => subdivisionToParent[code] ?? code

export const originLabel = async (code) => {
  await ensureLoaded()
  if (code == null || code === '') {
    return undefined
  }
  if (isSubdivisionCode(code)) {
    return subdivisionLabels[code]
  }
  return (
    labels[code] ?? (code === UNITED_KINGDOM_CODE ? UNITED_KINGDOM : undefined)
  )
}

const subdivisionDisplayLabel = (code) => {
  const subdivisionName = subdivisionLabels[code]
  const parentName = labels[parentCountryCode(code)]
  return parentName ? `${subdivisionName} (${parentName})` : subdivisionName
}

/** A country or subdivision as a review row shows it, a subdivision named with its parent country. */
export const countryDisplayLabel = async (code) => {
  await ensureLoaded()
  if (code == null || code === '') {
    return ''
  }
  if (isSubdivisionCode(code)) {
    return subdivisionDisplayLabel(code)
  }
  return (await originLabel(code)) ?? code
}

export const originCountries = async () => {
  await ensureLoaded()
  return Object.entries(labels).map(([value, text]) => ({ value, text }))
}

const countryAndSubdivisionOptions = async (subdivisionText) => {
  await ensureLoaded()
  const countryOptions = Object.entries(labels).map(([value, text]) => ({
    value,
    text
  }))
  const subdivisionOptions = Object.keys(subdivisionLabels).map((value) => ({
    value,
    text: subdivisionText(value)
  }))
  return [...countryOptions, ...subdivisionOptions].sort((left, right) =>
    left.text.localeCompare(right.text)
  )
}

/** Flat country and subdivision entries for the origin page only. */
export const originCountryOptions = () =>
  countryAndSubdivisionOptions((code) => subdivisionLabels[code])

/** Countries and their subdivisions for a destination select, one alphabetical list, each subdivision named with its parent country. */
export const destinationCountryOptions = () =>
  countryAndSubdivisionOptions(subdivisionDisplayLabel)

export const addressCountries = async () => {
  await ensureLoaded()
  return [UNITED_KINGDOM, ...Object.values(labels)]
}

const ensureAddressBookCountriesLoaded = async () => {
  if (isStubMode() || addressBookLoaded) {
    return
  }
  try {
    const countries = await fetchCountries()
    addressBookLabels = Object.fromEntries(
      countries.map(({ code, name }) => [code, name])
    )
    addressBookLoaded = true
  } catch (err) {
    throw referenceDataUnavailable('countries', err)
  }
}

export const addressBookCountries = async () => {
  await ensureAddressBookCountriesLoaded()
  return [
    { code: UNITED_KINGDOM_CODE, name: UNITED_KINGDOM },
    ...Object.entries(addressBookLabels)
      .filter(([code]) => code !== UNITED_KINGDOM_CODE)
      .map(([code, name]) => ({ code, name }))
  ]
}

/** The address-book name for a country code, or the code when none matches. */
export const addressBookCountryName = async (code) =>
  (await addressBookCountries()).find((option) => option.code === code)?.name ??
  code

/** The ISO code for a country's display name, `GB` for "United Kingdom". */
export const countryCodeOf = async (name) => {
  await ensureLoaded()
  return name === UNITED_KINGDOM
    ? UNITED_KINGDOM_CODE
    : Object.entries(labels).find(([, label]) => label === name)?.[0]
}

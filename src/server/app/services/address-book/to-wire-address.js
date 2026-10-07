/** The address block a notification keeps, from an address-book display block.
 *
 * Keeps the API's own names (`postcode`, `countryCode`), so a copy taken from
 * the book reads the same as one the trader edits on the notification. */
export const toWireAddress = (address = {}) => ({
  addressLine1: address.addressLine1,
  addressLine2: address.addressLine2,
  townOrCity: address.townOrCity,
  county: address.county,
  postcode: address.postalOrZipCode ?? address.postcode,
  countryCode: address.countryCode
})

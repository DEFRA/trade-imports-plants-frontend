const ADDRESS_PARTS = [
  'addressLine1',
  'addressLine2',
  'townOrCity',
  'county',
  'postcode'
]

/**
 * Every filled part of a stored address, one per entry, without the country.
 *
 * @param {object} [address] - the stored address.
 * @returns {string[]} the parts in reading order.
 */
export const addressParts = (address = {}) =>
  ADDRESS_PARTS.map((part) => address[part]).filter(Boolean)

/**
 * The address parts as one comma-separated line, without the country.
 *
 * @param {object} [address] - the stored address.
 * @returns {string} the line.
 */
export const addressText = (address) => addressParts(address).join(', ')

/**
 * Everything the record holds, one line each: name, address parts, country,
 * telephone and email.
 *
 * @param {object} record - the stored record.
 * @returns {string[]} the lines.
 */
export const detailLines = (record) => {
  const address = record.address ?? {}
  return [
    record.name,
    ...addressParts(address),
    address.country,
    address.phone,
    address.email
  ].filter(Boolean)
}

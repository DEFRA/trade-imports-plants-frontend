const STREET_PARTS = ['addressLine1', 'addressLine2']
const LOCALITY_PARTS = ['townOrCity', 'county', 'postcode']
const ADDRESS_PARTS = [...STREET_PARTS, ...LOCALITY_PARTS]

export const addressText = (address = {}) =>
  ADDRESS_PARTS.map((part) => address[part])
    .filter(Boolean)
    .join(', ')

export const pickerAddressLines = (address = {}) =>
  [
    ...STREET_PARTS.map((part) => address[part]),
    LOCALITY_PARTS.map((part) => address[part])
      .filter(Boolean)
      .join(', ')
  ].filter(Boolean)

export const contactLines = (address = {}) =>
  [address.phone, address.email].filter(Boolean)

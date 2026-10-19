/**
 * The place-of-destination page — where the consignment is going, or where it
 * is being kept now. `headings` and `descriptions` are keyed by the
 * `DESTINATION_STATES` values; everything from `search` down is the address
 * picker's, the same in every state.
 */
const PAGE_NAME = 'Place of destination'

export const copy = {
  title: PAGE_NAME,
  headings: {
    potatoes: PAGE_NAME,
    'not-yet-arrived': PAGE_NAME,
    'already-arrived': 'Where is the consignment now?'
  },
  descriptions: {
    potatoes:
      'Where the goods will be kept after arrival. This is where a plant health inspector may carry out a spot check.',
    'not-yet-arrived':
      'Where the goods will be kept after arrival. This is where a plant health inspector may carry out a spot check.',
    'already-arrived':
      'Give the address where the consignment is being kept. If it is still on its way to its intended destination, give that destination. A plant health inspector may carry out a spot check here.'
  },
  search: {
    label: 'Search',
    hint: 'Name, address or country',
    button: 'Search'
  },
  selectedAddressPrefix: 'Selected address:',
  errorPrefix: 'Error:',
  noMatches: 'No addresses match your search.',
  resultsCaption: (shown, total) => `Showing ${shown} of ${total} addresses`,
  pagination: {
    previous: 'Previous',
    next: 'Next'
  },
  table: {
    selectHidden: 'Select',
    name: 'Name',
    address: 'Address',
    country: 'Country',
    actionsHidden: 'Actions'
  },
  selectRowPrefix: 'Select',
  viewDetails: 'View details',
  viewDetailsFor: 'for',
  errors: {
    placeOfDestination: 'Select a place of destination from the list'
  }
}

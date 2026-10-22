import { describe, expect, it } from 'vitest'

import { SET_BASE } from '../../../../../set.js'
import {
  describePickerViewModel,
  JOURNEY_ID,
  TECH_IMPORTS_ID
} from '../../address-book-picker/test-support.js'
import { PLACE_OF_DESTINATION } from '../fields.js'
import { pagination, resultsHref } from './pagination.js'
import { pickerViewModel } from './index.js'

const SLUG = 'destinations/select'

describe('#resultsHref', () => {
  it('Should carry the search term, the page and the ticked row', () => {
    expect(
      resultsHref(JOURNEY_ID, {
        query: 'imports',
        page: 3,
        selectedId: TECH_IMPORTS_ID
      })
    ).toBe(
      `${SET_BASE}/notifications/${JOURNEY_ID}/${SLUG}?q=imports&page=3&selected=${TECH_IMPORTS_ID}`
    )
  })
})

describePickerViewModel({
  slug: SLUG,
  fieldName: PLACE_OF_DESTINATION,
  pickerViewModel,
  pagination,
  resultsHref
})

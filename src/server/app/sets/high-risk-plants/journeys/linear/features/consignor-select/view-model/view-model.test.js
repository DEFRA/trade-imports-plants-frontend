import { describe, expect, it } from 'vitest'

import { SET_BASE } from '../../../../../set.js'
import {
  describePickerViewModel,
  JOURNEY_ID,
  TECH_IMPORTS_ID
} from '../../address-book-picker/test-support.js'
import { CONSIGNOR } from '../fields.js'
import { pagination, resultsHref } from './pagination.js'
import { pickerViewModel } from './index.js'

const SLUG = 'consignors/select'

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
  fieldName: CONSIGNOR,
  pickerViewModel,
  pagination,
  resultsHref
})

import { describe, expect, it } from 'vitest'

import {
  describePickerViewModel,
  JOURNEY_ID,
  pagePathFor
} from '../../address-book-picker/test-support.js'
import { PLACE_OF_DESTINATION } from '../fields.js'
import { pagination, resultsHref } from './pagination.js'
import { pickerViewModel } from './index.js'

describePickerViewModel({
  fieldName: PLACE_OF_DESTINATION,
  pickerViewModel,
  pagination,
  resultsHref
})

describe('#resultsHref address', () => {
  it('Should point at the destination select page', () => {
    expect(
      resultsHref(JOURNEY_ID, { query: '', page: 1, selectedId: '' })
    ).toBe(`${pagePathFor('destinations/select')}?page=1`)
  })
})

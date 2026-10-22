import { describe, expect, it } from 'vitest'

import {
  describePickerViewModel,
  rowIdPrefixesOnFirstPage
} from '../../address-book-picker/test-support.js'
import { PLACE_OF_DESTINATION } from '../fields.js'
import { pagination, resultsHref } from './pagination.js'
import { pickerViewModel } from './index.js'

describePickerViewModel({
  fieldName: PLACE_OF_DESTINATION,
  slug: 'destinations/select',
  pickerViewModel,
  pagination,
  resultsHref
})

describe('#pickerViewModel row ids', () => {
  it('Should give the first row the field name so the error link focuses it', () => {
    expect(rowIdPrefixesOnFirstPage(pickerViewModel)).toEqual([
      PLACE_OF_DESTINATION,
      `${PLACE_OF_DESTINATION}-2`
    ])
  })
})

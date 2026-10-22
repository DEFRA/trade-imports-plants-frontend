import { describe, expect, it } from 'vitest'

import {
  describePickerViewModel,
  JOURNEY_ID,
  pagePathFor
} from '../../address-book-picker/test-support.js'
import { CONSIGNOR } from '../fields.js'
import { pagination, resultsHref } from './pagination.js'
import { pickerViewModel } from './index.js'

describePickerViewModel({
  fieldName: CONSIGNOR,
  pickerViewModel,
  pagination,
  resultsHref
})

describe('#resultsHref address', () => {
  it('Should point at the consignor select page', () => {
    expect(
      resultsHref(JOURNEY_ID, { query: '', page: 1, selectedId: '' })
    ).toBe(`${pagePathFor('consignors/select')}?page=1`)
  })
})

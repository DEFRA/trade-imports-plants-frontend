import { describe, expect, it } from 'vitest'

import {
  describePickerViewModel,
  JOURNEY_ID,
  pagePathFor
} from '../../address-book-picker/test-support.js'
import { CONTACT_ADDRESS } from '../fields.js'
import { pagination, resultsHref } from './pagination.js'
import { pickerViewModel } from './index.js'

describePickerViewModel({
  fieldName: CONTACT_ADDRESS,
  pickerViewModel,
  pagination,
  resultsHref
})

describe('#resultsHref address', () => {
  it('Should point at the consignment contact select page', () => {
    expect(
      resultsHref(JOURNEY_ID, { query: '', page: 1, selectedId: '' })
    ).toBe(`${pagePathFor('consignment/contact/select')}?page=1`)
  })
})

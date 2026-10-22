import { describe, expect, it } from 'vitest'

import {
  describePickerViewModel,
  rowIdPrefixesOnFirstPage
} from '../../address-book-picker/test-support.js'
import { CONTACT_ADDRESS } from '../fields.js'
import { pagination, resultsHref } from './pagination.js'
import { pickerViewModel } from './index.js'

describePickerViewModel({
  fieldName: CONTACT_ADDRESS,
  slug: 'consignment/contact/select',
  pickerViewModel,
  pagination,
  resultsHref
})

describe('#pickerViewModel row ids', () => {
  it('Should give the first row the field name so the error link focuses it', () => {
    expect(rowIdPrefixesOnFirstPage(pickerViewModel)).toEqual([
      CONTACT_ADDRESS,
      `${CONTACT_ADDRESS}-2`
    ])
  })
})

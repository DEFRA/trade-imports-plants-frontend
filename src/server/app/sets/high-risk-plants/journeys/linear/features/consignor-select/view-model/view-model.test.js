import { describe, expect, it } from 'vitest'

import {
  describePickerViewModel,
  rowIdPrefixesOnFirstPage
} from '../../address-book-picker/test-support.js'
import { CONSIGNOR } from '../fields.js'
import { pagination, resultsHref } from './pagination.js'
import { pickerViewModel } from './index.js'

describePickerViewModel({
  fieldName: CONSIGNOR,
  slug: 'consignors/select',
  pickerViewModel,
  pagination,
  resultsHref
})

describe('#pickerViewModel row ids', () => {
  it('Should give the first row the field name so the error link focuses it', () => {
    expect(rowIdPrefixesOnFirstPage(pickerViewModel)).toEqual([
      CONSIGNOR,
      `${CONSIGNOR}-2`
    ])
  })
})

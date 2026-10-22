import { describePickerViewModel } from '../../address-book-picker/test-support.js'
import { CONSIGNOR } from '../fields.js'
import { pagination, resultsHref } from './pagination.js'
import { pickerViewModel } from './index.js'

describePickerViewModel({
  slug: 'consignors/select',
  fieldName: CONSIGNOR,
  pickerViewModel,
  pagination,
  resultsHref
})

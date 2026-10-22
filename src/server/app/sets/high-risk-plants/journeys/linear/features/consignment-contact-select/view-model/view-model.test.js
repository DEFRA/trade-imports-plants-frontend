import { describePickerViewModel } from '../../address-book-picker/test-support.js'
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

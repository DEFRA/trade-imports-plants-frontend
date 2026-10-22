import { describePickerViewModel } from '../../address-book-picker/test-support.js'
import { CONTACT_ADDRESS } from '../fields.js'
import { pagination, resultsHref } from './pagination.js'
import { pickerViewModel } from './index.js'

describePickerViewModel({
  slug: 'consignment/contact/select',
  fieldName: CONTACT_ADDRESS,
  pickerViewModel,
  pagination,
  resultsHref
})

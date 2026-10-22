import { describePickerViewModel } from '../../address-book-picker/test-support.js'
import { PLACE_OF_DESTINATION } from '../fields.js'
import { pagination, resultsHref } from './pagination.js'
import { pickerViewModel } from './index.js'

describePickerViewModel({
  slug: 'destinations/select',
  fieldName: PLACE_OF_DESTINATION,
  pickerViewModel,
  pagination,
  resultsHref
})

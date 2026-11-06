import { currentOrganisationId } from '../../../../../../common/helpers/organisation-id.js'
import { getTraceId } from '@defra/hapi-tracing'
import { tracingHeader } from '../config.js'

export const ORGANISATION_ID_HEADER = 'Trade-Imports-Organisation-Id'

export const headers = () => {
  const organisationId =
    currentOrganisationId() ??
    (process.env.NODE_ENV === 'test' ? '5900001' : undefined)
  if (!organisationId) {
    throw new Error(
      'Cannot reach the notifications backend without an organisation from the signed-in session'
    )
  }
  return {
    'Content-Type': 'application/json',
    [tracingHeader]: getTraceId() ?? '',
    [ORGANISATION_ID_HEADER]: organisationId
  }
}

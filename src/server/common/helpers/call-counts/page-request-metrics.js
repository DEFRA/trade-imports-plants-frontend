import { Metrics } from '@defra/cdp-metrics'

import { config } from '../../../../config/config.js'
import { createLogger } from '../logging/logger.js'

const logger = createLogger()

/**
 * Emits one EMF document for a finished page request: its backend calls and session resolutions.
 *
 * @param {{ backendCalls: number, sessionResolutions: number }} counts - what the request made
 * @returns {Promise<void>} rejects when the document cannot be written
 */
export const recordPageRequest = async ({
  backendCalls,
  sessionResolutions
}) => {
  const metricsLogger = new Metrics(logger).getMetricsLogger({
    'request.kind': 'page'
  })
  metricsLogger.setNamespace(config.get('metrics.namespace'))
  metricsLogger.putMetric('page.request.backend.calls', backendCalls, 'Count')
  metricsLogger.putMetric(
    'page.request.session.resolutions',
    sessionResolutions,
    'Count'
  )
  await metricsLogger.flush()
}

/**
 * Emits the document without making the request wait for the flush, and logs a warning when it cannot be written.
 *
 * @param {{ backendCalls: number, sessionResolutions: number }} counts - what the request made
 */
export const recordPageRequestInBackground = (counts) => {
  recordPageRequest(counts).catch((error) => {
    logger.warn({ err: error }, 'Could not record page request counts')
  })
}

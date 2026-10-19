import { referenceDataUnavailable } from '../reference-data-unavailable.js'
import { PORTS } from './stub.js'
import { fetchPortsOfEntry } from './client.js'
import { isStubMode } from '../../../common/services/mode.js'

let ports = [...PORTS]
let loaded = false

/**
 * Loads the port-of-entry list from reference data unless it is already loaded
 * or the service runs in stub mode.
 *
 * @throws {import('@hapi/boom').Boom} a 503 when the load fails; the next call
 * tries again.
 */
export const ensureLoaded = async () => {
  if (isStubMode() || loaded) {
    return
  }
  try {
    ports = await fetchPortsOfEntry()
    loaded = true
  } catch (err) {
    throw referenceDataUnavailable('ports', err)
  }
}

export const list = async () => {
  await ensureLoaded()
  return ports
}

const displayName = (port) => `${port.name} - ${port.code}`

export const label = async (code) => {
  await ensureLoaded()
  const port = ports.find((entry) => entry.code === code)
  return port ? displayName(port) : undefined
}

export const portOptions = async () => {
  await ensureLoaded()
  return ports.map((port) => ({ value: port.code, text: displayName(port) }))
}

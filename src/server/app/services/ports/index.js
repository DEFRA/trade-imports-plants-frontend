import { PORTS } from './stub.js'
import { fetchPortsOfEntry } from './client.js'
import { isStubMode } from '../../../common/services/mode.js'

let ports = [...PORTS]

export const prime = async () => {
  if (isStubMode()) {
    return
  }
  ports = await fetchPortsOfEntry()
}

export const list = () => ports

const displayName = (port) => `${port.name} (${port.code})`

export const label = (code) => {
  const port = ports.find((entry) => entry.code === code)
  return port ? displayName(port) : undefined
}

export const portOptions = () =>
  ports.map((port) => ({ value: port.code, text: displayName(port) }))

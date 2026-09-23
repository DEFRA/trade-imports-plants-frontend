import { AsyncLocalStorage } from 'node:async_hooks'

const storage = new AsyncLocalStorage()
const mounts = new Map()

export const registerSetMount = (setId, prefix) => {
  if (!prefix?.startsWith('/')) {
    throw new Error(`Set "${setId}" needs a mount prefix`)
  }
  mounts.set(setId, prefix)
}

export const mountedSetIds = () => [...mounts.keys()]

const soleSetId = () => (mounts.size === 1 ? [...mounts.keys()][0] : undefined)

/**
 * Whether a set can be resolved at all.
 *
 * A server-wide route — the root redirect, `/signout`, the sign-in error page,
 * the shared error page reached from outside every set — belongs to no set, so
 * anything set-owned has no answer for it. Ask this before reaching for a set
 * rather than catching the throw.
 *
 * @returns {boolean} true when `currentSetId()` would answer.
 */
export const hasSetContext = () =>
  (storage.getStore()?.setId ?? soleSetId()) !== undefined

export const currentSetId = () => {
  const id = storage.getStore()?.setId ?? soleSetId()
  if (!id) {
    // Naming the mounted sets separates the two ways this fires: nothing has
    // booted yet, or several sets are mounted and the caller is outside any
    // request's context.
    throw new Error(
      `No set context — no active set, and ${
        mounts.size === 0
          ? 'no set is mounted'
          : `${mounts.size} sets are mounted (${mountedSetIds().join(', ')})`
      }`
    )
  }
  return id
}

export const currentSetBase = () => {
  const setId = currentSetId()
  const base = mounts.get(setId)
  if (base === undefined) {
    throw new Error(`Set "${setId}" has no registered mount`)
  }
  return base
}

export const withSetContext = (setId, fn) => storage.run({ setId }, fn)

export const enterSetContext = (setId) => storage.enterWith({ setId })

const contextualMethod = (setId, method) =>
  typeof method === 'function'
    ? (request, h) => withSetContext(setId, () => method(request, h))
    : method

const contextualExtension = (setId, extension) => {
  if (Array.isArray(extension)) {
    return extension.map((item) => contextualExtension(setId, item))
  }
  if (typeof extension === 'function') {
    return contextualMethod(setId, extension)
  }
  return {
    ...extension,
    method: contextualMethod(setId, extension.method)
  }
}

export const routeWithSetContext = (setId, route) => {
  const ext = route.options?.ext
  return {
    ...route,
    ...(ext && {
      options: {
        ...route.options,
        ext: Object.fromEntries(
          Object.entries(ext).map(([point, extension]) => [
            point,
            contextualExtension(setId, extension)
          ])
        )
      }
    }),
    handler: contextualMethod(setId, route.handler)
  }
}

// Every per-set store, under the label it was created with. It is what lets
// `shared/set-completeness.js` ask, at mount time, which seams a set never
// configured — without each seam module having to export a predicate of its
// own, and without the check reaching into eight modules' internals.
const seamStores = new Map()

/**
 * The labels of every per-set seam store created so far.
 *
 * A seam module that has not been imported has created no store, so its label
 * is absent. Used to catch a required-seam list that has drifted from the
 * labels the engine actually uses.
 *
 * @returns {string[]} the labels, in creation order.
 */
export const knownSeamLabels = () => [...seamStores.keys()]

/**
 * Whether the seam called `label` holds a configuration for `setId`.
 *
 * Answers false for a label no module has claimed, which is the fail-safe
 * direction: a completeness check then reports the seam as missing rather than
 * passing a set that never configured it.
 *
 * @param {string} label the seam's store label.
 * @param {string} setId the set to ask about.
 * @returns {boolean} true when that set configured that seam.
 */
export const seamConfiguredFor = (label, setId) =>
  seamStores.get(label)?.has(setId) ?? false

export const setKeyed = (label) => {
  const bySet = new Map()
  const store = {
    configure: (setId, value) => bySet.set(setId, value),
    current: () => {
      const setId = currentSetId()
      if (!bySet.has(setId)) {
        throw new Error(`${label} not configured for set "${setId}"`)
      }
      return bySet.get(setId)
    },
    has: (setId) => bySet.has(setId)
  }
  // Last registration wins: after `vi.resetModules()` a re-imported seam module
  // holds the live store and the one it replaces is unreachable.
  seamStores.set(label, store)
  return store
}

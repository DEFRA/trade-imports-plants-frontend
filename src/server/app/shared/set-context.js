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

/**
 * The seams a mounted set MUST configure, indexed by label as each seam module
 * loads. A seam opts in by naming the function that configures it, so the
 * completeness check at mount reads this rather than a hand-kept list a new
 * seam could quietly fall out of.
 *
 * Seams with a real default — the answers-for-read sanitiser, the flow-only
 * keys the journey flow forwards — register nothing here: a set that leaves
 * them alone is correctly configured.
 */
const requiredSeams = new Map()

/**
 * A per-set store for one configuration seam.
 *
 * @param {string} label - the seam's name, as it appears in error messages.
 * @param {object} [options] - seam options.
 * @param {string} [options.configuredBy] - the configure function a set calls
 * to fill this seam. Naming it marks the seam required, so a set that mounts
 * without calling it is rejected at registration.
 * @returns {{configure: Function, current: Function, has: Function}} the store.
 */
export const setKeyed = (label, { configuredBy } = {}) => {
  const bySet = new Map()
  const has = (setId) => bySet.has(setId)
  if (configuredBy) {
    requiredSeams.set(label, { configuredBy, has })
  }
  return {
    configure: (setId, value) => bySet.set(setId, value),
    current: () => {
      const setId = currentSetId()
      if (!bySet.has(setId)) {
        throw new Error(`${label} not configured for set "${setId}"`)
      }
      return bySet.get(setId)
    },
    has
  }
}

/** Every required seam's label, in the order the seam modules declared them. */
export const requiredSeamLabels = () => [...requiredSeams.keys()]

/**
 * The required seams a set has not configured, each named alongside the call
 * that would configure it.
 *
 * @param {string} setId - the set to check.
 * @returns {string[]} descriptions such as `journey flow (configureJourneyFlow)`,
 * empty when the set has configured every required seam.
 */
export const unconfiguredSeamsOf = (setId) =>
  [...requiredSeams]
    .filter(([, seam]) => !seam.has(setId))
    .map(([label, { configuredBy }]) => `${label} (${configuredBy})`)

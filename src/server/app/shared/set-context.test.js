import { describe, expect, it, vi } from 'vitest'

/**
 * Every test gets its own copy of the module, because the mounted-set registry
 * is module state. A fresh copy starts with nothing mounted, which is the
 * un-booted case several of these tests need.
 */
const freshModule = async () => {
  vi.resetModules()
  return import('./set-context.js')
}

const PLANTS = 'high-risk-plants'
const PLANTS_BASE = '/high-risk-plants'
const SECOND_SET = 'second-set'
const SECOND_SET_BASE = '/second-set'
const PLANTS_VALUE = 'plants value'

describe('#registerSetMount', () => {
  it('Should refuse a set that names no mount prefix', async () => {
    const { registerSetMount } = await freshModule()

    expect(() => registerSetMount(PLANTS)).toThrow(
      `Set "${PLANTS}" needs a mount prefix`
    )
  })

  it('Should refuse a mount prefix that is not rooted', async () => {
    const { registerSetMount } = await freshModule()

    expect(() => registerSetMount(PLANTS, PLANTS)).toThrow(
      `Set "${PLANTS}" needs a mount prefix`
    )
  })

  it('Should list the sets it has mounted, in the order they mounted', async () => {
    const { mountedSetIds, registerSetMount } = await freshModule()

    expect(mountedSetIds()).toEqual([])

    registerSetMount(PLANTS, PLANTS_BASE)
    registerSetMount(SECOND_SET, SECOND_SET_BASE)

    expect(mountedSetIds()).toEqual([PLANTS, SECOND_SET])
  })
})

describe('#currentSetId', () => {
  it('Should say no set is mounted before anything has booted', async () => {
    const { currentSetId } = await freshModule()

    expect(() => currentSetId()).toThrow(
      'No set context — no active set, and no set is mounted'
    )
  })

  it('Should fall back to the sole mounted set outside a request', async () => {
    const { currentSetId, registerSetMount } = await freshModule()
    registerSetMount(PLANTS, PLANTS_BASE)

    expect(currentSetId()).toBe(PLANTS)
  })

  it('Should name the mounted sets when several are up and no set is active', async () => {
    const { currentSetId, registerSetMount } = await freshModule()
    registerSetMount(PLANTS, PLANTS_BASE)
    registerSetMount(SECOND_SET, SECOND_SET_BASE)

    expect(() => currentSetId()).toThrow(
      `No set context — no active set, and 2 sets are mounted (${PLANTS}, ${SECOND_SET})`
    )
  })

  it('Should prefer the active set over the sole mounted one', async () => {
    const { currentSetId, registerSetMount, withSetContext } =
      await freshModule()
    registerSetMount(PLANTS, PLANTS_BASE)

    expect(withSetContext(SECOND_SET, () => currentSetId())).toBe(SECOND_SET)
  })
})

describe('#currentSetBase', () => {
  it('Should give the active set the mount it registered', async () => {
    const { currentSetBase, registerSetMount, withSetContext } =
      await freshModule()
    registerSetMount(PLANTS, PLANTS_BASE)
    registerSetMount(SECOND_SET, SECOND_SET_BASE)

    expect(withSetContext(SECOND_SET, () => currentSetBase())).toBe(
      SECOND_SET_BASE
    )
  })

  it('Should give an active set with no registered mount an empty base', async () => {
    const { currentSetBase, registerSetMount, withSetContext } =
      await freshModule()
    registerSetMount(PLANTS, PLANTS_BASE)

    expect(withSetContext('never-mounted', () => currentSetBase())).toBe('')
  })
})

describe('#enterSetContext', () => {
  it('Should make a set active for the rest of the surrounding context', async () => {
    const { currentSetId, enterSetContext, registerSetMount, withSetContext } =
      await freshModule()
    registerSetMount(PLANTS, PLANTS_BASE)

    const seen = withSetContext(PLANTS, () => {
      enterSetContext(SECOND_SET)
      return currentSetId()
    })

    expect(seen).toBe(SECOND_SET)
  })
})

describe('#routeWithSetContext', () => {
  it('Should run a handler inside its own set context', async () => {
    const { currentSetId, registerSetMount, routeWithSetContext } =
      await freshModule()
    registerSetMount(PLANTS, PLANTS_BASE)
    registerSetMount(SECOND_SET, SECOND_SET_BASE)

    const route = routeWithSetContext(SECOND_SET, {
      method: 'GET',
      path: '/probe',
      handler: () => currentSetId()
    })

    expect(route.handler({}, {})).toBe(SECOND_SET)
  })

  it('Should pass a handler that is not a function straight through', async () => {
    const { registerSetMount, routeWithSetContext } = await freshModule()
    registerSetMount(PLANTS, PLANTS_BASE)
    const handler = { directory: { path: '.public' } }

    expect(
      routeWithSetContext(PLANTS, { method: 'GET', path: '/assets', handler })
        .handler
    ).toBe(handler)
  })

  it('Should leave a route that registers no extension without one', async () => {
    const { registerSetMount, routeWithSetContext } = await freshModule()
    registerSetMount(PLANTS, PLANTS_BASE)

    const route = routeWithSetContext(PLANTS, {
      method: 'GET',
      path: '/probe',
      handler: () => null
    })

    expect(route.options).toBeUndefined()
  })

  it('Should run a bare-function extension inside the set context', async () => {
    const { currentSetId, registerSetMount, routeWithSetContext } =
      await freshModule()
    registerSetMount(PLANTS, PLANTS_BASE)
    registerSetMount(SECOND_SET, SECOND_SET_BASE)

    const route = routeWithSetContext(SECOND_SET, {
      method: 'GET',
      path: '/probe',
      handler: () => null,
      options: { auth: false, ext: { onPreHandler: () => currentSetId() } }
    })

    expect(route.options.auth).toBe(false)
    expect(route.options.ext.onPreHandler({}, {})).toBe(SECOND_SET)
  })

  it('Should run every extension in an array inside the set context', async () => {
    const { currentSetId, registerSetMount, routeWithSetContext } =
      await freshModule()
    registerSetMount(PLANTS, PLANTS_BASE)
    registerSetMount(SECOND_SET, SECOND_SET_BASE)

    const route = routeWithSetContext(SECOND_SET, {
      method: 'GET',
      path: '/probe',
      handler: () => null,
      options: {
        ext: {
          onPreHandler: [{ method: () => currentSetId() }, () => currentSetId()]
        }
      }
    })

    const [first, second] = route.options.ext.onPreHandler

    expect(first.method({}, {})).toBe(SECOND_SET)
    expect(second({}, {})).toBe(SECOND_SET)
  })

  it('Should keep the other options an extension entry carries', async () => {
    const { registerSetMount, routeWithSetContext } = await freshModule()
    registerSetMount(PLANTS, PLANTS_BASE)

    const route = routeWithSetContext(PLANTS, {
      method: 'GET',
      path: '/probe',
      handler: () => null,
      options: {
        ext: {
          onPreHandler: { method: () => null, options: { sandbox: 'plugin' } }
        }
      }
    })

    expect(route.options.ext.onPreHandler.options).toEqual({
      sandbox: 'plugin'
    })
  })
})

describe('#setKeyed', () => {
  it('Should answer with the value configured for the active set', async () => {
    const { registerSetMount, setKeyed, withSetContext } = await freshModule()
    registerSetMount(PLANTS, PLANTS_BASE)
    registerSetMount(SECOND_SET, SECOND_SET_BASE)
    const store = setKeyed('dispatch')

    store.configure(PLANTS, PLANTS_VALUE)
    store.configure(SECOND_SET, 'second-set value')

    expect(withSetContext(PLANTS, () => store.current())).toBe(PLANTS_VALUE)
    expect(withSetContext(SECOND_SET, () => store.current())).toBe(
      'second-set value'
    )
  })

  it('Should name the seam and the set when the set never configured one', async () => {
    const { registerSetMount, setKeyed, withSetContext } = await freshModule()
    registerSetMount(PLANTS, PLANTS_BASE)
    registerSetMount(SECOND_SET, SECOND_SET_BASE)
    const store = setKeyed('journey flow')
    store.configure(PLANTS, PLANTS_VALUE)

    expect(() => withSetContext(SECOND_SET, () => store.current())).toThrow(
      `journey flow not configured for set "${SECOND_SET}"`
    )
  })

  it('Should report which sets have configured the seam', async () => {
    const { registerSetMount, setKeyed } = await freshModule()
    registerSetMount(PLANTS, PLANTS_BASE)
    const store = setKeyed('dispatch')

    expect(store.has(PLANTS)).toBe(false)

    store.configure(PLANTS, PLANTS_VALUE)

    expect(store.has(PLANTS)).toBe(true)
  })
})

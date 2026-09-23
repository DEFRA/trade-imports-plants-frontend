import inert from '@hapi/inert'

import { health } from './health/index.js'
import { signout } from './signout/index.js'
import { serveStaticFiles } from './common/helpers/serve-static-files.js'
import { config } from '../config/config.js'
import { highRiskPlants } from './app/routes.js'
import { assertSetConfigured } from './app/shared/set-completeness.js'
import {
  SET_BASE as HIGH_RISK_PLANTS_BASE,
  SET_ID as HIGH_RISK_PLANTS_ID
} from './app/sets/high-risk-plants/set.js'

export const DEFAULT_SET_BASE = HIGH_RISK_PLANTS_BASE

/**
 * Every set this service mounts, in mount order. Adding one here is the whole
 * registration: it gets its own prefix and its seams are checked, so neither
 * can be forgotten separately.
 */
const MOUNTED_SETS = Object.freeze([
  Object.freeze({
    id: HIGH_RISK_PLANTS_ID,
    base: HIGH_RISK_PLANTS_BASE,
    plugin: highRiskPlants
  })
])

export const router = {
  plugin: {
    name: 'router',
    async register(server) {
      await server.register([inert])

      // Health-check route. Used by platform to check if service is running, do not remove!
      await server.register([health])

      // Each set mounts under its own prefix, and none at the root. A set at
      // the root would make a link that doubles or drops the prefix still look
      // right for that set, and the mistake would only show up on another set.
      //
      // Each is then checked for a seam it never configured. A set that skips
      // one gets that seam's unconfigured fallback, and the quiet ones — an
      // empty journey flow, the shared default cookie names — put an empty
      // dashboard in front of a notifier. Refusing to start says so where the
      // person deploying can see it. The check lives here rather than in a
      // gateway so a set cannot opt out of it by forgetting the call.
      for (const { base, id, plugin } of MOUNTED_SETS) {
        await server.register(plugin, { routes: { prefix: base } })
        assertSetConfigured(id)
      }

      // Server-wide, NOT per set. /signout registers happily under a set's
      // prefix and fails only when a user tries to sign out, so it is
      // registered outside the prefixed call and pinned by co-residency.test.js.
      const authEnabled = config.get('auth.enabled')
      if (authEnabled) {
        await server.register([signout])
      }

      // Takes the server's default auth strategy, as the dashboard did when it
      // sat here. Signing in with no stored redirect lands on `/`, so this is
      // what puts a signed-in user on the default set's dashboard.
      server.route({
        method: 'GET',
        path: '/',
        handler: (_request, h) => h.redirect(DEFAULT_SET_BASE)
      })

      // Static assets
      await server.register([serveStaticFiles])
    }
  }
}

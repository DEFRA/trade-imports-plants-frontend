import inert from '@hapi/inert'

import { health } from './health/index.js'
import { serviceRoutes } from './app/routes.js'
import { serveStaticFiles } from './common/helpers/serve-static-files.js'
import { config } from '../config/config.js'
import { SET_BASE as HIGH_RISK_PLANTS_BASE } from './app/sets/high-risk-plants/set.js'

export const DEFAULT_SET_BASE = HIGH_RISK_PLANTS_BASE

export const router = {
  plugin: {
    name: 'router',
    async register(server) {
      await server.register([inert])

      await server.register([health])

      if (config.get('auth.enabled')) {
        // Each set mounts under its own prefix, and none at the root. A set at
        // the root would make a link that doubles or drops the prefix still look
        // right for that set, and the mistake would only show up on another set.
        await server.register(serviceRoutes, {
          routes: { prefix: HIGH_RISK_PLANTS_BASE }
        })

        // Takes the server's default auth strategy, as the dashboard did when it
        // sat here. Signing in with no stored redirect lands on `/`, so this is
        // what puts a signed-in user on the default set's dashboard.
        server.route({
          method: 'GET',
          path: '/',
          handler: (_request, h) => h.redirect(DEFAULT_SET_BASE)
        })
      }

      await server.register([serveStaticFiles])
    }
  }
}

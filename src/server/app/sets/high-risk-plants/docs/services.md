# High-risk-plants services

## The set owns none yet

`src/server/app/sets/high-risk-plants/` declares no services. The set is an
empty scaffold: no obligations, no pages, no reference data.

A set-owned service is the right home for vocabulary that belongs to this
journey rather than to the platform — a commodity catalogue, the options behind
a select, the allow-lists an obligation's gate reads. That vocabulary is domain
data, not a generic platform contract, which is why it lives in the set rather
than under `src/server/app/services/`.

The seam for one is a `configure*` call in
[`src/server/app/routes.js`](../../../routes.js): the set's module is passed in
at boot, so generic code never imports the set. Follow that shape when the first
service lands, and add `obligations/whitelists.test.js` beside the manifest to
check every obligation allow-list against it — a hand-typed allow-list the
service does not recognise is the drift that test exists to catch.

## Platform services used by the journey

The journey calls shared service barrels under `src/server/app/services/`,
documented in [Platform services](../../../docs/services.md):

- countries
- ports
- address book
- transport reference data
- commercial transporters
- import-reason purposes

Each of these is generic. Several currently return empty or stubbed data,
because the values they would serve are journey requirements that have not been
agreed yet.

## Out of scope

There is **no** document-upload service in this repository. The plants alpha
persists obligations and fulfilments only — no uploads, no outbox, no event
publishing and no downstream routing. A page that needs to attach a scanned file
is out of scope until that decision changes.

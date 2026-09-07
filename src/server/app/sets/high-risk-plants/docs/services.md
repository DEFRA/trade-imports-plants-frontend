# High-risk-plants services

## The set owns one: commodities

[`services/commodities/index.js`](../services/commodities/index.js) exports
`commodityTypes()` — the three values a notification may be for, in the order
the journey offers them, frozen so a caller cannot edit the catalogue. It holds
values and nothing else: every label and hint for those values is a copy leaf in
the feature that renders them.

It landed with the commodity-type page because the list is volatile enough that
retyping it into an obligation or a copy module would leave two copies with
nothing holding them in step. The commodities collection increment extends this
same module — categories, genus lists, the per-category allow-lists, the origin
narrowing, and the stub and real clients behind a `configure*` seam in
[`routes.js`](../../../routes.js). It must extend it, not replace it.

A set-owned service is the right home for vocabulary that belongs to this
journey rather than to the platform — a commodity catalogue, the options behind
a select, the allow-lists an obligation's gate reads. That vocabulary is domain
data, not a generic platform contract, which is why it lives in the set rather
than under `src/server/app/services/`.

The seam for one that generic code has to reach is a `configure*` call in
[`src/server/app/routes.js`](../../../routes.js): the set's module is passed in
at boot, so generic code never imports the set. The commodities service needs no
such seam yet — only this journey's own controller reads it. Follow that shape
when generic code first needs it, and add `obligations/whitelists.test.js`
beside the manifest with the first obligation allow-list, to check it against
the service — a hand-typed allow-list the service does not recognise is the
drift that test exists to catch.

## Platform services used by the journey

The journey calls shared service barrels under `src/server/app/services/`,
documented in [Platform services](../../../docs/services.md):

- countries
- ports
- address book

Each of these is generic. Countries and ports are primed from the reference-data
service when the application runs in real mode, and serve stub data otherwise.

The reason-for-import/purpose service and the transport and transporter services
were removed because this journey asks no such question: behaviour
`import-reason-purpose-service-unused` records that no plants source asks a
reason-for-import or purpose, and behaviour `customs-no-sps-hold-or-matching`
records that the journey collects no transport or port-of-exit details. Do not
restore them without a behaviour that needs them.

## Out of scope

There is **no** document-upload service in this repository. The plants alpha
persists obligations and fulfilments only — no uploads, no outbox, no event
publishing and no downstream routing. A page that needs to attach a scanned file
is out of scope until that decision changes.

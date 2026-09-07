# High-risk-plants obligation set

The high-risk-plants manifest is
[`src/server/app/sets/high-risk-plants/obligations/index.js`](../obligations/index.js).
It is expected to import declarations from `obligations/sections/`, export each
obligation, build the ordered `obligations` array and derive `groups` from
`within` references.

Today it declares one obligation, `commodityType`:

```js
import { commodityType } from './sections/commodity.js'

export { commodityType }

export const obligations = [commodityType]

export const groups = obligations.filter((obligation) =>
  obligations.some((other) => other.within === obligation)
)
```

`groups` is derived, not hand-maintained. It stays derived as the array fills.

The commodity-type page increment created `obligations/sections/`, and
[`sections/commodity.js`](../obligations/sections/commodity.js) is the smallest
a section module gets — identity, name and a direct mandate. Obligations that
carry scope, cardinality or grouping add `applyTo`, `requires` or `within` from
the platform helpers; see [Obligation shape](#obligation-shape) below:

```js
export const commodityType = {
  id: '9f2c4b71-3e58-4a6d-9c02-71d8f5a3e6b4',
  name: 'commodityType',
  status: 'mandatory'
}
```

## Sections

Split declarations by domain, one module per section, as the journey grows.

This document deliberately does **not** list the sections this set will need.
The journey's requirements are not agreed yet, and writing a candidate list here
would turn a guess into something a later reader treats as settled. Derive the
sections from the requirements when they land.

Create a section module when its first obligation lands, not before. An empty
module is a liability: it reads as coverage that does not exist.

The declarations use helper functions from the platform model. They contain
stable identity, scope, mandate and cardinality rules, but no display copy and
no journey knowledge.

## Obligation shape

An obligation has a stable UUID `id`, a path-safe `name` and either a direct
`status` or an `applyTo` rule that returns scope and mandate. Collection members
use `within` to point at their parent group object, by identity — a real import,
not a copy. `requires` carries cardinality or cross-field invariants.

A name cannot contain `.`, `[` or `]`. The same vocabulary is used for
fulfilment paths and page dispatch, so a path metacharacter makes
`buildDispatch` throw at boot.

## The model has no display copy

Obligations describe domain applicability and completeness. They carry no
titles, labels, hints, legends, options, error messages, routes or template
names. Copy belongs to the feature; validation belongs to the controller.

[`src/server/app/obligation-purity.js`](../../../obligation-purity.js) and
[`src/server/app/model/no-display-keys.js`](../../../model/no-display-keys.js)
enforce this at boot. `assertObligationPurity()` runs in
[`routes.js`](../../../routes.js) before routes are added, so a display-shaped
key in the model fails the server start, not a test.

## Registration

[`src/server/app/routes.js`](../../../routes.js) imports the manifest namespace
and passes it to `configureObligationSet()`. Generic model and bridge code then
reads the set through
[`src/server/app/model/obligations/manifest.js`](../../../model/obligations/manifest.js).

The journey's feature bindings import the same obligation objects from this set.
That shared object identity is what lets the fulfilment registry check that
every leaf is owned once and that grouped binding paths match each `within`
chain. A structurally identical copy is rejected.

The Vitest suite does NOT wire this set: `test/setup-obligation-set.js` installs a
synthetic journey-neutral fixture from `test/fixtures/` instead, because the
engine is journey-agnostic and its tests must not depend on the installed set.

## Set checks

The animals set keeps two set-owned test modules beside its manifest, and this
set should gain the same pair with its first obligations:

- `obligations/coverage.test.js` — manifest identity (no duplicate UUID, no
  duplicate name), `within` chains, group invariants and gate dependencies
- `obligations/whitelists.test.js` — any commodity allow-list checked against
  the set-owned reference service, so the two cannot drift

Neither file exists yet. Write `coverage.test.js` with the first obligation and
`whitelists.test.js` with the first allow-list.

The generic model contract is in the
[platform obligation-model guide](../../../docs/obligation-model.md).

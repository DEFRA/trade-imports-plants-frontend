# high-risk-plants set and linear journey

The high-risk-plants obligation set. It is **empty**: no obligations, no journey
pages, no task rows, no flow sections. The engine and the bridge under
`src/server/app/` are generic and fully present; this set is the only
thing that carries plant domain content, and it carries none yet.

Read the generic documentation in [`../../../docs/`](../../../docs/README.md)
for how the engine works. This file records what is specific to the set being
empty; the guides and recipes below carry the rules for filling it.

## Run and test

Run commands from the repository root.

```bash
npm run dev
npm run test:high-risk-plants
npm test
PORT=3053 npm run test:fit:features
npm run test:fit:journeys
```

`npm run test:high-risk-plants` runs only tests under
`src/server/app/sets/high-risk-plants`. Use `npm test` for L1 composition,
bridge, convention and full-suite coverage.

The Playwright default port is 3003, the same port the workspace stack serves
this frontend on. Pass `PORT=3053` when the stack is up so the two do not
collide; `npm run test:fit:ci` does this for you.

## Set and journey guides

- [Obligation set](obligation-model.md)
- [Feature anatomy](features.md)
- [Journey flow and gates](journey-flow-and-gates.md)
- [Set-owned services](services.md)
- [High-risk-plants limits](limits.md)
- [Testing the set and journey](testing.md)
- [Lighthouse](lighthouse.md)

## Recipes

- [Add a field](add-a-field.md)
- [Add a page](add-a-page.md)
- [Add a feature group, flow section and task row](add-a-section.md)
- [Add a repeatable collection](add-a-collection.md)

## Platform guides used by this set

- [Architecture](../../../docs/architecture.md)
- [Engine](../../../docs/engine.md)
- [Flow machinery](../../../docs/flow-and-gates.md)
- [Scope and wipe](../../../docs/scope-and-wipe.md)
- [Validation](../../../docs/validation.md)
- [Persistence](../../../docs/persistence.md)
- [Collection cardinality](../../../docs/cardinality.md)
- [Testing the platform](../../../docs/testing.md)

## What the set exports, and what consumes it

| File                                             | Exports                                       | Consumed by                                                 |
| ------------------------------------------------ | --------------------------------------------- | ----------------------------------------------------------- |
| `obligations/index.js`                           | `obligations`, `groups`                       | `configureObligationSet`                                    |
| `journeys/linear/config.js`                      | `TEMPLATES`, `LAYOUT`, `SESSION_COOKIE_NAMES` | `configureJourneyFlow`, `configureSession`, set controllers |
| `journeys/linear/features/index.js`              | `dispatchPages`, `allRoutes`                  | `buildDispatch`, `server.route`                             |
| `journeys/linear/features/evaluation.js`         | `featureEvaluationBindings`                   | `configureFulfilmentRegistry`                               |
| `journeys/linear/flow/flow.js`                   | `FLOW_ONLY_KEYS`, `sections`                  | `configureJourneyFlow`                                      |
| `journeys/linear/flow/task-rows.js`              | `taskRows`, `rowStatus`                       | `configureJourneyFlow`                                      |
| `journeys/linear/flow/section-captions/index.js` | `captionSections`, `sectionCaptionOf`         | `configureJourneyFlow`                                      |
| `journeys/linear/flow/run.js`                    | `nextRunTarget`                               | `configureJourneyFlow`                                      |
| `journeys/linear/flow/entry-guard.js`            | `entryGuardTarget`                            | `server.ext('onPreHandler')`                                |

[`src/server/app/routes.js`](../../../routes.js) is the composition seam that
wires all nine. The unit suite installs a synthetic journey-neutral fixture
from `test/fixtures/` instead — the engine must not depend on the set.

## The served surface today

With `allRoutes` empty the service answers `/health`, the auth and
sign-out routes, and the static assets. There is no `/` — the dashboard
and the hub are set-owned journey chrome, and neither has been written.
A 404 on the root is the expected zero-page state, not a failed boot.

This passage is the only description of the served surface. The repo
README and the platform README link here rather than repeat it. Update
it here when the first page lands.

## Adding the first obligation is a three-part change

Three boot guards enforce a joint invariant, so an obligation, the page
that collects it and the binding that owns it must land together:

1. `buildDispatch` → `assertFullCoverage` throws
   `Obligations collected by no page` for any obligation that no page
   names in `collects` and that is not in the generic
   `SYSTEM_POPULATED` set.
2. `assertFulfilmentBindingCoverage` → `createFulfilmentRegistry` throws
   `obligations owned by no feature` for any leaf obligation (one that
   nothing declares itself `within`) that no feature binding claims.
3. The registry also requires the binding to import the **same object
   instance** the manifest exports — a structurally identical copy fails
   with `must import its obligation object from the manifest`.

Build bindings with `feature`, `scalar` and `grouped` from
[`../../../bridge/fulfilment-bindings.js`](../../../bridge/fulfilment-bindings.js).

## Gates on the first journey-page increment

**The entry guard is restored — gate closed.**
`flow/entry-guard.js` is live, against this journey's entry page
`commodity-type`. Its `guardedJourneyPath` filter skips anything outside
`/notifications/<id>/`, the create path, the
`amend`/`cancel-amend`/`copy`/`delete` action slugs, and the entry page
and its sub-paths. Every other journey path — the hub included — is
admitted only by one of two let-throughs: `openingRunStarted` for that
journey in this session, or `hasCommittedNotificationAnswers`. Anything
else is redirected to `commodity-type`, so a journey URL alone no longer
reaches a mid-journey page or bypasses the opening run. See
[Journey flow and gates](journey-flow-and-gates.md).

**`configureAnswersForRead` is not wired.** `bridge/answers-read.js`
defaults to identity, which is correct with no party obligations.
Reinstate a set-owned sanitiser when the addresses feature lands, so
answers referencing a deleted address-book record drop out of
fulfilment and evaluation.

**`sectionCaption` is wired — gate closed.**
`flow/section-captions/index.js` holds the caption map with its
`copy.en.js`/`copy.cy.js` pair, and `sectionCaption` is passed in the
`configureJourneyFlow` call in both `routes.js` and
`test/fixtures/index.js` (the fixture with a synthetic map of its own).
The dashboard is the only captioned section so far; each page increment
files its own page there or lists it as bare.

**`FLOW_ONLY_KEYS` is empty.** Add `declaration` with the declaration
page, not before — a flow-only key widens the recognised answer-key
surface for a key nothing can yet write.

## Exemplars this documentation still needs

Every recipe in this folder normally opens with a "Read these files first"
list pointing at a real feature. There are no plants features, so each recipe
carries an `EXEMPLAR PLACEHOLDER` block instead, describing the _shape_ of the
feature that should become its exemplar. Grep for that marker and close the
placeholders out as features land:

| Recipe                                     | Shape of the exemplar it needs                                 |
| ------------------------------------------ | -------------------------------------------------------------- |
| [add-a-page.md](add-a-page.md)             | the smallest complete single-field collecting page             |
| [add-a-field.md](add-a-field.md)           | several fields, conditional scope, service-backed options      |
| [add-a-section.md](add-a-section.md)       | the first multi-page feature group with one hub task row       |
| [add-a-collection.md](add-a-collection.md) | a single-page loop, and a batch split with a nested collection |

Deliberately no feature names. The journey's requirements are not agreed, so
naming a candidate here would be inventing them. Pick the exemplar from whatever
the first increments actually build. Nothing under `journeys/linear/features/`
exists yet, and no recipe should be read as though it did.

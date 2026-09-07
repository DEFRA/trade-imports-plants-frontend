# How to add a feature group and task row

Use this recipe when several new pages form one user task and must appear as one
entry on the hub.

The code uses three separate terms:

- a **feature group** is a nested folder under `journeys/linear/features/` that
  owns related pages, copy and persistence bindings
- a **flow section** is an entry in `journeys/linear/flow/flow.js`; it controls
  page order and `nextInSection()`
- a **task row** is an entry in `journeys/linear/flow/task-rows.js`; it is the
  item shown on the hub and it drives submit readiness

This recipe creates all three. Do not call the hub entry a section in code.

Run every command from the frontend repo root. All other paths in this recipe
are relative to
`src/server/app/sets/high-risk-plants/`.

## Read these files first

> **EXEMPLAR PLACEHOLDER — no plants feature group exists yet.**
>
> This section normally points at the current multi-page feature group. The
> high-risk-plants set owns none. Do not follow the animals paths.
>
> **The exemplar this recipe needs** is a multi-page feature group: several
> pages, one shared copy folder namespaced by page, one `page.js` per page and
> its specs under `fit/`. No feature group is named here on purpose: the
> journey's requirements are not agreed, so naming a candidate would be
> inventing them.
>
> When one is built, replace this block with links to its obligation section,
> `page.js` files, `evaluation.js`, shared copy bundles, each page controller
> and template, and its `fit/` specs — and delete this note.
>
> Note the shape it should demonstrate: **a flow section and a task row are not
> one-to-one.** One flow section can hold several pages while the hub renders
> fewer task rows over them. For a new feature group that needs one hub entry,
> put all of its pages in one new task row.

Trace registration through these, which do exist:

- [`journeys/linear/features/index.js`](../journeys/linear/features/index.js)
- [`journeys/linear/features/evaluation.js`](../journeys/linear/features/evaluation.js)
- [`journeys/linear/flow/flow.js`](../journeys/linear/flow/flow.js)
- [`journeys/linear/flow/task-rows.js`](../journeys/linear/flow/task-rows.js)
- [`journeys/linear/config.js`](../journeys/linear/config.js)
- [`src/server/app/flow/journey-flow.js`](../../../flow/journey-flow.js)
- [`src/server/app/routes.js`](../../../routes.js)

The hub feature and `flow/task-rows.test.js` already exist. The hub lands with
`GROUPS` carrying its four numbered groups, each with an empty `rows` array, and
`taskRows` empty, so the first task row adds only its `taskRows` entry, its
`GROUPS` placement and its rows copy.

## 1. Define the user task and its data

Choose stable ids before writing code:

- feature-group folder name
- flow-section id
- task-row id
- one page id and slug per page
- obligation names and UUIDs

Decide which page owns each obligation. One obligation has one page owner. If a
later page only edits data owned by an earlier collection page, it uses
`collects: []`.

Add the obligations to the matching file under `obligations/sections/`,
creating the folder if this is the first. Re-export them and add them to the
array in [`obligations/index.js`](../obligations/index.js). Use `applyTo`
helpers when answers gate later fields or branches.

Keep obligations and domain code copy-free. Do not put titles, labels, hints,
options, route names or template choices in the model. The feature owns display
copy and the controller owns validation. `assertObligationPurity()` runs at
boot.

Run:

```bash
npm run test:high-risk-plants
```

The fulfilment registry reports each new leaf as owned by no feature. Model
coverage may report ids, names, group paths or gate dependencies first. Fix the
model errors, then continue.

## 2. Create the feature group and bindings

Create this shape:

```text
journeys/linear/features/<group>/
├── copy/
│   ├── copy.cy.js
│   ├── copy.en.js
│   └── copy.test.js
├── fit/
│   └── <group>.fit.spec.js
├── <first-page>/
│   ├── <first-page>.controller.js
│   ├── <first-page>.controller.test.js
│   └── <first-page>.njk
├── <second-page>/
│   ├── <second-page>.controller.js
│   ├── <second-page>.controller.test.js
│   └── <second-page>.njk
├── evaluation.js
└── page.js
```

Keep every `{ id, slug }` object in the import-free `page.js`. Put all
group-owned English and Welsh copy in the shared `copy/` folder, namespaced by
page. Keep the two locale bundles the same shape.

In `evaluation.js`, use `feature('<group>', [...])` and bind every leaf with
`scalar()` or `grouped()`. Import each obligation object from the manifest, not
a copy. Import the bundle in
[`journeys/linear/features/evaluation.js`](../journeys/linear/features/evaluation.js)
and add it to `featureEvaluationBindings`.

Run `npm run test:high-risk-plants`. The fulfilment-registry error should be
gone. Tests that build dispatch now report each new obligation as collected by
no page. Step 3 satisfies dispatch.

## 3. Build each page in journey order

Follow [add-a-page.md](add-a-page.md) for each page. Each controller exports:

- `meta: { ...page, collects: [...] }`
- GET and POST handlers
- `routes`, normally from `kit.pageRoutes(page, { get, post })`

GET reads once through `state.get()`. POST validates raw input, returns 400 with
raw values on error, commits cleaned values on success and redirects through
`kit.nextTarget()`. Wrap every persistence write in `kit.recoverableSave()` and
return the same form with status 500 for a marked failure.

Use `scope.has()` for conditional fields. Do not render, validate or commit a
field that is out of scope. Let the evaluator purge a value when its obligation
leaves scope.

Add each `.njk` view, including the shared error summary and save actions. Use
GOV.UK and MoJ macros; stay inside the govuk-frontend toolbox. Keep input names,
ids and error keys aligned for error-summary focus.

Run `npm run test:high-risk-plants`. At this point copy checks can fail:

- `src/server/app/copy-convention.test.js` requires a complete `copy/` folder for
  a feature with templates
- `src/server/app/copy-parity.test.js` requires equal English and Welsh bundle
  shapes

Complete both bundles and the group copy test before continuing.

## 4. Register every controller and route

Import every controller namespace in
[`journeys/linear/features/index.js`](../journeys/linear/features/index.js).

- Add every controller `meta` to `dispatchPages`, including pages with
  `collects: []`.
- Spread every controller's `routes` into `allRoutes`.

Run `npm run test:high-risk-plants`. `buildDispatch` should pass. If it reports
an uncovered obligation, correct the owning page's `collects`. If it reports two
owners, remove the duplicate claim.

Add one valid POST case per collecting controller to
`src/server/app/contract.test.js`. Each case supplies a valid payload and any
scope seed, and must commit exactly its `meta.collects`.

The contract cases are manually listed. A missing new controller does not make
the test fail. Treat adding each case as required work.
Run `npm test` to exercise the L1 contract table.

## 5. Add the flow section

Import every page identity into
[`journeys/linear/flow/flow.js`](../journeys/linear/flow/flow.js). Add one entry
to `sections`:

```js
{
  id: '<section-id>',
  pages: [firstPage, secondPage]
}
```

The array order is journey order. `nextInSection()` moves through the first
gate-passing later page, then returns to the hub. The section's place among
other sections also controls strictly-earlier continue prerequisites.

Normal page and section gates are derived from `meta.collects`, in-scope
obligations and earlier continue prerequisites. Add an authored `gate` only for
a flow fact that those rules cannot express. Add focused navigation and gate
tests for every conditional page or branch.

Add these pages to [`journeys/linear/flow/run.js`](../journeys/linear/flow/run.js)
— its empty `RUN_STEPS` — only if product behaviour puts them in the opening
run. Update opening-run tests when you do.

## 6. Add one task row and wire it to the hub

Import the page identities in
[`journeys/linear/flow/task-rows.js`](../journeys/linear/flow/task-rows.js) and
add one row:

```js
{ id: '<task-row-id>', pages: [firstPage, secondPage] }
```

The row status defaults to the union of those pages' `collects` — that is what
`rowParts()` computes. Use `parts` only when the row needs a collection facet.
Use `conditional: true` only when the hub must hide a Not applicable row.

Add the task-row id to the right object in the hub controller's `GROUPS` list.
Add the row title and hint to both hub copy bundles. Add a new numbered hub
group only when the design requires a new heading; if so, add its caption to
both locale bundles too.

Update:

- `journeys/linear/flow/task-rows.test.js` for Not yet started, In progress,
  Completed, Optional or Not applicable states, row gate and first entry page
- the hub feature's `copy/copy.test.js` for group copy, row copy, position, link
  and status
- the hub feature spec for the visible task row, lock state, link and completed
  state

Every task row participates in `readyForCheckYourAnswers`. A mandatory new row
therefore blocks Check and submit until it is complete. Prove both the blocked
and complete states in `journeys/linear/flow/task-rows.test.js`.

### Check the journey registration

[`journeys/linear/config.js`](../journeys/linear/config.js) contains the template
prefix, shared layout name and three session cookie names. A new feature group,
flow section or task row does not add a config entry.

[`src/server/app/routes.js`](../../../routes.js) already imports the journey's
`sections`, `taskRows`, `rowStatus`, `nextRunTarget`, `FLOW_ONLY_KEYS`,
`entryGuardTarget`, `sectionCaptionOf` and `LAYOUT`. It passes them to
[`configureJourneyFlow()`](../../../flow/journey-flow.js). Because it injects the
whole exported arrays, adding a section or task row to the existing modules needs
no new L1 import or configure call.

Registration work for the feature group is therefore limited to:

1. add controllers to `dispatchPages` and `allRoutes`
2. add its binding bundle to `featureEvaluationBindings`
3. add page identities to `sections` and `taskRows`
4. add task-row ids and copy to the hub
5. add pages to `run.js` only when they belong in the opening run

Change `journeys/linear/config.js` or the `configureJourneyFlow()` call only when
the journey's template identity, cookie identity or injected policy surface
itself changes. `sectionCaption` was supplied that way, and needed the same new
argument in both `routes.js` and the test fixture at `test/fixtures/index.js`.

## 7. Add check-answers output

Add a section or cards for the feature under the check-answers feature's view
model. Add English and Welsh headings, row labels and value labels to the
check-answers copy bundles.

Pass obligation names to `row()` and `changeAction()` so Change links resolve
through dispatch. Use `scope` to omit out-of-scope rows. Extend the
check-answers feature spec for every value and Change target.

> **EXEMPLAR PLACEHOLDER** — `journeys/linear/features/check-answers/` does not
> exist. The first feature group that needs check-answers output builds it.

## 8. Update downstream persistence when applicable

Feature bindings always write canonical fulfilment. If the backend notification
has homes for the new values, add them to the matching modules under
[`src/server/app/services/persistence/records/notification-mapper/`](../../../services/persistence/records/notification-mapper/index.js)
and add a test beside it — the mapper has no test file yet, so the first
mapper field to be added creates `notification-mapper.test.js`.

There is one mapper here, Mapper A, and no outbox. If the backend shape has no
field home, keep the value out of the projection and add an explicit omission
assertion. Do not invent fields.

## 9. Register client JavaScript when needed

If any page needs feature JavaScript:

1. Add a client entry module at
   `journeys/linear/features/<group>/client/index.js`.
2. Add a named `entry` in the repo-root `webpack.config.js`.
3. Load it from the relevant template with `getAssetPath('<entry>.js')`.

Without the webpack entry, the HTML works but the bundle URL returns a silent 404.

## 10. Add unit tests

Add a controller test next to every controller. Cover GET prefill, each
validation rule, raw values on error, cleaned committed values, conditional
scope, redirects, marked recoverable failures and unexpected errors.

Add focused tests for bindings, model gates, flow order, branch skipping,
task-row status, hub rendering, check-answers rows and notification mapping.

## Playwright feature test

Put the co-located specs in `journeys/linear/features/<group>/fit/`.

Keep tests independent. Each test starts its own notification. Do not create
page objects. Use raw role, label and visible-copy locators. Use Playwright
locator assertions and auto-waiting. Use `expect.poll` for non-locator state.
Do not sleep.

Cover the complete task:

- the hub row, initial status and first-page link
- happy-path movement through every page and back to the hub
- each page's persisted values after reload
- each validation rule in its own test
- preservation of all entered values on error
- every error-summary link moving focus to the right control
- each conditional branch, skipped page and out-of-scope value purge
- Back, Save and return to overview, Cancel and Change navigation
- the completed hub-row status
- all check-answers values and Change targets

## Accessibility test

Add axe coverage for every new page in both states:

- initial render
- validation error state after the error summary appears

Run `AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa'])` and fail on every
`serious` or `critical` violation. Filter only a proved component false
positive.

Add or extend the hub axe test when the new row or a new group heading changes
the hub state.

> **EXEMPLAR PLACEHOLDER** — the multi-page axe helper pattern should be
> established by the first multi-page feature group's `fit/` specs, and cited once
> it exists.

## 11. Run every check

```bash
npm run test:high-risk-plants
npm test
PORT=3053 npm run test:fit:features
npm run lint
```

Green means every command exits with code 0, Vitest has no failed tests,
Playwright has no failed specs, the new hub row reaches its first page, and lint
has no errors.

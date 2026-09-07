# High-risk-plants journey flow and gates

The linear journey owns its topology in
[`src/server/app/sets/high-risk-plants/journeys/linear/flow/`](../journeys/linear/flow/).
The platform consumes that policy through `configureJourneyFlow()`.

Every one of those exports is empty today. The platform algorithms run, over
nothing.

## Flow sections

[`flow.js`](../journeys/linear/flow/flow.js) exports `sections`, currently `[]`.
A flow section is a navigation sequence:

```js
{
  id: '<section-id>',
  pages: [firstPage, secondPage]
}
```

Array order is journey order. It controls `nextInSection()` and, through the
section's place among the other sections, the strictly-earlier continue
prerequisites.

Normal page gates are derived from `meta.collects`, in-scope obligations and
earlier continue prerequisites. Author a section or page `gate` only for policy
that the derived rule cannot express. The animals journey has exactly one
authored section gate — its `review` section requires
`scope.readyForCheckYourAnswers` — and this journey should expect to need about
as few.

`FLOW_ONLY_KEYS` is `[]`. Add `declaration` when the declaration page lands, and
not before: a flow-only key widens the recognised answer-key surface, and an
unrecognised key is rejected loudly by the engine write paths rather than stored
inert. Flow-only values use the session's flow-only store, not canonical
obligation fulfilment.

## Task rows

[`task-rows.js`](../journeys/linear/flow/task-rows.js) exports `taskRows`,
currently `[]`. A task row is a hub item and a submit-readiness unit; it is not
a flow section. Do not call the hub entry a section in code.

```js
{ id: '<task-row-id>', pages: [firstPage, secondPage] }
```

Row status defaults to the union of each page's `collects` — that is what
`rowParts()` computes, and `rowStatus()` feeds to `statusOf()`. `parts` narrows
a row to a collection facet. `conditional: true` lets the hub hide a row that is
not applicable.

Every row contributes to `readyForCheckYourAnswers`. A mandatory new row
therefore blocks Check and submit until it is complete, so prove both the
blocked and the complete state.

The hub feature's controller places task-row ids under visible headings and
supplies their presentation order. Neither the hub feature nor its `GROUPS`
array exists yet.

## Opening run and entry guard

[`run.js`](../journeys/linear/flow/run.js) owns the opening-run sequence. Its
`RUN_STEPS` is `[]`, so `nextRunTarget` returns `null` for any step id it is
given, and a journey that somehow began an opening run would fall straight
through to the hub.

The opening run should begin when the notification is created, from the
dashboard's create POST — the single caller of `beginOpeningRun`. The journey
entry page is an ordinary page otherwise, with no opening-run special case.

[`entry-guard.js`](../journeys/linear/flow/entry-guard.js) is **inert**:

```js
export const entryGuardTarget = async () => null
```

That is correct while there is nowhere to deep-link into, and it becomes a real
hole the moment a journey page exists. Restoring it is a gate on the first page
increment. The guard must:

- ignore anything outside `/notifications/<id>/`
- ignore the create path
- ignore the `amend`, `cancel-amend`, `copy` and `delete` action slugs
- ignore the entry page and its sub-paths, so there is no redirect loop
- admit a request when the opening run has begun for that journey in this
  session, or when the journey carries committed user answers
- send anything else — a deep link to an id this session never created and that
  holds no answers — to the entry page

A journey the guard bounces to the entry page does not resume the opening run
when it saves that page: `kit.nextTarget` finds `inOpeningRun` false, so
`runTarget` is null and the user continues to the hub. That is the accepted rule
for a returning user without run state. Only a notification created in this
session sequences through `RUN_STEPS`.

## Registration wiring

[`src/server/app/routes.js`](../../../routes.js) imports `sections`, `taskRows`,
`rowStatus`, `nextRunTarget`, `FLOW_ONLY_KEYS`, `entryGuardTarget` and
`sectionCaptionOf` (from
[`flow/section-captions/index.js`](../journeys/linear/flow/section-captions/index.js)),
then passes them to
[`configureJourneyFlow()`](../../../flow/journey-flow.js), along with the
journey's `LAYOUT` from [`config.js`](../journeys/linear/config.js).

Because `routes.js` injects the whole exported arrays, adding an entry to the
existing `sections` or `taskRows` needs no extra L1 registration. A new feature
still needs controller and binding registration in the journey barrels.

## Section captions

[`flow/section-captions/index.js`](../journeys/linear/flow/section-captions/index.js)
owns the map, with its own `copy.en.js`/`copy.cy.js` pair beside it, and
`sectionCaption` is passed in the `configureJourneyFlow` call in **both**
[`routes.js`](../../../routes.js) and the test fixture at
`test/fixtures/index.js`. The fixture keeps a synthetic map of its own so the
engine suite stays journey-neutral; it never imports this set.

`captionSections` is data — an array of `{ id, pages }` importing page
identities from the features — and `sectionCaptionOf(pageId)` resolves the
section's name from the copy pair. Never a string chosen page by page. The
dashboard is the only section so far; the module's doc comment names the four
the journey spec still expects, so a page increment knows where to file
itself.

`kit.base()` resolves the name for the page identity a controller passes it and
puts it in the view as `caption`. The page template imports the macro with
`{% from "shared/section-caption.njk" import sectionCaption %}` and calls it
immediately above the page heading. Pass the caption size that matches the
heading — `sectionCaption(caption, "govuk-caption-xl")` above a
`govuk-heading-xl` — and let nothing sit between the two: the caption carries
its own bottom margin, which collapses from the tablet breakpoint, so it only
reads as a caption when it is the element directly above the heading.

Caption sections are the ones a reader sees named above a heading. They are
finer than the hub's task-row groups and are not derived from them. A page left
out of the map renders no caption; the caption module's unit test should list
those pages explicitly, so a new page cannot be added without a decision either
way.

The generic algorithms are documented in
[Flow machinery and gates](../../../docs/flow-and-gates.md).

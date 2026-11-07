# High-risk-plants journey flow and gates

The linear journey owns its topology in
[`src/server/app/sets/high-risk-plants/journeys/linear/flow/`](../journeys/linear/flow/).
The platform consumes that policy through `configureJourneyFlow()`.

Those exports hold the start, commodity, commodityDetails, origin, arrival and
destination sections, the `commodities`, `origin`, `arrival` and `destination`
task rows and the entry guard — everything the journey has landed so
far.

## Flow sections

[`flow.js`](../journeys/linear/flow/flow.js) exports `sections`, today holding
`start` (the dashboard), `commodity` (the commodity-type page and the
commodities list), `commodityDetails` (the collection's entry sub-page),
`origin` (the country-of-origin page), `arrival` (the arrival-status question,
then the arrival details) and `destination` (the place-of-destination page). A
flow section is a navigation sequence:

```js
{
  id: '<section-id>',
  pages: [firstPage, secondPage]
}
```

Array order is journey order, and the sections are Overview's groups: Save and
continue follows the order from every start, and the section's place among the
others gives the strictly-earlier continue prerequisites.
prerequisites.

A page reached only from the page that opens it is a sub-page: commodity details
carries `subPage: true` on its page identity, so it keeps its section's status and
prerequisites but is no step of the journey's order. It is opened from the
commodities list and sends the trader back to it, and the list goes on to origin.
Origin follows commodity details so a line can be added before a country is named.
Arrival status and the consignor are out of scope for potatoes and so passed over.
page after the entry question carries.

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

[`task-rows.js`](../journeys/linear/flow/task-rows.js) exports `taskRows`, today
holding the `commodities` row — the entry question, the list page and the entry
sub-page — the `origin` row, the `arrival` row and the `destination` row. The
commodities row spans two flow sections. A task row is a hub item and a submit-readiness unit; it is not a
flow section. Do not call the hub entry a section in code.

The arrival row holds the arrival-status question and the arrival details. The
question is out of scope for potatoes, so a potato notification opens the row on
the details page instead — every commodity type owes an arrival date. The row is
deliberately not `conditional`: no notification finds the whole of it
inapplicable.

```js
{ id: '<task-row-id>', pages: [firstPage, secondPage] }
```

Array order is journey order here too. The hub opens a row when ANY of its pages
is reachable and links it to the first of them whose gate passes
(`rowGatePasses` and `rowEntry`), so the page a notification is asked first has
to lead the row; the commodity entry sub-page is in its row because its data
belongs to that task, not because the hub ever links there.

Save and continue goes to the next page that applies in the journey's order,
from every start: commodity type to the commodities list, the list to origin,
arrival details to the place of destination, the consignor to identification
numbers, and the contact address to check your answers.

Row status defaults to the union of each page's `collects` — that is what
`rowParts()` computes, and `rowStatus()` feeds to `statusOf()`. `parts` narrows
a row to a collection facet. `conditional: true` lets the hub hide a row that is
not applicable.

Every row contributes to `readyForCheckYourAnswers`. A mandatory new row
therefore blocks Check and submit until it is complete, so prove both the
blocked and the complete state.

The hub feature's controller derives its groups from the flow sections, in
order, then appends the check-and-submit group.

## Entry guard and the Back link

[`entry-guard.js`](../journeys/linear/flow/entry-guard.js) owns the journey's redirect
policy before handlers run and the Import Notification Service's type question
(`insTypeQuestionUrl`), which the gateway passes to `configureJourneyFlow()`. Its
question is the plain What are you importing? question, because the Import Notification
Service takes no high-risk plants notification back to it.

Back on every journey page goes to the place the trader came from. The place travels
on the page's links and form posts as the trail (see
[Where Back goes](../../../docs/flow-and-gates.md#where-back-goes-the-trail)):

| The trader came from                  | Back opens                                           |
| ------------------------------------- | ---------------------------------------------------- |
| Save and continue on another page     | That page, carrying the places beneath it            |
| An Overview task row or review button | Overview                                             |
| A review Change link or error link    | The review                                           |
| A dashboard card (View or Amend)      | The dashboard                                        |
| Start a new notification              | The dashboard, from the first page                   |
| The Import Notification Service       | Its plain type question, from the first page         |
| Nothing the journey knows             | Overview (the first page: see the entry guard below) |

Following a Back link does not end anything: a later Save and continue goes on to the
next page that applies, adding the page saved to the trail, so Back steps through the
visited pages in reverse. Save and return to overview still goes to the overview. The
commodity details page opened with no line on the consignment goes Back where the
commodities list would go. Changing the commodity type so that lines are removed
removes them whichever button was pressed: Save and return to overview opens Overview,
and Save and continue opens the commodities list with the commodity type page on the
trail.

A trail that names a place the journey does not have is ignored and logged once, and
the page goes Back to its fallback. The fallback is the overview, except on the first
page (the dashboard until an answer is entered, then the overview: `leaveJourneyLink` in
`entry-guard.js`) and on the review (the overview on a draft or an amendment, the
dashboard on a submitted notification, including the one shown after an amendment is
cancelled). A refused Continue on the review shows the same Back link.

## The opening-run state

The session records whether a notification is in its opening run. The dashboard's
create POST and the start entry (`<set>/start`, which the Import Notification
Service's type question opens) both begin it, through one helper in the dashboard
controller that calls `beginOpeningRun`. Rendering the hub, or the review page,
completes it. The start entry sits outside `/notifications/`, so the entry guard
never sees it.

## The entry guard

[`entry-guard.js`](../journeys/linear/flow/entry-guard.js) is **live**, keyed to
the entry page `commodity-type`, whose identity it imports from
[`features/commodity-type/page.js`](../journeys/linear/features/commodity-type/page.js).
This set's gateway, `routes-high-risk-plants.js`, calls `entryGuardTarget` from a
sandboxed `server.ext('onPreHandler')` — re-entering its own set context around
the call — and redirects on any target it returns. The guard:

- ignores anything outside `/notifications/<id>/`
- ignores the create path
- ignores the `amend`, `cancel-amend`, `copy` and `delete` action slugs — `copy`
  has no route yet, and the exemption is deliberately ahead of it
- ignores the entry page and its sub-paths, so there is no redirect loop
- admits a request when the journey carries committed user answers
  (`hasCommittedNotificationAnswers`); the run record does not admit one
- sends anything else — a deep link to an id this session never created, or a
  draft with nothing saved, whether the request is for Overview, the review,
  the declaration or the confirmation page — to the entry page, logging the
  journey id and the requested path once

`hasCommittedNotificationAnswers` counts only answers that resolve to a manifest
obligation and are not `SYSTEM_POPULATED`, so a journey holding nothing but a
flow-only key reads as fresh. The commodity-type controller imports the same
predicate to choose its Back link.

A journey the guard bounces to the entry page goes on from there to the
commodities list like any other start. `leaveJourneyLink` in `entry-guard.js` is
Overview's link as the trader may follow it: the dashboard until an answer is
entered, once for Back and for the first page's Cancel link. The guarded prefix is
read per request, because the set's mount prefix is only known inside a request's
set context.

## Registration wiring

This set's gateway,
[`src/server/app/routes-high-risk-plants.js`](../../../routes-high-risk-plants.js)
(the [`routes.js`](../../../routes.js) barrel only re-exports it), imports
`sections`, `taskRows`, `rowStatus`, `insTypeQuestionUrl`,
`FLOW_ONLY_KEYS`, `entryGuardTarget` and `sectionCaptionOf` (from
[`flow/section-captions/index.js`](../journeys/linear/flow/section-captions/index.js)),
then passes them to
[`configureJourneyFlow()`](../../../flow/journey-flow.js), along with the
journey's `LAYOUT` from [`config.js`](../journeys/linear/config.js).

Because `routes-high-risk-plants.js` injects the whole exported arrays, adding an entry to the
existing `sections` or `taskRows` needs no extra L1 registration. A new feature
still needs controller and binding registration in the journey barrels.

## Section captions

[`flow/section-captions/index.js`](../journeys/linear/flow/section-captions/index.js)
owns the map, with its own `copy.en.js`/`copy.cy.js` pair beside it, and
`sectionCaption` is passed in the `configureJourneyFlow` call in **both**
[`routes-high-risk-plants.js`](../../../routes-high-risk-plants.js) and the test fixture at
`test/fixtures/index.js`. The fixture keeps a synthetic map of its own so the
engine suite stays journey-neutral; it never imports this set.

`captionSections` is data — an array of `{ id, pages }` importing page
identities from the features — and `sectionCaptionOf(pageId)` resolves the
section's name from the copy pair. Never a string chosen page by page. Four
caption sections exist so far — the dashboard; About the consignment over the
four commodity and origin pages (commodity-type, commodities,
commodity-details, origin); Arrival over the arrival-status question and the
arrival details; and Destination over the place-of-destination page; the
module's doc comment names the rest the journey spec still expects, so a page
increment knows where to file itself.

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

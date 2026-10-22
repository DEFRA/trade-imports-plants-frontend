# Testing the high-risk-plants set and journey

## Set-focused Vitest run

`npm run test:high-risk-plants` runs Vitest under
`src/server/app/sets/high-risk-plants` without coverage. It covers obligation-set
tests, controllers, copy, bindings, flow policy and journey behaviour.

It does not run L1 or L2 tests. Run `npm test` for route composition, dispatch,
fulfilment-registry, copy-convention, copy-parity and controller contract
checks.

### Allow-list drift guard

A per-line gate keys its allow-list on the obligation's own `name`, and
`categoriesRequiring` returns an empty list for a name it does not hold. Renaming
an obligation, or its `CATEGORIES_BY_LINE_FIELD` key, on one side alone puts the
field in scope for no category, and every other test stays green.
`obligations/whitelists.test.js` holds the two sides in step: per-line names
against the service's fields, every gate's allow-list against the service's
categories and against the categories each commodity type offers. It also holds
the origin constraints, which no gate can check because `category` is on each
commodity line, comparing them with the countries the origin page offers (a
territory counts as its parent country). Seed potatoes have no origin
constraint: regulation 24A(1)(a) covers the whole Common SPS Area, which is
every country the origin list offers. The notification-level gates name
their commodity types as literals, so it pins those too: arrival status admits
plants for planting and wood (regulation 26(2) gives only those a post-arrival
branch) and the arrival time and place of landing admit potatoes only
(regulation 24A). A new commodity type must be added to those assertions rather
than joining a gate silently.

## Feature browser tests

`PORT=3053 npm run test:fit:features` builds the frontend and runs co-located
`*.fit.spec.js` (frontend integration test — see
[Browser-test projects](../../../docs/testing.md#browser-test-projects))
files under
`src/server/app/sets/high-risk-plants/journeys/linear/features`.

The Playwright default port is 3003, which is also the port the workspace stack
serves this frontend on. Pass `PORT=3053` when the stack is up. The
`webServer` block starts the app itself with `STUB_MODE=true`, so the suite is
self-contained: stub data, a locally signed session, no Defra ID exchange and no
other service running.

Each feature test starts its own notification. Use Playwright role, label and
visible-copy locators, locator assertions and auto-waiting. Do not use sleeps
and do not build a page-object layer.

Every changed page needs happy-path and validation coverage. Axe checks cover
the initial page and its validation-error state through
`expectNoSeriousOrCriticalViolations(page, subject)`, which fails on serious or
critical WCAG 2.0, 2.1 or 2.2 A or AA violations. axe-core tags a rule by the
WCAG version that introduced it, so all five tags are needed for every rule to
run.

### Shared browser-test helpers

[`fit/high-risk-plants-journey.js`](../../../../../../fit/high-risk-plants-journey.js)
holds the steps more than one spec takes: `startNotification`,
`startNotificationAtOrigin`, `chooseCommodityType`, `chooseCommodityCategory`,
`addCommodityLine`, `saveOrigin`, `chooseCountryOfOrigin`,
`chooseAutocompleteOption`, `saveAndContinue`, `startPotatoNotification`,
`completePotatoNotification`, `openDeclaration`,
`expectNoSeriousOrCriticalViolations`, `expectThreeSaveControls`, the colour values `GOVUK_BLUE`,
`GOVUK_BLUE_SHADE_50` and `WHITE`, `expectBlueIconButtonLook`, which checks
the blue, white, hover and focus look of one icon button,
`describeDatePickerLook`, which registers the four look tests for one date
field, and `describeSubmittedSearchPicker`, which registers the look,
no-JavaScript Enter search and three-state axe tests for one address picker's
submitted search box. It also holds `startWoodNotificationWithOriginSaved`,
`POTATO_VARIETY`, `CHECK_ANSWERS_URL` and `WOOD_LINE_FIELDS`; the form-group
readers `FORM_GROUP_ANCESTOR_XPATH`, `childTagsAndClassesOf` and
`expectedFormGroupChildren`; `journeyFormOf`, which finds the page's journey
form, and the `JOURNEY_FORM_SELECTOR` it uses; `backLink`; the address-book
values `ADDRESS_BOOK_PARTY`, `IMPORT_CO`, `ALPINE`, `STUB_BOOK_SIZE`,
`SECOND_PAGE_LINK`, `DENMARK`, `COPENHAGEN` and `MATCHES_NOTHING`; and
`addressRowRadio` and `selectedAddressInset`, which find one address's radio
and its selected-address inset on an address picker page given that page's
copy. The type-ahead readers
`measureJoinedSearchButton` and `boldLettersOf` live in
`type-ahead.fit.spec.js`, so the coverage report never counts them as source.
When a second spec needs a step, move it there in the same change and delete every local copy.

Things that are easy to get wrong:

- accessible-autocomplete enhances a native `<select>`: the visible combobox
  keeps the field's id and the hidden select submits the value. To post a value
  the list does not offer, write it into the hidden select and leave the
  combobox alone — the autocomplete rewrites the select from the combobox text
  when the combobox loses focus.
- The stub address book holds 13 records. Tech Imports Ltd is on the first page
  of results, Copenhagen Exports ApS on the second and Alpine Supplies GmbH on
  the last, so paging tests assert on what is on screen, not only on the link.
- `govukPagination` names each number link "Page N", not the bare number.
- `evaluateAll` does not wait. Assert the expected count first, then read the
  values.
- The test process does not set `STUB_MODE`, so a spec that needs the origin
  country list reads it from the captured fixtures the server runs against,
  not from the countries service.
- The journey reference also appears in the journey strip, so a check for it on
  the confirmation page scopes to the panel's reference line.

## Whole-journey browser tests

`npm run test:fit:journeys` runs the `journeys` Playwright project under `fit/`,
matching `**/journey-smoke.fit.spec.js`.

`fit/journey-smoke.fit.spec.js` walks the five mural use cases from dashboard
to confirmation using `journeys/linear/flow/fixtures/happy-path.json`. Each
case creates its own notification and checks its reference, late-banner state
and confirmation accessibility. Lighthouse uses the same seed shapes. Arrival
dates are relative to the run date so the late and on-time cases stay stable.
Run `PORT=3053 npm run test:fit:journeys` when the workspace stack is up.

## Deployed end-to-end tests

Multi-service E2E coverage does not live here. It belongs in
`trade-imports-ins-tests` as its `plants` domain (`tests/plants/`), run against the
workspace stack. See
[Cross-repo test ownership](../../../docs/test-ownership.md), which also
describes how this repository's `e2e-tests.yml` check is wired.

## Required checks for a journey change

```bash
npm run test:high-risk-plants
npm test
PORT=3053 npm run test:fit:features
npm run lint
```

Run `npm run test:fit:journeys` when the change affects the complete journey or
shared FIT helpers.

Green means every command exits with code 0, Vitest reports no failed tests,
Playwright reports no failed specs, and lint reports no errors. While a suite
still matches no files, say so rather than reporting it as passing coverage.

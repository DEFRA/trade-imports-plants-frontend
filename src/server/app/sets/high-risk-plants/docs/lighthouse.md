# Lighthouse

Lighthouse CI audits the frontend's own pages. The source of truth is
[`lighthouserc.cjs`](../../../../../../lighthouserc.cjs) at the repository root,
plus the scripts under `scripts/lighthouse/`.

## The run is not usable yet

`scripts/lighthouse/run-audit.js` and `scripts/lighthouse/seed-audit-targets.js`
both import two modules that were not carried across from the animals frontend:

- `scripts/lighthouse/audit-targets.js` (and its `audit-targets.test.js`), which
  exports `auditUrls`, `reportNames` and `TARGETS_FILE`
- `scripts/lighthouse/seed-notification.js`, which exports `SEED_SHAPES`,
  `createNotification`, `fillNotification` and `submitNotification`

`npm run lighthouse` therefore fails at import. Both modules have to be written
against the plants journey before the audit can run — `seed-notification.js`
especially, because its `SEED_SHAPES` describe how to fill a plants
notification, which is journey content and cannot be copied.

Even once they exist, the URL list is derived from pages this set does not yet
have, so there is nothing to audit until the first journey page lands.

## What the run does, once it works

`npm run lighthouse` is `run-s lighthouse:targets lighthouse:run`.

`lighthouse:targets` (`seed-audit-targets.js`) signs in through
`tests/lighthouse/auth-setup.cjs`, seeds one notification per shape in
`SEED_SHAPES`, derives the audit URLs from the app's own registered routes and
writes them to `.lighthouse/targets.json`. It then re-fetches every URL in a
session that has **not** walked the journey — the same standing Lighthouse
itself has — and fails when a URL does not return 200 for its own page. A page
whose prerequisites are unmet redirects to the hub, and a redirected URL would
silently audit the hub instead.

`lighthouse:run` (`run-audit.js`) clears the previous run's reports, runs
`lhci autorun`, then renames each report from the LHCI filename pattern to the
page's own stable name from the targets file.

The config:

- collects the URLs from `.lighthouse/targets.json`, defaulting to
  `http://localhost:3003` (override with `LIGHTHOUSE_BASE_URL`)
- runs each URL once
- uses the desktop preset
- starts Chromium with `--no-sandbox` and `--disable-gpu`
- runs `tests/lighthouse/auth-setup.cjs` before each audit
- writes HTML and JSON output to `lighthouse-report/`

Never run `lhci autorun` on its own. The LHCI filename pattern only has to be
unique per URL; the stable per-page names are applied afterwards by
`lighthouse:run`.

## Passing scores

The run fails below these category scores:

| Category       | Minimum |
| -------------- | ------- |
| Performance    | 0.60    |
| Accessibility  | 0.70    |
| Best practices | 0.70    |

There is no SEO assertion, and none should be added.

Treat the limits as a floor, not a target. A score above the floor can still
contain a simple finding that should be fixed.

## Add or change a page

The URL list is derived, not hand-maintained, so a new page joins the audit by
being a registered route the seeding step can reach. For a page that should be
audited:

1. Make sure a seed shape fills enough of the notification for the page's
   prerequisites to pass.
2. Give the page a stable report name in `audit-targets.js`.
3. Make sure the auth script can reach it after sign-in.
4. Run Lighthouse and open that page's HTML report.
5. Check all three asserted categories.

Do not lower a score to make a change pass without agreement. Record why a URL
is excluded. An excluded URL no longer has a Lighthouse check.

## Read the output

Each report is renamed to the page's stable name:

```text
lighthouse-report/<name>.report.<extension>
```

`scripts/lighthouse/flag-simple-findings.cjs` reads the manifest and the
representative JSON reports. It records weighted numeric or binary audits with a
score below 1 for the three asserted categories. The output is:

```text
lighthouse-report/flagged-audits.json
```

SEO findings are not included in that file.

## CI ownership

There is no `.github/workflows/lighthouse.yml` in this repository. The animals
frontend runs Lighthouse after a successful branch image publish, or by manual
dispatch: it checks out the workspace, starts the stack for the chosen branch,
installs the frontend, runs `npm run lighthouse`, always tears the stack down,
uploads the report for 14 days, publishes it to GitHub Pages and passes the
result, report URL and flagged findings to the workspace status action.

Plants needs the same workflow before a Lighthouse result can appear on a pull
request here. Until then Lighthouse is a local-only check, and only once the two
missing scripts above exist.

When a Lighthouse change fails in CI, use the uploaded report for that branch.
Reproduce it against the same route and stack before changing code or limits.

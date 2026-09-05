# High-risk-plants limits and edges

## The set declares no caps yet

The manifest is empty, so no `requires` floor or ceiling is in force. Collection
caps are declared in two separate places and both are still empty of plant data:

- a `requires: { minEntries, maxEntries }` rule on the group obligation, which
  decides completeness and defends loaded data
- the `MAX_ENTRIES_FROM` map in
  [`src/server/app/bridge/obligation-source.js`](../../../bridge/obligation-source.js),
  which links a collection name to a sibling count field and caps the write path

A journey can use either or both. See
[Collection cardinality](../../../docs/cardinality.md).

Two generic sets in that same module — `SYSTEM_POPULATED` and
`ENFORCED_AT_CONTINUE` — are empty until this set declares obligations. Keep
them in step with the manifest: a name listed there that this set does not
declare is inert, and one this set declares but does not list gets no
continue-time enforcement.

## No reference data constrains any value

Obligation allow-lists are expected to read from a set-owned reference service.
This set owns none, so nothing constrains a value at all today. See
[Services](services.md) for the seam a reference service plugs into.

## One backend projection, and no event publishing

This repository ships one notification mapper.

Canonical fulfilment can contain values that the backend projection cannot
represent. A new obligation always needs a feature binding, but it only gets a
mapper field when the target backend schema has a real home for it. Where there
is no home, leave the mapper unchanged and add an explicit omission assertion.
Do not invent a payload property.

Today the mapper projects the reference number and nothing else, because the
backend carries no typed content fields — the whole engine state round-trips
through the opaque `fulfilments` payload beside it.

The plants alpha has no outbox, publishes no events and does no downstream
routing.

## Collection positions are snapshot-local

Grouped fulfilment tokens such as `line0` and `line0.unit1` are positions in one
canonical snapshot, not durable record identifiers. Every save replaces the
whole snapshot, so removing an earlier entry can renumber the later ones. Do not
persist or link to a position as though it were an id.

## A gate cannot read across sibling frames

A collection member's `applyTo` gate reads values at the same identity level, or
projects a shallower gate down onto its own instances through the projection
group argument. It cannot read a value in a sibling frame at the same depth.

A field gated on another value in the _same_ enclosing instance is expressible.
A field gated across unrelated frames is not. See
[add-a-collection.md](add-a-collection.md).

## Array-valued answers do not drive scalar gates

The standard scalar gate helpers expect scalar fulfilment values. Collection
conditions use group-aware helpers and cardinality rules instead.

Generic constraints are documented in
[Platform limits](../../../docs/limits.md).

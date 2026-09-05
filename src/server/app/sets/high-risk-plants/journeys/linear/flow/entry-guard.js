// Inert while the set has no journey pages: there is nothing to deep-link
// into and no entry page to redirect to. See ../../../docs/README.md —
// restoring the real guard is a gate on the first page increment.

export const entryGuardTarget = async () => null

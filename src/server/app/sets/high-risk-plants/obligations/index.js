// Empty manifest. See ../docs/README.md for what the first obligation
// has to land alongside.

export const obligations = []

export const groups = obligations.filter((obligation) =>
  obligations.some((other) => other.within === obligation)
)

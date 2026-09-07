import { isAnswered } from '../../../../../lib/answered.js'
import {
  obligationByName,
  SYSTEM_POPULATED
} from '../../../../../bridge/obligation-source.js'

/** Only a model answer the USER entered starts a journey. System populated
 * obligations do not represent user progress, and flow-only keys such as
 * `declaration` are session state rather than canonical fulfilment, so they
 * never resolve to a manifest obligation. */
const userEntered = (key) => {
  const obligation = obligationByName(key)
  return obligation !== undefined && !SYSTEM_POPULATED.has(key)
}

export const hasCommittedNotificationAnswers = (answers) =>
  Object.entries(answers ?? {}).some(
    ([key, value]) => userEntered(key) && isAnswered(value)
  )

// Inert while the journey has only its entry page: there is nothing to
// deep-link past yet. See ../../../docs/README.md — restoring the real guard
// against commodity-type is its own increment.

export const entryGuardTarget = async () => null

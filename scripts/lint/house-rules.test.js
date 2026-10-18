import { join } from 'node:path'
import { Linter, RuleTester } from 'eslint'
import { describe, expect, it } from 'vitest'

import { houseRules, restrictedSyntax } from './house-rules.js'
import { templateCommentFindings } from './template-comments.js'

const ruleTester = new RuleTester()

ruleTester.run('no-tracking-ids', houseRules.rules['no-tracking-ids'], {
  valid: [
    '// Leaves a blank answer unreported',
    "it('Should keep the answer', () => {})",
    "const id = 'c-201'",
    "const uuid = '3fa85f64-5717-4562-b3fc-2c963f66afa6'"
  ],
  invalid: [
    { code: '// EUDPA-565: keep this', errors: 1 },
    { code: '/* c-201: an amendment opens clean */', errors: 1 },
    { code: '// see inc-104', errors: 1 },
    { code: '// Ruled at the panel', errors: 1 },
    { code: '// as Design release 1 does', errors: 1 },
    { code: '// matches the real service', errors: 1 },
    { code: "it('Should match DR2.1', () => {})", errors: 1 },
    { code: "test.describe('EUDPA-12 flow', () => {})", errors: 1 },
    { code: "it.each([1])('Should hold d-049 for %s', () => {})", errors: 1 }
  ]
})

ruleTester.run('no-set-vocabulary', houseRules.rules['no-set-vocabulary'], {
  valid: [
    {
      code: "const prefix = '/example-set'",
      options: [{ terms: ['high-risk-plants'] }]
    }
  ],
  invalid: [
    {
      code: "const prefix = '/high-risk-plants'",
      options: [{ terms: ['high-risk-plants'] }],
      errors: 1
    },
    {
      code: 'const mode = process.env.HIGH_RISK_PLANTS_IT',
      options: [{ terms: ['high-risk-plants'] }],
      errors: 1
    },
    {
      code: '// mounted at highRiskPlants',
      options: [{ terms: ['high-risk-plants'] }],
      errors: 1
    }
  ]
})

describe('restricted syntax', () => {
  const linter = new Linter()
  const messagesFor = (code) =>
    linter.verify(code, {
      rules: { 'no-restricted-syntax': ['error', ...restrictedSyntax] }
    })

  it('Should refuse a catch handler that returns undefined', () => {
    expect(messagesFor('record().catch(() => undefined)')).toHaveLength(1)
  })

  it('Should refuse a catch handler with an empty body', () => {
    expect(messagesFor('record().catch(() => {})')).toHaveLength(1)
  })

  it('Should refuse a logger call with only a message inside a catch', () => {
    expect(
      messagesFor("try { a() } catch (err) { logger.error('Failed') }")
    ).toHaveLength(1)
    expect(
      messagesFor("try { a() } catch (err) { request.logger.warn('Failed') }")
    ).toHaveLength(1)
  })

  it('Should accept a logger call that carries the error', () => {
    expect(
      messagesFor("try { a() } catch (err) { logger.error({ err }, 'Failed') }")
    ).toEqual([])
  })
})

describe('#templateCommentFindings', () => {
  it('Should name each template comment that carries a tracking id', () => {
    const fixture = join(import.meta.dirname, 'fixtures/comments.njk')

    expect(templateCommentFindings([fixture])).toEqual([
      `${fixture}:2 a backlog or ruling id ("c-030")`
    ])
  })
})

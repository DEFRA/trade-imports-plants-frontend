import { readdirSync } from 'node:fs'
import path from 'node:path'
import { includeIgnoreFile } from 'eslint/config'
import { neostandard } from 'neostandard'
import sonarjs from 'eslint-plugin-sonarjs'
import { codeQuality } from './eslint-rules/code-quality.js'

const SETS_DIR = path.join(import.meta.dirname, 'src/server/app/sets')
const SET_NAMES = readdirSync(SETS_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
const PLATFORM_LAYER = [
  'analysis',
  'bridge',
  'engine',
  'flow',
  'lib',
  'model',
  'services',
  'shared'
].map((dir) => `src/server/app/${dir}/**/*.js`)

export default [
  includeIgnoreFile(path.join(import.meta.dirname, '.gitignore')),
  ...neostandard({
    env: ['node', 'vitest'],
    noJsx: true,
    noStyle: true
  }),
  {
    files: ['**/*.fit.spec.js'],
    languageOptions: {
      globals: {
        DataTransfer: 'readonly',
        Option: 'readonly',
        getComputedStyle: 'readonly'
      }
    }
  },
  {
    files: ['src/server/**/*.js'],
    plugins: { sonarjs },
    rules: {
      curly: ['error', 'all'],
      'default-param-last': 'error',
      'max-params': ['error', 7],
      'no-shadow': 'error',
      'prefer-object-has-own': 'error',
      'sonarjs/cognitive-complexity': 'error',
      'sonarjs/concise-regex': 'error',
      'sonarjs/cyclomatic-complexity': 'error',
      'sonarjs/elseif-without-else': 'error',
      'sonarjs/function-return-type': 'error',
      'sonarjs/max-lines-per-function': 'error',
      'sonarjs/no-duplicate-string': 'error',
      'sonarjs/no-identical-functions': 'error',
      'sonarjs/no-nested-template-literals': 'error',
      'sonarjs/no-undefined-assignment': 'error',
      'sonarjs/no-unused-function-argument': 'error',
      'sonarjs/prefer-regexp-exec': 'error',
      'sonarjs/prefer-specific-assertions': 'error',
      'sonarjs/single-character-alternation': 'error',
      'sonarjs/super-linear-regex': 'error',
      'sonarjs/too-many-break-or-continue-in-loop': 'error'
    }
  },
  {
    files: ['**/*.{js,cjs,mjs}'],
    plugins: { 'code-quality': codeQuality },
    rules: {
      'code-quality/no-tracking-references': 'error',
      'code-quality/no-silent-catch': 'error',
      'code-quality/no-message-only-error-log': 'error'
    }
  },
  {
    files: PLATFORM_LAYER,
    ignores: ['**/*.test.js', '**/test-support.js', '**/fixtures/**'],
    rules: {
      'code-quality/no-set-vocabulary': ['error', { terms: SET_NAMES }]
    }
  },
  {
    files: ['src/server/**/*.js'],
    ignores: ['**/*.test.js', '**/*.spec.js', '**/*.cy.js'],
    rules: {
      'no-magic-numbers': [
        'error',
        {
          ignore: [-1, 0, 1],
          ignoreDefaultValues: true,
          ignoreArrayIndexes: true
        }
      ]
    }
  }
]

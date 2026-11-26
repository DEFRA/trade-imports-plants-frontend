import { defineConfig, configDefaults } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    clearMocks: true,
    setupFiles: [
      './test/setup-obligation-set.js',
      './test/setup-organisation-context.js'
    ],
    // STUB_MODE: run against the stubbed services, not the real ones.
    // AWS_EMF_ENVIRONMENT: write metric documents to stdout, with no agent.
    // LOG_FORMAT: write log lines as ECS JSON, the deployed format.
    env: { STUB_MODE: 'true', AWS_EMF_ENVIRONMENT: 'Local', LOG_FORMAT: 'ecs' },
    exclude: [
      ...configDefaults.exclude,
      'fit/**',
      'src/server/app/sets/high-risk-plants/journeys/linear/features/**/*.fit.spec.js'
    ],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.js'],
      exclude: [
        ...configDefaults.exclude,
        '**/*.test.js',
        '**/*.fit.spec.js',
        '.public',
        'coverage',
        'postcss.config.js',
        'stylelint.config.js',
        'vitest.config.js',
        '.sonarlint',
        'babel.config.cjs'
      ]
    }
  }
})

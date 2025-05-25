/**
 * Jest configuration file
 */

export default {
  testEnvironment: 'jsdom',
  transform: {},
  extensionsToTreatAsEsm: ['.js'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!.*\\.mjs$)'
  ],
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  // Setup to handle ES modules
  moduleFileExtensions: ['js', 'json', 'jsx', 'ts', 'tsx', 'node'],
  verbose: true
};

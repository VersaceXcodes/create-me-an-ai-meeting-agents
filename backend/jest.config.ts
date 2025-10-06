module.exports = {
  "testEnvironment": "node",
  "setupFilesAfterEnv": [
    "<rootDir>/tests/setup.js"
  ],
  "testMatch": [
    "**/__tests__/**/*.js",
    "**/*.test.js"
  ],
  "collectCoverageFrom": [
    "src/**/*.js",
    "!src/**/*.d.ts",
    "!src/tests/**"
  ],
  "coverageThreshold": {
    "global": {
      "branches": 80,
      "functions": 80,
      "lines": 80,
      "statements": 80
    }
  },
  "testTimeout": 10000,
  "clearMocks": true,
  "resetMocks": true,
  "restoreMocks": true,
  "preset": "ts-jest"
};
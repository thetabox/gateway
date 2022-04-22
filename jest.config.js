module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    watchPathIgnorePatterns: ['.js'],
    watchPlugins: [
      'jest-watch-typeahead/filename',
      'jest-watch-typeahead/testname',
    ]
  };
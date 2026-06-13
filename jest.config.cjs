// Jest config — React component + pure-logic unit tests (jsdom).
// Babel presets are passed inline via transform so this never interferes with
// Vite's own esbuild/react pipeline (no global babel.config needed).
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  testMatch: ['**/src/**/*.test.{js,jsx}', '**/__tests__/**/*.test.{js,jsx}'],
  transform: {
    '^.+\\.[jt]sx?$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }],
      ],
    }],
  },
  transformIgnorePatterns: ['/node_modules/'],
};

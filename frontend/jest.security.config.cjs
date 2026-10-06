module.exports = {
  rootDir: __dirname,
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/__tests__/*.security.spec.ts', '<rootDir>/src/lib/__tests__/cart-coupon.test.ts'],
  transform: {
    '^.+\\.[jt]sx?$': [require.resolve('../backend/node_modules/@swc/jest'), {
      jsc: { parser: { syntax: 'typescript', tsx: true }, transform: { react: { runtime: 'automatic' } } },
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^react$': '<rootDir>/node_modules/react',
    '^react/(.*)$': '<rootDir>/node_modules/react/$1',
    '^react-dom/(.*)$': '<rootDir>/node_modules/react-dom/$1',
  },
  moduleDirectories: ['node_modules'],
  transformIgnorePatterns: ['node_modules/(?!sanitize-html/|htmlparser2/|domutils/|domhandler/|domelementtype/|entities/|dom-serializer/)'],
};

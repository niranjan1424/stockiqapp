// .eslintrc.js (Corrected Version)

module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended', // <-- ADD THIS LINE
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: [
    'react',
    'react-hooks', // <-- ADD THIS LINE
  ],
  rules: {
    'react/jsx-no-undef': ['error', { allowGlobals: true }],
    'react/react-in-jsx-scope': 'off',
    'no-unused-vars': 'warn',
    'no-console': 'off',
    'react/prop-types': 'off', // Turning this off as we use PropTypes directly
    'react-hooks/rules-of-hooks': 'error', // Enforce Rules of Hooks
    'react-hooks/exhaustive-deps': 'warn', // Warn about missing dependencies
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
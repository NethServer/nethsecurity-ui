require('@rushstack/eslint-patch/modern-module-resolution')
module.exports = {
  root: true,
  extends: [
    'plugin:vue/vue3-essential',
    'eslint:recommended',
    '@vue/eslint-config-typescript',
    '@vue/eslint-config-prettier/skip-formatting'
  ],
  rules: {
    curly: ['error', 'all']
  },
  parserOptions: {
    ecmaVersion: 'latest'
  },
  ignorePatterns: [
    '.eslintrc.cjs',
    'postcss.config.js',
    'tailwind.config.js',
    'commitlint.config.js'
  ]
}

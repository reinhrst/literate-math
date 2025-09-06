import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';


export default defineConfig([
  eslint.configs.recommended,
  tseslint.configs.strict,
  tseslint.configs.stylistic,
  {
    ignores: [
      "node_modules/**",
      "main.js",       // generated
      "styles.css"     // generated
    ],
  }, {
    rules: {
      "prefer-const": "error",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
      "@typescript-eslint/no-non-null-assertion": "off",
      // Disallow `interface`, enforce `type`
      "@typescript-eslint/consistent-type-definitions": ["error", "type"]
    },
  },
]);

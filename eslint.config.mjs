// @ts-check

import eslint from '@eslint/js';
import tseslint from "typescript-eslint";
import eslintPluginPrettier from "eslint-plugin-prettier";

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    plugins: {
      prettier: eslintPluginPrettier,
    },
    rules: {
      "prettier/prettier": "warn",
    },
  },
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    ignores: [
      "**/.vscode-test/**",
      "eslint.config.mjs",
      "**/out/",
      "**/dist/",
      ".vscode-test.mjs",
      "esbuild.js",
    ],
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-console": "warn",
      "no-template-curly-in-string": "warn",
      "eqeqeq": "error",
      "no-invalid-this": "error",
      "no-lonely-if": "error"
    }
  }
);

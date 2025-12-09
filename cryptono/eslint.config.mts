import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Ignore
  { ignores: ["dist", "node_modules"] },

  // Basic Config
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
    ],
    // Attach all TS files in project
    files: ["**/*.{ts,tsx}"],
    
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,       // document, window, fetch 
        ...globals.webextensions, // Allows for extension code
      },
    },
    
    // Custom rules
    rules: {
      // Allow console log
      "no-console": "off", 
      
      // Warning instead of error for any
      "@typescript-eslint/no-explicit-any": "warn",
      
      // Must use const if variable is not overwritten
      "prefer-const": "error",
      
      // Show unused variables error in there is no _ prefix
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { 
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "caughtErrorsIgnorePattern": "^_"
        }
      ]
    },
  }
);
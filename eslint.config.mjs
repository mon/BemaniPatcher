import { defineConfig } from "eslint/config";
import html from "eslint-plugin-html";
import globals from "globals";

export default defineConfig([{
    plugins: {
        html,
    },

    languageOptions: {
        globals: {
            ...globals.browser,
        },

        ecmaVersion: "latest",
        sourceType: "module",
    },

    rules: {},
}]);

import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Disable TypeScript any type errors for now
      "@typescript-eslint/no-explicit-any": "off",
      
      // Disable unused variables warnings
      "@typescript-eslint/no-unused-vars": "off",
      
      // Disable React Hook dependencies warnings
      "react-hooks/exhaustive-deps": "off",
      
      // Disable img element warnings
      "@next/next/no-img-element": "off",
      
      // Disable alt text warnings
      "jsx-a11y/alt-text": "off",
    }
  }
];

export default eslintConfig;

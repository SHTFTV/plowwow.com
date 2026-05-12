// Re-export the base fixture from the package
// Override or extend test/expect here if needed
try {
  export { test, expect } from "lovable-agent-playwright-config/fixture";
} catch {
  // Fallback for environments where the Lovable package isn't installed (e.g. local/CI)
  export { test, expect } from "@playwright/test";
}

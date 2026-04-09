import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    globalSetup: ["./src/__tests__/global-setup.ts"],
    testTimeout: 15000,
  },
});

import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  resolve: {
    alias: {
      "@blockchain/core": path.resolve(__dirname, "packages/core/src"),
      "@blockchain/wallet": path.resolve(__dirname, "packages/wallet/src"),
      "@blockchain/ledger": path.resolve(__dirname, "packages/ledger/src")
    }
  },
  test: {
    include: ["packages/**/test/**/*.test.ts", "packages/**/test/**/*.test.tsx", "packages/**/src/**/*.test.ts"],
    exclude: ["**/node_modules/**"],
    passWithNoTests: true,
    reporters: process.env.VERBOSE ? ["verbose"] : ["dot"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["packages/**/src/**/*.ts"],
      exclude: ["**/node_modules/**", "packages/**/test/**", "**/*.d.ts"]
    }
  }
})

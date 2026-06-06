import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // config/env.ts 는 import 시점에 fail-fast 검증을 하므로 테스트용 더미 값 주입
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgres://user:pass@localhost:5432/song4u_test",
      S3_BUCKET: "song4u-test-bucket",
      INFERENCE_API_URL: "http://localhost:9000",
    },
  },
});

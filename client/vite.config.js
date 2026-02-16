import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  // ✅ 빌드 산출물(js/css) 폴더명을 바꿔서
  // /assets/vessels (업로드 이미지)와 충돌 방지
  build: {
    assetsDir: "app-assets",
  },

  server: {
    proxy: {
      // '/data': 'http://localhost:3002'
    },
  },
});

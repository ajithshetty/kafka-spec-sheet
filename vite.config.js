import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// IMPORTANT: set this to your repo name (with leading and trailing slash)
// e.g. if your repo is github.com/username/kafka-spec-sheet, use "/kafka-spec-sheet/"
// If you're deploying to a USER/ORG page (username.github.io), set base to "/"
export default defineConfig({
  plugins: [react()],
  base: "/kafka-spec-sheet/",
});

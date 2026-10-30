import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Public site address used for absolute URLs in link-preview meta tags.
// Override when deploying elsewhere, e.g. VITE_SITE_URL=https://example.com pnpm build
process.env.VITE_SITE_URL ??= 'https://sketchsync.dev'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})

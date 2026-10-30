import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// Public site address used for absolute URLs in link-preview meta tags.
// Override when deploying elsewhere, e.g. VITE_SITE_URL=https://example.com pnpm build
process.env.VITE_SITE_URL ??= 'https://sketchsync.dev'

/**
 * Content Security Policy for production builds: only this site's own scripts,
 * styles, fonts and images (plus data/blob URLs for avatars and exports).
 * Inline style attributes are needed for canvas sizing. Not applied in dev,
 * where Vite injects inline scripts for hot reloading. Prefer sending this as
 * an HTTP header from the host too, which also allows frame-ancestors.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const securityHeaders: Plugin = {
  name: 'sketchsync-csp',
  apply: 'build',
  transformIndexHtml: (html) =>
    html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy}" />\n    <meta name="referrer" content="strict-origin-when-cross-origin" />`),
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), securityHeaders],
  build: {
    // Keep fonts as files so the CSP can stay at font-src 'self' (no data: URLs).
    assetsInlineLimit: (file) => (file.endsWith('.woff2') ? false : undefined),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})

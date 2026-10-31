/// <reference types="vite-plugin-pwa/vanillajs" />
/// <reference types="vite-plugin-pwa/info" />
/// <reference types="vite-plugin-svgr/client" />
interface ImportMetaEnv {
  // The port to run the dev server
  VITE_APP_PORT: string;

  VITE_APP_BACKEND_V2_GET_URL: string;
  VITE_APP_BACKEND_V2_POST_URL: string;

  // collaboration WebSocket server (https: string
  VITE_APP_WS_SERVER_URL: string;

  VITE_APP_AI_BACKEND: string;

  // SketchSync server REST base (defaults to same-origin `/api`)
  VITE_APP_STORAGE_URL: string;

  // where the dev server proxies `/api` and `/socket.io` (default http://localhost:3002)
  VITE_APP_DEV_SERVER_PROXY: string;

  // whether to disable live reload / HMR. Usuaully what you want to do when
  // debugging Service Workers.
  VITE_APP_DEV_DISABLE_LIVE_RELOAD: string;

  VITE_APP_DISABLE_SENTRY: string;
  VITE_APP_SENTRY_DSN: string;

  // Set this flag to false if you want to open the overlay by default
  VITE_APP_COLLAPSE_OVERLAY: string;

  // Enable eslint in dev server
  VITE_APP_ENABLE_ESLINT: string;

  // Enable PWA in dev server
  VITE_APP_ENABLE_PWA: string;

  VITE_APP_GIT_SHA: string;

  MODE: string;

  DEV: string;
  PROD: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

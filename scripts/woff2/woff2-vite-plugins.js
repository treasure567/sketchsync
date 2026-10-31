// Preloading the default fonts keeps the first render from swapping fonts.
module.exports.woff2BrowserPlugin = () => {
  let isDev;

  return {
    name: "woff2BrowserPlugin",
    enforce: "pre",
    config(_, { command }) {
      isDev = command === "serve";
    },
    transform(code, id) {
      if (!isDev && id.endsWith("app/index.html")) {
        return code.replace(
          "<!-- PLACEHOLDER:SKETCHSYNC_APP_FONTS -->",
          `<!-- Preload all default fonts to avoid swap on init -->
      <link
        rel="preload"
        href="/fonts/Sketchfont/Sketchfont-Regular-a88b72a24fb54c9f94e3b5fdaa7481c9.woff2"
        as="font"
        type="font/woff2"
        crossorigin="anonymous"
      />
      <!-- For Nunito only preload the latin range, which should be good enough for now -->
      <link
        rel="preload"
        href="/fonts/Nunito/Nunito-Regular-XRXI3I6Li01BKofiOc5wtlZ2di8HDIkhdTQ3j6zbXWjgeg.woff2"
        as="font"
        type="font/woff2"
        crossorigin="anonymous"
      />
      <link
        rel="preload"
        href="/fonts/Assistant/Assistant-SemiBold.woff2"
        as="font"
        type="font/woff2"
        crossorigin="anonymous"
      />
      <link
        rel="preload"
        href="/fonts/ComicShanns/ComicShanns-Regular-279a7b317d12eb88de06167bd672b4b4.woff2"
        as="font"
        type="font/woff2"
        crossorigin="anonymous"
      />
    `,
        );
      }
    },
  };
};

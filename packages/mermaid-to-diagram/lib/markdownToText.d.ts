export declare const removeMarkdown: (
  markdown: string,
  options?: {
    stripListLeaders?: boolean;
    listUnicodeChar: string | boolean;
    gfm?: boolean;
    useImgAltText?: boolean;
  },
) => string;

/**
 * Replaces `\n` line breaks with `lineBreak`. An odd number of slashes before
 * `n` denotes a line break; pairs of slashes escape one another, so `\\n`
 * becomes the literal two-character text `\n`.
 */
export declare const replaceEscapedNewlines: (text: string, lineBreak: string) => string;
/**
 * Normalizes Mermaid text exactly once, before it is handed to a converter:
 * `<br>` tags and `\n` become line breaks.
 */
export declare const normalizeText: (text: string) => string;
/**
 * Normalizes real Mermaid break syntax and strips inline HTML before decoding
 * entities. Keeping this order is important: `&lt;br&gt;` and `&lt;sub&gt;`
 * are literal text, not markup.
 */
export declare const decodeMermaidText: (text: string) => string;
/**
 * Runs a parse or render `task` with `definition`. `<br>` doesn't parse
 * everywhere `\n` does (e.g. bare flowchart ids and subgraph titles, sequence
 * participants), so if the task fails, it's retried once with `<br>` replaced
 * by `\n`. If that fails too, the original error is thrown. Definitions that
 * parse cost nothing extra.
 */
export declare const withLineBreakFallback: <T>(definition: string, task: (definition: string) => Promise<T>) => Promise<T>;

/**
 * Cleans CSS property values by removing !important and trimming whitespace
 * This ensures that colors and other CSS values are valid and don't contain
 * CSS priority declarations that could cause issues in rendering.
 *
 * @param value - The CSS value to clean
 * @returns The cleaned CSS value without !important
 *
 * @example
 * cleanCSSValue("red !important") // => "red"
 * cleanCSSValue("  blue  ") // => "blue"
 * cleanCSSValue("#ff0000 !IMPORTANT") // => "#ff0000"
 */
export declare const cleanCSSValue: (value: string) => string;
export declare const parseCSSDeclarations: (input: string) => Array<{
    property: string;
    value: string;
}>;
export declare const isValidCSSColor: (value: string) => boolean;

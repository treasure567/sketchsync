import { validateLibraryUrl } from "./library";

describe("validateLibraryUrl", () => {
  it("should validate hostname & pathname", () => {
    // valid hostnames
    // -------------------------------------------------------------------------
    expect(validateLibraryUrl("https://www.example.com", ["example.com"])).toBe(
      true,
    );
    expect(validateLibraryUrl("https://example.com", ["example.com"])).toBe(
      true,
    );
    expect(
      validateLibraryUrl("https://library.example.com", ["example.com"]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://library.example.com", [
        "library.example.com",
      ]),
    ).toBe(true);
    expect(validateLibraryUrl("https://example.com/", ["example.com/"])).toBe(
      true,
    );
    expect(validateLibraryUrl("https://example.com", ["example.com/"])).toBe(
      true,
    );
    expect(validateLibraryUrl("https://example.com/", ["example.com"])).toBe(
      true,
    );

    // valid pathnames
    // -------------------------------------------------------------------------
    expect(
      validateLibraryUrl("https://example.com/path", ["example.com"]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://example.com/path/", ["example.com"]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://example.com/specific/path", [
        "example.com/specific/path",
      ]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://example.com/specific/path/", [
        "example.com/specific/path",
      ]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://example.com/specific/path", [
        "example.com/specific/path/",
      ]),
    ).toBe(true);
    expect(
      validateLibraryUrl("https://example.com/specific/path/other", [
        "example.com/specific/path",
      ]),
    ).toBe(true);

    // invalid hostnames
    // -------------------------------------------------------------------------
    expect(() =>
      validateLibraryUrl("https://xexample.com", ["example.com"]),
    ).toThrow();
    expect(() =>
      validateLibraryUrl("https://x-example.com", ["example.com"]),
    ).toThrow();
    expect(() =>
      validateLibraryUrl("https://example.comx", ["example.com"]),
    ).toThrow();
    expect(() =>
      validateLibraryUrl("https://example.comx", ["example.com"]),
    ).toThrow();
    expect(() =>
      validateLibraryUrl("https://example.com.mx", ["example.com"]),
    ).toThrow();
    // protocol must be https
    expect(() =>
      validateLibraryUrl("http://example.com.mx", ["example.com"]),
    ).toThrow();

    // invalid pathnames
    // -------------------------------------------------------------------------
    expect(() =>
      validateLibraryUrl("https://example.com/specific/other/path", [
        "example.com/specific/path",
      ]),
    ).toThrow();
    expect(() =>
      validateLibraryUrl("https://example.com/specific/paths", [
        "example.com/specific/path",
      ]),
    ).toThrow();
    expect(() =>
      validateLibraryUrl("https://example.com/specific/path-s", [
        "example.com/specific/path",
      ]),
    ).toThrow();
    expect(() =>
      validateLibraryUrl("https://example.com/some/specific/path", [
        "example.com/specific/path",
      ]),
    ).toThrow();
  });
});

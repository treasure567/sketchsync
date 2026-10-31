import { SketchSync, WelcomeScreen } from "@sketchsync/editor";
import { UI } from "@sketchsync/editor/tests/helpers/ui";
import {
  mockBoundingClientRect,
  render,
  restoreOriginalGetBoundingClientRect,
} from "@sketchsync/editor/tests/test-utils";

describe("Test MobileMenu", () => {
  const { h } = window;
  const dimensions = { height: 400, width: 800 };

  beforeAll(() => {
    mockBoundingClientRect(dimensions);
  });

  beforeEach(async () => {
    await render(
      <SketchSync>
        <WelcomeScreen />
      </SketchSync>,
    );
    h.app.refreshEditorInterface();
  });

  afterAll(() => {
    restoreOriginalGetBoundingClientRect();
  });

  it("should set editor interface correctly", () => {
    expect(h.app.editorInterface.formFactor).toBe("phone");
  });

  it("should initialize with welcome screen and hide once user interacts", async () => {
    expect(document.querySelector(".welcome-screen-center")).toMatchSnapshot();
    UI.clickTool("rectangle");
    expect(document.querySelector(".welcome-screen-center")).toBeNull();
  });
});

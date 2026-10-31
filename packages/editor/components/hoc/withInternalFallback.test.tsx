import React from "react";

import { SketchSync, MainMenu } from "../../index";
import { render, queryAllByTestId } from "../../tests/test-utils";

describe("Test internal component fallback rendering", () => {
  it("should render only one menu per sketchsync instance (custom menu first scenario)", async () => {
    const { container } = await render(
      <div>
        <SketchSync>
          <MainMenu>test</MainMenu>
        </SketchSync>
        <SketchSync />
      </div>,
    );

    expect(queryAllByTestId(container, "main-menu-trigger")?.length).toBe(2);

    const editorContainers = container.querySelectorAll<HTMLDivElement>(
      ".sketchsync-container",
    );

    expect(
      queryAllByTestId(editorContainers[0], "main-menu-trigger")?.length,
    ).toBe(1);
    expect(
      queryAllByTestId(editorContainers[1], "main-menu-trigger")?.length,
    ).toBe(1);
  });

  it("should render only one menu per sketchsync instance (default menu first scenario)", async () => {
    const { container } = await render(
      <div>
        <SketchSync />
        <SketchSync>
          <MainMenu>test</MainMenu>
        </SketchSync>
      </div>,
    );

    expect(queryAllByTestId(container, "main-menu-trigger")?.length).toBe(2);

    const editorContainers = container.querySelectorAll<HTMLDivElement>(
      ".sketchsync-container",
    );

    expect(
      queryAllByTestId(editorContainers[0], "main-menu-trigger")?.length,
    ).toBe(1);
    expect(
      queryAllByTestId(editorContainers[1], "main-menu-trigger")?.length,
    ).toBe(1);
  });

  it("should render only one menu per sketchsync instance (two custom menus scenario)", async () => {
    const { container } = await render(
      <div>
        <SketchSync>
          <MainMenu>test</MainMenu>
        </SketchSync>
        <SketchSync>
          <MainMenu>test</MainMenu>
        </SketchSync>
      </div>,
    );

    expect(queryAllByTestId(container, "main-menu-trigger")?.length).toBe(2);

    const editorContainers = container.querySelectorAll<HTMLDivElement>(
      ".sketchsync-container",
    );

    expect(
      queryAllByTestId(editorContainers[0], "main-menu-trigger")?.length,
    ).toBe(1);
    expect(
      queryAllByTestId(editorContainers[1], "main-menu-trigger")?.length,
    ).toBe(1);
  });

  it("should render only one menu per sketchsync instance (two default menus scenario)", async () => {
    const { container } = await render(
      <div>
        <SketchSync />
        <SketchSync />
      </div>,
    );

    expect(queryAllByTestId(container, "main-menu-trigger")?.length).toBe(2);

    const editorContainers = container.querySelectorAll<HTMLDivElement>(
      ".sketchsync-container",
    );

    expect(
      queryAllByTestId(editorContainers[0], "main-menu-trigger")?.length,
    ).toBe(1);
    expect(
      queryAllByTestId(editorContainers[1], "main-menu-trigger")?.length,
    ).toBe(1);
  });
});

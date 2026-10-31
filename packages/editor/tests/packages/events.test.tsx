import React from "react";
import { vi } from "vitest";

import { resolvablePromise } from "@sketchsync/common";

import { SketchSync, CaptureUpdateAction } from "../../index";
import { API } from "../helpers/api";
import { Pointer } from "../helpers/ui";
import { render, unmountComponent } from "../test-utils";

import type { SketchSyncImperativeAPI } from "../../types";

describe("event callbacks", () => {
  const h = window.h;

  let sketchsyncAPI: SketchSyncImperativeAPI;

  const mouse = new Pointer("mouse");

  beforeEach(async () => {
    const sketchsyncAPIPromise = resolvablePromise<SketchSyncImperativeAPI>();
    await render(
      <SketchSync
        onSketchSyncAPI={(api) => sketchsyncAPIPromise.resolve(api as any)}
      />,
    );
    sketchsyncAPI = await sketchsyncAPIPromise;
  });

  it("should resolve editor:mount/editor:initialize when subscribed before mount", async () => {
    unmountComponent();

    const lifecyclePromise = resolvablePromise<{
      api: SketchSyncImperativeAPI;
      mount: Promise<{
        sketchsyncAPI: SketchSyncImperativeAPI;
        container: HTMLDivElement | null;
      }>;
      initialize: Promise<SketchSyncImperativeAPI>;
    }>();

    await render(
      <SketchSync
        onSketchSyncAPI={(api) => {
          if (api) {
            lifecyclePromise.resolve({
              api,
              mount: api.onEvent("editor:mount"),
              initialize: api.onEvent("editor:initialize"),
            });
          }
        }}
      />,
    );

    const { api, mount, initialize } = await lifecyclePromise;
    await expect(mount).resolves.toEqual({
      sketchsyncAPI: api,
      container: expect.any(HTMLDivElement),
    });
    await expect(initialize).resolves.toBe(api);
  });

  it("should replay editor:mount/editor:initialize to late subscribers", async () => {
    const onMount = vi.fn();
    const onInitialize = vi.fn();

    sketchsyncAPI.onEvent("editor:mount", onMount);
    sketchsyncAPI.onEvent("editor:initialize", onInitialize);

    await Promise.resolve();

    expect(onMount).toHaveBeenCalledTimes(1);
    expect(onMount).toHaveBeenCalledWith({
      sketchsyncAPI,
      container: expect.any(HTMLDivElement),
    });
    expect(onInitialize).toHaveBeenCalledTimes(1);
    expect(onInitialize).toHaveBeenCalledWith(sketchsyncAPI);

    await expect(sketchsyncAPI.onEvent("editor:mount")).resolves.toEqual({
      sketchsyncAPI,
      container: expect.any(HTMLDivElement),
    });
    await expect(sketchsyncAPI.onEvent("editor:initialize")).resolves.toBe(
      sketchsyncAPI,
    );
  });

  it("should call onMount before onInitialize props", async () => {
    unmountComponent();

    const calls: string[] = [];

    await render(
      <SketchSync
        onMount={({ sketchsyncAPI, container }) => {
          expect(sketchsyncAPI).toBeDefined();
          expect(container).toBeInstanceOf(HTMLDivElement);
          calls.push("mount");
        }}
        onInitialize={() => {
          calls.push("initialize");
        }}
      />,
    );

    expect(calls).toEqual(["mount", "initialize"]);
  });

  it("should trigger onChange on render", async () => {
    const onChange = vi.fn();

    const origBackgroundColor = h.state.viewBackgroundColor;
    sketchsyncAPI.onChange(onChange);
    API.updateScene({
      appState: { viewBackgroundColor: "red" },
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
    expect(onChange).toHaveBeenCalledWith(
      // elements
      [],
      // appState
      expect.objectContaining({
        viewBackgroundColor: "red",
      }),
      // files
      {},
    );
    expect(onChange.mock?.lastCall?.[1].viewBackgroundColor).not.toBe(
      origBackgroundColor,
    );
  });

  it("should trigger onPointerDown/onPointerUp on canvas pointerDown/pointerUp", async () => {
    const onPointerDown = vi.fn();
    const onPointerUp = vi.fn();

    sketchsyncAPI.onPointerDown(onPointerDown);
    sketchsyncAPI.onPointerUp(onPointerUp);

    mouse.downAt(100);
    expect(onPointerDown).toHaveBeenCalledTimes(1);
    expect(onPointerUp).not.toHaveBeenCalled();
    mouse.up();
    expect(onPointerDown).toHaveBeenCalledTimes(1);
    expect(onPointerUp).toHaveBeenCalledTimes(1);
  });
});

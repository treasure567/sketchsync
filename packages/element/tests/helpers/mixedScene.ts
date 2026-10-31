import { pointFrom } from "@sketchsync/math";
import { API } from "@sketchsync/editor/tests/helpers/api";

import type { LocalPoint } from "@sketchsync/math";

import type { NonDeletedSketchSyncElement } from "../../src/types";

// Seeded so that a failing case or a benchmark run can be reproduced.
export const createRandom = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
};

const randomWalk = (random: () => number, steps: number, stepSize: number) => {
  const points = [pointFrom<LocalPoint>(0, 0)];
  let x = 0;
  let y = 0;
  for (let i = 1; i < steps; i++) {
    x += (random() - 0.3) * stepSize;
    y += (random() - 0.5) * stepSize;
    points.push(pointFrom<LocalPoint>(x, y));
  }
  return points;
};

export const createMixedScene = ({
  count,
  spread = 20_000,
  seed = 1,
}: {
  count: number;
  spread?: number;
  seed?: number;
}) => {
  const random = createRandom(seed);
  const between = (min: number, max: number) => min + random() * (max - min);
  const elements: NonDeletedSketchSyncElement[] = [];

  while (elements.length < count) {
    const x = between(-spread / 2, spread / 2);
    const y = between(-spread / 2, spread / 2);
    const width = between(40, 400);
    const height = between(40, 300);
    const angle = random() < 0.2 ? between(0, Math.PI * 2) : 0;
    const roll = random();
    const canAddLabeledPair = count - elements.length >= 2;

    if (roll < 0.15) {
      elements.push(
        API.createElement({ type: "rectangle", x, y, width, height, angle }),
      );
    } else if (roll < 0.25) {
      elements.push(
        API.createElement({ type: "ellipse", x, y, width, height, angle }),
      );
    } else if (roll < 0.32) {
      elements.push(
        API.createElement({ type: "diamond", x, y, width, height, angle }),
      );
    } else if (roll < 0.47) {
      elements.push(
        API.createElement({
          type: "text",
          x,
          y,
          width: between(40, 300),
          height: 25,
          angle,
          text: "note",
        }),
      );
    } else if (roll < 0.57) {
      elements.push(
        API.createElement({
          type: "arrow",
          x,
          y,
          points: randomWalk(random, 3, 300),
        }),
      );
    } else if (roll < 0.62) {
      elements.push(
        API.createElement({
          type: "line",
          x,
          y,
          angle,
          points: randomWalk(random, 4, 200),
        }),
      );
    } else if (roll < 0.74) {
      elements.push(
        API.createElement({
          type: "freedraw",
          x,
          y,
          points: randomWalk(random, 20, 30),
        }),
      );
    } else if (roll < 0.9 && canAddLabeledPair) {
      const containerId = `container-${elements.length}`;
      const label = API.createElement({
        type: "text",
        x: x + 10,
        y: y + height / 2 - 12,
        width: Math.max(10, width - 20),
        height: 25,
        angle,
        text: "label",
        containerId,
      });
      elements.push(
        API.createElement({
          type: "rectangle",
          id: containerId,
          x,
          y,
          width,
          height,
          angle,
          boundElements: [{ type: "text", id: label.id }],
        }),
        label,
      );
    } else if (roll < 0.98 && canAddLabeledPair) {
      const arrowId = `labeled-arrow-${elements.length}`;
      const label = API.createElement({
        type: "text",
        width: 60,
        height: 25,
        text: "label",
        containerId: arrowId,
      });
      elements.push(
        API.createElement({
          type: "arrow",
          id: arrowId,
          x,
          y,
          points: randomWalk(random, 3, 300),
          boundElements: [{ type: "text", id: label.id }],
        }),
        label,
      );
    } else {
      // A few frames, some big enough to span many grid cells.
      const size = random() < 0.2 ? between(3000, 9000) : between(400, 1500);
      elements.push(
        API.createElement({ type: "frame", x, y, width: size, height: size }),
      );
    }
  }

  return elements;
};

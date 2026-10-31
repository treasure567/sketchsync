import { useCallback, useLayoutEffect } from "react";

import { atom, useAtom } from "../editor-jotai";

import { useApp } from "./App";

export type Handedness = "left" | "right";

export const MOBILE_TOUCH_TARGET_SIZE = 44;

export const HANDEDNESS_STORAGE_KEY = "sketchsync-mobile-handedness";

const storedHandednessAtom = atom<Handedness | null>(null);

export const readStoredHandedness = (ownerWindow: Window): Handedness => {
  try {
    return ownerWindow.localStorage.getItem(HANDEDNESS_STORAGE_KEY) === "left"
      ? "left"
      : "right";
  } catch {
    return "right";
  }
};

const storeHandedness = (ownerWindow: Window, handedness: Handedness) => {
  try {
    ownerWindow.localStorage.setItem(HANDEDNESS_STORAGE_KEY, handedness);
  } catch {
    return false;
  }
  return true;
};

export const useHandedness = () => {
  const app = useApp();
  const [storedHandedness, setStoredHandedness] = useAtom(storedHandednessAtom);
  const handedness = storedHandedness ?? readStoredHandedness(app.ownerWindow);

  useLayoutEffect(() => {
    if (storedHandedness === null) {
      setStoredHandedness(readStoredHandedness(app.ownerWindow));
    }
  }, [app, storedHandedness, setStoredHandedness]);

  const setHandedness = useCallback(
    (next: Handedness) => {
      setStoredHandedness(next);
      storeHandedness(app.ownerWindow, next);
    },
    [app, setStoredHandedness],
  );

  return [handedness, setHandedness] as const;
};

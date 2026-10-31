import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import {
  MainMenu,
  useSketchSyncAPI,
  useSketchSyncStateValue,
} from "@sketchsync/editor";
import { playerPlayIcon } from "@sketchsync/editor/components/icons";
import { isDarwin, isTestEnv } from "@sketchsync/common";

import { appJotaiStore, atom, useAtom } from "../app-jotai";

import {
  TOUR_STEPS,
  placeTourCard,
  readTourDone,
  writeTourDone,
} from "./onboardingTourSteps";

import "./OnboardingTour.scss";

import type { CardPlacement, Rect } from "./onboardingTourSteps";

const AUTO_START_DELAY_MS = 900;
const HIGHLIGHT_PADDING = 4;

const quickTourOpenAtom = atom(false);

export const startQuickTour = () => {
  appJotaiStore.set(quickTourOpenAtom, true);
};

const getLocalStorage = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const findVisibleTarget = (selectors: readonly string[]): Rect | null => {
  for (const selector of selectors) {
    for (const element of document.querySelectorAll<HTMLElement>(selector)) {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        };
      }
    }
  }
  return null;
};

const QuickTourCard = ({ onClose }: { onClose: () => void }) => {
  const api = useSketchSyncAPI();
  const [stepIndex, setStepIndex] = useState(0);
  const [target, setTarget] = useState<Rect | null>(null);
  const [placement, setPlacement] = useState<CardPlacement | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const step = TOUR_STEPS[stepIndex];
  const isLastStep = stepIndex === TOUR_STEPS.length - 1;
  const isPhone = api?.getEditorInterface().formFactor === "phone";

  const measure = useCallback(() => {
    const card = cardRef.current;
    if (!card) {
      return;
    }
    const nextTarget = findVisibleTarget(step.targets);
    setTarget(nextTarget);
    setPlacement(
      placeTourCard(
        nextTarget,
        { width: card.offsetWidth, height: card.offsetHeight },
        { width: window.innerWidth, height: window.innerHeight },
      ),
    );
  }, [step]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  const isPlaced = placement !== null;
  useEffect(() => {
    if (isPlaced) {
      cardRef.current?.focus({ preventScroll: true });
    }
  }, [isPlaced, stepIndex]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    // keeps the editor's single-key tool shortcuts from firing while the
    // card has focus, but lets modifier shortcuts such as undo through
    if (!event.ctrlKey && !event.metaKey && !event.altKey) {
      event.stopPropagation();
    }
  };

  return (
    <>
      {target && (
        <div
          className="quick-tour__highlight"
          aria-hidden="true"
          style={{
            left: target.left - HIGHLIGHT_PADDING,
            top: target.top - HIGHLIGHT_PADDING,
            width: target.width + HIGHLIGHT_PADDING * 2,
            height: target.height + HIGHLIGHT_PADDING * 2,
          }}
        />
      )}
      <div
        ref={cardRef}
        className="quick-tour__card"
        role="dialog"
        aria-modal="false"
        aria-labelledby="quick-tour-title"
        aria-describedby="quick-tour-body"
        tabIndex={-1}
        data-testid="quick-tour"
        data-side={placement?.side ?? "centre"}
        style={{
          left: placement?.left ?? 0,
          top: placement?.top ?? 0,
          visibility: placement ? "visible" : "hidden",
        }}
        onKeyDown={handleKeyDown}
      >
        <p className="quick-tour__progress">
          Step {stepIndex + 1} of {TOUR_STEPS.length}
        </p>
        <h2 id="quick-tour-title" className="quick-tour__title">
          {step.title}
        </h2>
        <p id="quick-tour-body" className="quick-tour__body">
          {step.body({ isPhone, isMac: isDarwin })}
        </p>
        <div className="quick-tour__buttons">
          <button type="button" className="quick-tour__skip" onClick={onClose}>
            {isLastStep ? "Close" : "Skip tour"}
          </button>
          <span className="quick-tour__spacer" />
          {stepIndex > 0 && (
            <button
              type="button"
              className="quick-tour__back"
              onClick={() => setStepIndex(stepIndex - 1)}
            >
              Back
            </button>
          )}
          <button
            type="button"
            className="quick-tour__next"
            onClick={() =>
              isLastStep ? onClose() : setStepIndex(stepIndex + 1)
            }
          >
            {isLastStep ? "Start drawing" : "Next"}
          </button>
        </div>
      </div>
    </>
  );
};

export const OnboardingTour = () => {
  const api = useSketchSyncAPI();
  const [isOpen, setIsOpen] = useAtom(quickTourOpenAtom);
  const isLoading = useSketchSyncStateValue("isLoading");
  const viewModeEnabled = useSketchSyncStateValue("viewModeEnabled");
  const hasCheckedAutoStartRef = useRef(false);
  const autoStartTimerRef = useRef<number | null>(null);
  const focusBeforeTourRef = useRef<Element | null>(null);

  useEffect(() => {
    if (
      !api ||
      isLoading !== false ||
      hasCheckedAutoStartRef.current ||
      isTestEnv()
    ) {
      return;
    }
    hasCheckedAutoStartRef.current = true;
    if (viewModeEnabled || readTourDone(getLocalStorage()) !== false) {
      return;
    }
    autoStartTimerRef.current = window.setTimeout(
      () => setIsOpen(true),
      AUTO_START_DELAY_MS,
    );
  }, [api, isLoading, setIsOpen, viewModeEnabled]);

  useEffect(
    () => () => {
      if (autoStartTimerRef.current !== null) {
        window.clearTimeout(autoStartTimerRef.current);
      }
    },
    [],
  );

  useLayoutEffect(() => {
    if (isOpen) {
      focusBeforeTourRef.current = document.activeElement;
    }
  }, [isOpen]);

  const close = useCallback(() => {
    writeTourDone(getLocalStorage());
    setIsOpen(false);
    const previous = focusBeforeTourRef.current;
    const fallback = document.querySelector<HTMLElement>(".sketchsync");
    (previous instanceof HTMLElement && previous.isConnected
      ? previous
      : fallback
    )?.focus();
  }, [setIsOpen]);

  return isOpen ? <QuickTourCard onClose={close} /> : null;
};

export const QuickTourMenuItem = () => (
  <MainMenu.Item
    icon={playerPlayIcon}
    onSelect={startQuickTour}
    data-testid="quick-tour-menu-item"
  >
    Quick tour
  </MainMenu.Item>
);

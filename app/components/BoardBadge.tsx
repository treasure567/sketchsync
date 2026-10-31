import { useAtomValue } from "../app-jotai";
import { currentBoardAtom } from "../data/sketchsyncApi";

import { ROLE_LABELS } from "./sketchsyncUi";

import "./SketchSync.scss";

export const BoardBadge = ({ onOpen }: { onOpen: () => void }) => {
  const board = useAtomValue(currentBoardAtom);
  if (!board) {
    return null;
  }
  return (
    <button
      type="button"
      className="ss-board-badge"
      onClick={onOpen}
      title="Board sharing and history"
      aria-label={`Board ${board.title}, you ${ROLE_LABELS[
        board.role
      ].toLowerCase()}. Open sharing and history.`}
    >
      <strong>{board.title}</strong>
      <span className="ss-badge">
        {board.role === "viewer" ? "View only" : ROLE_LABELS[board.role]}
      </span>
    </button>
  );
};

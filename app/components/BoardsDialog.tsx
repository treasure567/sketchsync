import { Dialog } from "@sketchsync/editor/components/Dialog";
import { FilledButton } from "@sketchsync/editor/components/FilledButton";
import { useCallback, useEffect, useState } from "react";

import { atom, useAtom, useAtomValue, useSetAtom } from "../app-jotai";
import { getCollaborationLink } from "../data";
import {
  api,
  currentBoardAtom,
  currentUserAtom,
  describeError,
} from "../data/sketchsyncApi";

import { accountDialogAtom } from "./AccountDialog";
import { formatRelative, ROLE_LABELS } from "./sketchsyncUi";

import "./SketchSync.scss";

import type { BoardSummary } from "../data/sketchsyncApi";

export const boardsDialogAtom = atom(false);

export const openBoardLink = (boardId: string) => {
  window.location.assign(getCollaborationLink({ roomId: boardId }));
};

const BoardRow = ({
  board,
  isOpen,
  onChanged,
}: {
  board: BoardSummary;
  isOpen: boolean;
  onChanged: () => void;
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [title, setTitle] = useState(board.title);
  const [error, setError] = useState<string | null>(null);
  const isOwner = board.role === "owner";

  const rename = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await api.renameBoard(board.id, title.trim());
      setIsRenaming(false);
      onChanged();
    } catch (failure) {
      setError(describeError(failure));
    }
  };

  const remove = async () => {
    if (
      !window.confirm(
        `Delete "${board.title}" for everyone? This can't be undone.`,
      )
    ) {
      return;
    }
    try {
      await api.deleteBoard(board.id);
      onChanged();
    } catch (failure) {
      setError(describeError(failure));
    }
  };

  return (
    <li>
      {isRenaming ? (
        <form className="ss-row ss-grow" onSubmit={rename}>
          <input
            className="ss-input ss-grow"
            aria-label="Board name"
            autoFocus
            required
            maxLength={120}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <button className="ss-link-button" type="submit">
            Save
          </button>
          <button
            className="ss-link-button"
            type="button"
            onClick={() => setIsRenaming(false)}
          >
            Cancel
          </button>
        </form>
      ) : (
        <>
          <div className="ss-list-main">
            <strong>{board.title}</strong>
            <span>
              {isOwner ? "Yours" : `Shared by ${board.ownerName}`} · edited{" "}
              {formatRelative(board.updatedAt)}
            </span>
            {error && <span role="alert">{error}</span>}
          </div>
          <span className="ss-badge">{ROLE_LABELS[board.role]}</span>
          {isOwner && (
            <>
              <button
                className="ss-link-button"
                type="button"
                onClick={() => setIsRenaming(true)}
              >
                Rename
              </button>
              <button
                className="ss-link-button ss-link-button--danger"
                type="button"
                onClick={remove}
              >
                Delete
              </button>
            </>
          )}
          <button
            className="ss-link-button"
            type="button"
            disabled={isOpen}
            onClick={() => openBoardLink(board.id)}
          >
            {isOpen ? "Open now" : "Open"}
          </button>
        </>
      )}
    </li>
  );
};

export const BoardsDialog = () => {
  const [isOpen, setIsOpen] = useAtom(boardsDialogAtom);
  const user = useAtomValue(currentUserAtom);
  const currentBoard = useAtomValue(currentBoardAtom);
  const setAccountDialog = useSetAtom(accountDialogAtom);
  const [boards, setBoards] = useState<BoardSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .listBoards()
      .then((list) => {
        setBoards(list);
        setError(null);
      })
      .catch((failure) => setError(describeError(failure)));
  }, []);

  useEffect(() => {
    if (isOpen && user) {
      load();
    }
  }, [isOpen, user, load]);

  if (!isOpen) {
    return null;
  }

  const close = () => setIsOpen(false);

  const createBoard = async () => {
    try {
      const board = await api.createBoard("Untitled board", []);
      close();
      openBoardLink(board.id);
    } catch (failure) {
      setError(describeError(failure));
    }
  };

  return (
    <Dialog size="regular" onCloseRequest={close} title={false}>
      <div className="ss-dialog">
        <div className="ss-row">
          <h2 className="ss-heading ss-grow">My boards</h2>
          {user && (
            <FilledButton
              size="large"
              label="New board"
              onClick={createBoard}
            />
          )}
        </div>

        {!user ? (
          <div className="ss-empty">
            <p>Sign in to see your boards and the ones shared with you.</p>
            <FilledButton
              size="large"
              label="Sign in"
              onClick={() => {
                close();
                setAccountDialog({
                  isOpen: true,
                  onSignedIn: () => setIsOpen(true),
                });
              }}
            />
          </div>
        ) : error ? (
          <p className="ss-error" role="alert">
            {error}
          </p>
        ) : boards === null ? (
          <p className="ss-muted">Loading…</p>
        ) : boards.length === 0 ? (
          <div className="ss-empty">
            No boards yet. Create one, or use Share → Start a live board to turn
            your current drawing into a board.
          </div>
        ) : (
          <ul className="ss-list" aria-label="Boards">
            {boards.map((board) => (
              <BoardRow
                key={board.id}
                board={board}
                isOpen={board.id === currentBoard?.id}
                onChanged={load}
              />
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
};

import { exportScene } from "@sketchsync/editor";
import { Dialog } from "@sketchsync/editor/components/Dialog";
import { restoreElements } from "@sketchsync/editor/data/restore";
import { getNonDeletedElements } from "@sketchsync/element";
import { useCallback, useEffect, useRef, useState } from "react";

import type { SketchSyncImperativeAPI } from "@sketchsync/editor/types";

import { atom, useAtom, useAtomValue } from "../app-jotai";
import { api, currentBoardAtom, describeError } from "../data/sketchsyncApi";

import { formatRelative, SubmitButton } from "./sketchsyncUi";

import "./SketchSync.scss";

import type { VersionSummary } from "../data/sketchsyncApi";

export const versionHistoryDialogAtom = atom(false);

const KIND_LABELS: Record<VersionSummary["kind"], string> = {
  auto: "Automatic snapshot",
  manual: "Saved version",
  "before-restore": "Before a restore",
};

const VersionPreview = ({
  boardId,
  versionId,
  sketchsyncAPI,
}: {
  boardId: string;
  versionId: string;
  sketchsyncAPI: SketchSyncImperativeAPI;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const elements = getNonDeletedElements(
          restoreElements(await api.getVersion(boardId, versionId), null),
        );
        const svg = await exportScene({
          type: "svg",
          data: { elements, files: sketchsyncAPI.getFiles() },
          config: {
            theme: sketchsyncAPI.getAppState().theme,
            skipInliningFonts: true,
          },
        });
        svg.setAttribute("role", "img");
        svg.setAttribute(
          "aria-label",
          `Preview of this version with ${elements.length} elements`,
        );
        if (!cancelled) {
          ref.current?.replaceChildren(svg);
        }
      } catch (failure) {
        if (!cancelled) {
          setError(describeError(failure));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [boardId, versionId, sketchsyncAPI]);

  return error ? (
    <p className="ss-error" role="alert">
      {error}
    </p>
  ) : (
    <div className="ss-preview" ref={ref}>
      <span className="ss-muted">Rendering preview…</span>
    </div>
  );
};

export const VersionHistoryDialog = ({
  sketchsyncAPI,
}: {
  sketchsyncAPI: SketchSyncImperativeAPI;
}) => {
  const [isOpen, setIsOpen] = useAtom(versionHistoryDialogAtom);
  const board = useAtomValue(currentBoardAtom);
  const [versions, setVersions] = useState<VersionSummary[] | null>(null);
  const [label, setLabel] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!board) {
      return;
    }
    api
      .listVersions(board.id)
      .then(setVersions)
      .catch((failure) => setError(describeError(failure)));
  }, [board]);

  useEffect(() => {
    if (isOpen) {
      load();
    }
  }, [isOpen, load]);

  if (!isOpen || !board) {
    return null;
  }

  const canEdit = board.role !== "viewer";

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.saveVersion(board.id, label.trim() || null);
      setLabel("");
      setMessage("Version saved.");
      load();
    } catch (failure) {
      setError(describeError(failure));
    } finally {
      setBusy(false);
    }
  };

  const restore = async (version: VersionSummary) => {
    const name = version.label ?? KIND_LABELS[version.kind].toLowerCase();
    if (
      !window.confirm(
        `Restore "${name}" from ${formatRelative(
          version.createdAt,
        )}? Everyone on the board will see the change. The current board is saved first, so you can undo this from here.`,
      )
    ) {
      return;
    }
    setError(null);
    try {
      const { changedElements } = await api.restoreVersion(
        board.id,
        version.id,
      );
      setMessage(
        changedElements
          ? `Restored. ${changedElements} element${
              changedElements === 1 ? "" : "s"
            } changed.`
          : "The board already matched that version.",
      );
      load();
    } catch (failure) {
      setError(describeError(failure));
    }
  };

  return (
    <Dialog
      size="regular"
      onCloseRequest={() => setIsOpen(false)}
      title={false}
    >
      <div className="ss-dialog">
        <div>
          <h2 className="ss-heading">Version history</h2>
          <p className="ss-muted">
            SketchSync takes a snapshot of “{board.title}” automatically while
            people work on it. Restoring a version applies it as a new change
            for everyone.
          </p>
        </div>

        {canEdit && (
          <form className="ss-row" onSubmit={save}>
            <label className="ss-field ss-grow">
              Name this version (optional)
              <input
                className="ss-input"
                maxLength={120}
                placeholder="e.g. Before the exam review"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
              />
            </label>
            <SubmitButton label="Save version" busy={busy} />
          </form>
        )}

        {message && (
          <p className="ss-muted" role="status">
            {message}
          </p>
        )}
        {error && (
          <p className="ss-error" role="alert">
            {error}
          </p>
        )}

        {versions === null ? (
          <p className="ss-muted">Loading…</p>
        ) : versions.length === 0 ? (
          <div className="ss-empty">
            No versions yet. One is saved automatically every 30 minutes while
            the board is being edited{canEdit ? ", or save one now" : ""}.
          </div>
        ) : (
          <ul className="ss-list" aria-label="Versions">
            {versions.map((version) => (
              <li
                key={version.id}
                style={{ flexWrap: "wrap" }}
                aria-current={previewId === version.id ? "true" : undefined}
              >
                <div className="ss-list-main">
                  <strong>{version.label ?? KIND_LABELS[version.kind]}</strong>
                  <span title={new Date(version.createdAt).toLocaleString()}>
                    {formatRelative(version.createdAt)}
                    {version.createdByName
                      ? ` · by ${version.createdByName}`
                      : ""}{" "}
                    · {version.elementCount} element
                    {version.elementCount === 1 ? "" : "s"}
                  </span>
                </div>
                <button
                  className="ss-link-button"
                  type="button"
                  aria-expanded={previewId === version.id}
                  onClick={() =>
                    setPreviewId(previewId === version.id ? null : version.id)
                  }
                >
                  {previewId === version.id ? "Hide preview" : "Preview"}
                </button>
                {canEdit && (
                  <button
                    className="ss-link-button"
                    type="button"
                    onClick={() => restore(version)}
                  >
                    Restore
                  </button>
                )}
                {previewId === version.id && (
                  <div style={{ flexBasis: "100%" }}>
                    <VersionPreview
                      boardId={board.id}
                      versionId={version.id}
                      sketchsyncAPI={sketchsyncAPI}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
};

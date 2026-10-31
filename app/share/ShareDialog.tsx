import { trackEvent } from "@sketchsync/editor/analytics";
import { Dialog } from "@sketchsync/editor/components/Dialog";
import { FilledButton } from "@sketchsync/editor/components/FilledButton";
import { LinkIcon, playerPlayIcon } from "@sketchsync/editor/components/icons";
import { useUIAppState } from "@sketchsync/editor/context/ui-appState";
import { useI18n } from "@sketchsync/editor/i18n";
import { getFrame } from "@sketchsync/common";
import { useEffect } from "react";

import { atom, useAtom, useAtomValue } from "../app-jotai";
import { currentBoardAtom } from "../data/sketchsyncApi";

import "./ShareDialog.scss";
import { BoardShareDialog } from "./BoardShareDialog";

import type { CollabAPI } from "../collab/Collab";

type OnExportToBackend = () => void;
type ShareDialogType = "share" | "collaborationOnly";

export const shareDialogStateAtom = atom<
  { isOpen: false } | { isOpen: true; type: ShareDialogType }
>({ isOpen: false });

export type ShareDialogProps = {
  collabAPI: CollabAPI | null;
  handleClose: () => void;
  onExportToBackend: OnExportToBackend;
  type: ShareDialogType;
};

const ShareDialogPicker = (props: ShareDialogProps) => {
  const { t } = useI18n();

  const { collabAPI } = props;

  const startCollabJSX = collabAPI ? (
    <>
      <div className="ShareDialog__picker__header">Live board</div>

      <div className="ShareDialog__picker__description">
        Turn this drawing into a board that others can open and edit with you in
        real time, with roles, invite links and version history. You need a free
        account; your current drawing comes with you.
      </div>

      <div className="ShareDialog__picker__button">
        <FilledButton
          size="large"
          label="Start a live board"
          icon={playerPlayIcon}
          onClick={() => {
            trackEvent("share", "room creation", `ui (${getFrame()})`);
            collabAPI.startCollaboration(null);
          }}
        />
      </div>

      {props.type === "share" && (
        <div className="ShareDialog__separator">
          <span>{t("shareDialog.or")}</span>
        </div>
      )}
    </>
  ) : null;

  return (
    <>
      {startCollabJSX}

      {props.type === "share" && (
        <>
          <div className="ShareDialog__picker__header">
            {t("exportDialog.link_title")}
          </div>
          <div className="ShareDialog__picker__description">
            {t("exportDialog.link_details")}
          </div>

          <div className="ShareDialog__picker__button">
            <FilledButton
              size="large"
              label={t("exportDialog.link_button")}
              icon={LinkIcon}
              onClick={async () => {
                await props.onExportToBackend();
                props.handleClose();
              }}
            />
          </div>
        </>
      )}
    </>
  );
};

const ShareDialogInner = (props: ShareDialogProps) => {
  const board = useAtomValue(currentBoardAtom);

  return (
    <Dialog
      size={board ? "regular" : "small"}
      onCloseRequest={props.handleClose}
      title={false}
    >
      <div className="ShareDialog">
        {props.collabAPI && board ? (
          <BoardShareDialog
            collabAPI={props.collabAPI}
            board={board}
            handleClose={props.handleClose}
          />
        ) : (
          <ShareDialogPicker {...props} />
        )}
      </div>
    </Dialog>
  );
};

export const ShareDialog = (props: {
  collabAPI: CollabAPI | null;
  onExportToBackend: OnExportToBackend;
}) => {
  const [shareDialogState, setShareDialogState] = useAtom(shareDialogStateAtom);

  const { openDialog } = useUIAppState();

  useEffect(() => {
    if (openDialog) {
      setShareDialogState({ isOpen: false });
    }
  }, [openDialog, setShareDialogState]);

  if (!shareDialogState.isOpen) {
    return null;
  }

  return (
    <ShareDialogInner
      handleClose={() => setShareDialogState({ isOpen: false })}
      collabAPI={props.collabAPI}
      onExportToBackend={props.onExportToBackend}
      type={shareDialogState.type}
    />
  );
};

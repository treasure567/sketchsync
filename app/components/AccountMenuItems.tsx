import {
  gridIcon,
  historyIcon,
  loginIcon,
  playerStopFilledIcon,
} from "@sketchsync/editor/components/icons";
import { MainMenu } from "@sketchsync/editor/index";

import { useAtomValue, useSetAtom } from "../app-jotai";
import { api, currentBoardAtom, currentUserAtom } from "../data/sketchsyncApi";

import { accountDialogAtom } from "./AccountDialog";
import { boardsDialogAtom } from "./BoardsDialog";
import { versionHistoryDialogAtom } from "./VersionHistoryDialog";

export const AccountMenuItems = () => {
  const user = useAtomValue(currentUserAtom);
  const board = useAtomValue(currentBoardAtom);
  const setUser = useSetAtom(currentUserAtom);
  const openAccountDialog = useSetAtom(accountDialogAtom);
  const openBoards = useSetAtom(boardsDialogAtom);
  const openVersionHistory = useSetAtom(versionHistoryDialogAtom);

  return (
    <>
      <MainMenu.Item icon={gridIcon} onSelect={() => openBoards(true)}>
        My boards
      </MainMenu.Item>
      {board && (
        <MainMenu.Item
          icon={historyIcon}
          onSelect={() => openVersionHistory(true)}
        >
          Version history
        </MainMenu.Item>
      )}
      {user ? (
        <MainMenu.Item
          icon={playerStopFilledIcon}
          title={`Signed in as ${user.email}`}
          onSelect={async () => {
            await api.signOut().catch(() => {});
            setUser(null);
            if (board) {
              window.location.assign(window.location.origin);
            }
          }}
        >
          Sign out ({user.name})
        </MainMenu.Item>
      ) : (
        <MainMenu.Item
          icon={loginIcon}
          className="highlighted"
          onSelect={() => openAccountDialog({ isOpen: true })}
        >
          Sign in
        </MainMenu.Item>
      )}
    </>
  );
};

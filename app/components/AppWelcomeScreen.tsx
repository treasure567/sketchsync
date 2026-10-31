import { gridIcon, loginIcon } from "@sketchsync/editor/components/icons";
import { useI18n } from "@sketchsync/editor/i18n";
import { WelcomeScreen } from "@sketchsync/editor/index";
import React from "react";

import { useAtomValue, useSetAtom } from "../app-jotai";
import { currentUserAtom } from "../data/sketchsyncApi";

import { accountDialogAtom } from "./AccountDialog";
import { boardsDialogAtom } from "./BoardsDialog";
import { SketchSyncLogo } from "./SketchSyncLogo";

export const AppWelcomeScreen: React.FC<{
  onCollabDialogOpen: () => any;
  isCollabEnabled: boolean;
}> = React.memo((props) => {
  const { t } = useI18n();
  const user = useAtomValue(currentUserAtom);
  const openBoards = useSetAtom(boardsDialogAtom);
  const openAccountDialog = useSetAtom(accountDialogAtom);

  return (
    <WelcomeScreen>
      <WelcomeScreen.Hints.MenuHint>
        {t("welcomeScreen.app.menuHint")}
      </WelcomeScreen.Hints.MenuHint>
      <WelcomeScreen.Hints.ToolbarHint />
      <WelcomeScreen.Hints.HelpHint />
      <WelcomeScreen.Center>
        <WelcomeScreen.Center.Logo>
          <SketchSyncLogo />
        </WelcomeScreen.Center.Logo>
        <WelcomeScreen.Center.Heading>
          This scratch canvas is saved on this device.
          <br />
          Start a live board to draw with others,
          <br />
          with roles, invite links and version history.
        </WelcomeScreen.Center.Heading>
        <WelcomeScreen.Center.Menu>
          <WelcomeScreen.Center.MenuItem
            icon={gridIcon}
            shortcut={null}
            onSelect={() => openBoards(true)}
          >
            My boards
          </WelcomeScreen.Center.MenuItem>
          {props.isCollabEnabled && (
            <WelcomeScreen.Center.MenuItemLiveCollaborationTrigger
              onSelect={() => props.onCollabDialogOpen()}
            />
          )}
          <WelcomeScreen.Center.MenuItemLoadScene />
          <WelcomeScreen.Center.MenuItemHelp />
          {user === null && (
            <WelcomeScreen.Center.MenuItem
              icon={loginIcon}
              shortcut={null}
              onSelect={() => openAccountDialog({ isOpen: true })}
            >
              Sign in
            </WelcomeScreen.Center.MenuItem>
          )}
        </WelcomeScreen.Center.Menu>
      </WelcomeScreen.Center>
    </WelcomeScreen>
  );
});

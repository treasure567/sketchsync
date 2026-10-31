import { eyeIcon } from "@sketchsync/editor/components/icons";
import { MainMenu } from "@sketchsync/editor/index";
import React from "react";

import { isDevEnv } from "@sketchsync/common";

import type { Theme } from "@sketchsync/element/types";

import { LanguageList } from "../app-language/LanguageList";

import { AccountMenuItems } from "./AccountMenuItems";
import { BoardOutlineMenuItem } from "./BoardAccessibility";
import { saveDebugState } from "./DebugCanvas";
import { QuickTourMenuItem } from "./OnboardingTour";

export const AppMainMenu: React.FC<{
  onCollabDialogOpen: () => any;
  isCollaborating: boolean;
  isCollabEnabled: boolean;
  theme: Theme | "system";
  refresh: () => void;
}> = React.memo((props) => {
  return (
    <MainMenu>
      <MainMenu.DefaultItems.LoadScene />
      <MainMenu.DefaultItems.SaveToActiveFile />
      <MainMenu.DefaultItems.Export />
      <MainMenu.DefaultItems.SaveAsImage />
      {props.isCollabEnabled && (
        <MainMenu.DefaultItems.LiveCollaborationTrigger
          isCollaborating={props.isCollaborating}
          onSelect={() => props.onCollabDialogOpen()}
        />
      )}
      <MainMenu.DefaultItems.CommandPalette className="highlighted" />
      <MainMenu.DefaultItems.SearchMenu />
      <MainMenu.DefaultItems.Help />
      <QuickTourMenuItem />
      <BoardOutlineMenuItem />
      <MainMenu.DefaultItems.ClearCanvas />
      <MainMenu.Separator />
      <AccountMenuItems />
      {isDevEnv() && (
        <MainMenu.Item
          icon={eyeIcon}
          onSelect={() => {
            if (window.visualDebug) {
              delete window.visualDebug;
              saveDebugState({ enabled: false });
            } else {
              window.visualDebug = { data: [] };
              saveDebugState({ enabled: true });
            }
            props?.refresh();
          }}
        >
          Visual Debug
        </MainMenu.Item>
      )}
      <MainMenu.Separator />
      <MainMenu.DefaultItems.Preferences />
      <MainMenu.DefaultItems.ToggleTheme allowSystemTheme theme={props.theme} />
      <MainMenu.ItemCustom>
        <LanguageList style={{ width: "100%" }} />
      </MainMenu.ItemCustom>
      <MainMenu.DefaultItems.ChangeCanvasBackground />
    </MainMenu>
  );
});

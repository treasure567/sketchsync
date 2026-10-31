import React from "react";

import { composeEventHandlers } from "@sketchsync/common";

import { useTunnels } from "../../context/tunnels";
import { useUIAppState } from "../../context/ui-appState";
import { t } from "../../i18n";
import {
  useAppProps,
  useEditorInterface,
  useSketchSyncSetAppState,
} from "../App";
import { UserList } from "../UserList";
import DropdownMenu from "../dropdownMenu/DropdownMenu";
import DropdownMenuItemCheckbox from "../dropdownMenu/DropdownMenuItemCheckbox";
import DropdownMenuSub from "../dropdownMenu/DropdownMenuSub";
import { withInternalFallback } from "../hoc/withInternalFallback";
import { HamburgerMenuIcon } from "../icons";
import { useHandedness } from "../mobileLayout";

import * as DefaultItems from "./DefaultItems";

const LeftHandedLayoutItem = () => {
  const [handedness, setHandedness] = useHandedness();
  return (
    <DropdownMenuItemCheckbox
      checked={handedness === "left"}
      data-testid="left-handed-layout"
      onSelect={(event) => {
        setHandedness(handedness === "left" ? "right" : "left");
        event.preventDefault();
      }}
    >
      {t("labels.leftHandedLayout")}
    </DropdownMenuItemCheckbox>
  );
};

const MainMenu = Object.assign(
  withInternalFallback(
    "MainMenu",
    ({
      children,
      onSelect,
    }: {
      children?: React.ReactNode;
      /**
       * Called when any menu item is selected (clicked on).
       */
      onSelect?: (event: Event) => void;
    }) => {
      const { MainMenuTunnel } = useTunnels();
      const editorInterface = useEditorInterface();
      const appState = useUIAppState();
      const appProps = useAppProps();
      const setAppState = useSketchSyncSetAppState();

      return (
        <MainMenuTunnel.In>
          <DropdownMenu open={appState.openMenu === "canvas"}>
            <DropdownMenu.Trigger
              onToggle={() => {
                setAppState({
                  openMenu: appState.openMenu === "canvas" ? null : "canvas",
                  openPopup: null,
                  openDialog: null,
                });
              }}
              data-testid="main-menu-trigger"
              className="main-menu-trigger"
              title={t("buttons.menu")}
              aria-label={t("buttons.menu")}
            >
              {HamburgerMenuIcon}
            </DropdownMenu.Trigger>
            <DropdownMenu.Content
              onClickOutside={() => setAppState({ openMenu: null })}
              onSelect={composeEventHandlers(onSelect, () => {
                setAppState({ openMenu: null });
              })}
              className="main-menu"
              align="start"
            >
              {children}
              {editorInterface.formFactor === "phone" && (
                <LeftHandedLayoutItem />
              )}
              {editorInterface.formFactor === "phone" &&
                appState.collaborators.size > 0 && (
                  <fieldset className="UserList-Wrapper">
                    <legend>{t("labels.collaborators")}</legend>
                    <UserList
                      mobile={true}
                      collaborators={appState.collaborators}
                      userToFollow={appProps.userToFollow?.socketId || null}
                      currentUserControls={appProps.currentUserControls}
                    />
                  </fieldset>
                )}
            </DropdownMenu.Content>
          </DropdownMenu>
        </MainMenuTunnel.In>
      );
    },
  ),
  {
    Trigger: DropdownMenu.Trigger,
    Item: DropdownMenu.Item,
    ItemLink: DropdownMenu.ItemLink,
    ItemCustom: DropdownMenu.ItemCustom,
    Group: DropdownMenu.Group,
    Separator: DropdownMenu.Separator,
    Sub: DropdownMenuSub,
    DefaultItems,
  },
);

export default MainMenu;

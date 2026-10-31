import { DefaultSidebar } from "@sketchsync/editor";

import { BoardOutlineTab, BoardOutlineTabTrigger } from "./BoardOutline";

export const AppSidebar = () => {
  return (
    <DefaultSidebar>
      <DefaultSidebar.TabTriggers>
        <BoardOutlineTabTrigger />
      </DefaultSidebar.TabTriggers>
      <BoardOutlineTab />
    </DefaultSidebar>
  );
};

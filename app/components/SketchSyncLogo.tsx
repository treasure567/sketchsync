import { APP_NAME } from "@sketchsync/common";
import { LogoMark } from "@sketchsync/editor/components/BrandLogo";

export const SketchSyncLogo = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
      color: "var(--color-primary)",
      fontSize: "2.75rem",
    }}
  >
    <LogoMark size={48} />
    {APP_NAME}
  </div>
);

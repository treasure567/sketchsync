import { APP_NAME } from "@sketchsync/common";

import "./BrandLogo.scss";

export const LogoMark = ({
  size,
  className,
}: {
  size?: number;
  className?: string;
}) => (
  <svg
    viewBox="0 0 32 32"
    width={size}
    height={size}
    className={className}
    aria-hidden="true"
    focusable="false"
  >
    <rect width="32" height="32" rx="8" fill="#5b4cf5" />
    <g
      transform="translate(4 4)"
      fill="none"
      stroke="#fff"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 4.5l5 5L9 20H4v-5L14.5 4.5z" />
      <path d="M12.5 6.5l5 5" />
      <path d="M3 9.5L8.5 4" />
      <path d="M3 5.5L5 3.5" />
    </g>
  </svg>
);

type LogoSize = "xs" | "small" | "normal" | "large" | "mobile";

export const BrandLogo = ({
  style,
  size = "small",
  withText,
}: {
  size?: LogoSize;
  withText?: boolean;
  style?: React.CSSProperties;
}) => (
  <div className={`BrandLogo is-${size}`} style={style}>
    <LogoMark className="BrandLogo-icon" />
    {withText && <span className="BrandLogo-text">{APP_NAME}</span>}
  </div>
);

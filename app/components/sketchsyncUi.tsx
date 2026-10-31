import Spinner from "@sketchsync/editor/components/Spinner";
import clsx from "clsx";

import type { MemberRole, Role } from "../data/sketchsyncApi";

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  editor: "Can edit",
  viewer: "Can view",
};

export const LINK_EXPIRY_OPTIONS: { label: string; minutes: number | null }[] =
  [
    { label: "1 hour", minutes: 60 },
    { label: "1 day", minutes: 24 * 60 },
    { label: "1 week", minutes: 7 * 24 * 60 },
    { label: "30 days", minutes: 30 * 24 * 60 },
    { label: "Never", minutes: null },
  ];

export const MEMBER_ROLES: MemberRole[] = ["editor", "viewer"];

const relativeTime = new Intl.RelativeTimeFormat(undefined, {
  numeric: "auto",
});

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60],
  ["month", 30 * 24 * 60 * 60],
  ["week", 7 * 24 * 60 * 60],
  ["day", 24 * 60 * 60],
  ["hour", 60 * 60],
  ["minute", 60],
];

export const formatRelative = (iso: string, now = Date.now()) => {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) {
      return relativeTime.format(Math.round(seconds / size), unit);
    }
  }
  return relativeTime.format(0, "minute");
};

export const SubmitButton = ({
  label,
  busy,
  fullWidth,
}: {
  label: string;
  busy?: boolean;
  fullWidth?: boolean;
}) => (
  <button
    type="submit"
    disabled={busy}
    className={clsx(
      "ExcButton",
      "ExcButton--color-primary",
      "ExcButton--variant-filled",
      "ExcButton--size-large",
      { "ExcButton--fullWidth": fullWidth },
    )}
  >
    <div className="ExcButton__contents">
      {busy && <Spinner className="ExcButton__statusIcon" />}
      {label}
    </div>
  </button>
);

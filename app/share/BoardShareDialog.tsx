import { copyTextToSystemClipboard } from "@sketchsync/editor/clipboard";
import { FilledButton } from "@sketchsync/editor/components/FilledButton";
import { TextField } from "@sketchsync/editor/components/TextField";
import {
  copyIcon,
  playerStopFilledIcon,
} from "@sketchsync/editor/components/icons";
import { useCopyStatus } from "@sketchsync/editor/hooks/useCopiedIndicator";
import { useCallback, useEffect, useState } from "react";

import { useAtomValue, useSetAtom } from "../app-jotai";
import { versionHistoryDialogAtom } from "../components/VersionHistoryDialog";
import {
  formatRelative,
  LINK_EXPIRY_OPTIONS,
  MEMBER_ROLES,
  ROLE_LABELS,
  SubmitButton,
} from "../components/sketchsyncUi";
import { getCollaborationLink } from "../data";
import { api, currentUserAtom, describeError } from "../data/sketchsyncApi";

import "../components/SketchSync.scss";

import { QRCode } from "./QRCode";

import type { CollabAPI } from "../collab/Collab";
import type {
  BoardInfo,
  InviteLink,
  Member,
  MemberRole,
} from "../data/sketchsyncApi";

const CopyButton = ({ text, label }: { text: string; label: string }) => {
  const { onCopy, copyStatus } = useCopyStatus();
  return (
    <FilledButton
      size="large"
      label={label}
      icon={copyIcon}
      status={copyStatus}
      onClick={async () => {
        await copyTextToSystemClipboard(text);
        onCopy();
      }}
    />
  );
};

const describeExpiry = (link: InviteLink) =>
  link.expiresAt
    ? `expires ${formatRelative(link.expiresAt)}`
    : "never expires";

const InviteLinks = ({ board }: { board: BoardInfo }) => {
  const [links, setLinks] = useState<InviteLink[] | null>(null);
  const [role, setRole] = useState<MemberRole>("viewer");
  const [expiry, setExpiry] = useState(1);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .listLinks(board.id)
      .then(setLinks)
      .catch((failure) => setError(describeError(failure)));
  }, [board.id]);

  useEffect(load, [load]);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const link = await api.createLink(
        board.id,
        role,
        LINK_EXPIRY_OPTIONS[expiry].minutes,
      );
      setQrToken(link.token);
      load();
    } catch (failure) {
      setError(describeError(failure));
    }
  };

  const revoke = async (token: string) => {
    try {
      await api.revokeLink(board.id, token);
      load();
    } catch (failure) {
      setError(describeError(failure));
    }
  };

  const linkUrl = (token: string) =>
    getCollaborationLink({ roomId: board.id, inviteToken: token });

  return (
    <section>
      <h3 className="ss-subheading">Invite links</h3>
      <p className="ss-muted">
        Anyone with an invite link can open the board with its role, even
        without an account, until it expires or you turn it off.
      </p>
      <form
        className="ss-row"
        onSubmit={create}
        style={{ marginTop: "0.75rem" }}
      >
        <label className="ss-field ss-grow">
          Role
          <select
            className="ss-select"
            value={role}
            onChange={(event) => setRole(event.target.value as MemberRole)}
          >
            {MEMBER_ROLES.map((option) => (
              <option key={option} value={option}>
                {ROLE_LABELS[option]}
              </option>
            ))}
          </select>
        </label>
        <label className="ss-field ss-grow">
          Expires after
          <select
            className="ss-select"
            value={expiry}
            onChange={(event) => setExpiry(Number(event.target.value))}
          >
            {LINK_EXPIRY_OPTIONS.map((option, index) => (
              <option key={option.label} value={index}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <SubmitButton label="Create link" />
      </form>
      {error && (
        <p className="ss-error" role="alert">
          {error}
        </p>
      )}
      {links && links.length > 0 && (
        <ul
          className="ss-list"
          aria-label="Active invite links"
          style={{ marginTop: "0.75rem" }}
        >
          {links.map((link) => (
            <li key={link.token} style={{ flexWrap: "wrap" }}>
              <div className="ss-list-main">
                <strong>{ROLE_LABELS[link.role]}</strong>
                <span>{describeExpiry(link)}</span>
              </div>
              <CopyButton text={linkUrl(link.token)} label="Copy" />
              <button
                className="ss-link-button"
                type="button"
                aria-expanded={qrToken === link.token}
                onClick={() =>
                  setQrToken(qrToken === link.token ? null : link.token)
                }
              >
                QR
              </button>
              <button
                className="ss-link-button ss-link-button--danger"
                type="button"
                onClick={() => revoke(link.token)}
              >
                Turn off
              </button>
              {qrToken === link.token && (
                <div style={{ flexBasis: "100%" }}>
                  <QRCode value={linkUrl(link.token)} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

const People = ({ board }: { board: BoardInfo }) => {
  const user = useAtomValue(currentUserAtom);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("editor");
  const [error, setError] = useState<string | null>(null);
  const isOwner = board.role === "owner";

  useEffect(() => {
    api
      .listMembers(board.id)
      .then(setMembers)
      .catch((failure) => setError(describeError(failure)));
  }, [board.id]);

  const run = async (action: () => Promise<Member[] | void>) => {
    setError(null);
    try {
      const updated = await action();
      setMembers(updated ?? (await api.listMembers(board.id)));
    } catch (failure) {
      setError(describeError(failure));
    }
  };

  return (
    <section>
      <h3 className="ss-subheading">People with access</h3>
      {isOwner && (
        <form
          className="ss-row"
          onSubmit={(event) => {
            event.preventDefault();
            run(async () => {
              const updated = await api.addMember(board.id, email, role);
              setEmail("");
              return updated;
            });
          }}
        >
          <label className="ss-field ss-grow">
            Add by email
            <input
              className="ss-input"
              type="email"
              required
              placeholder="classmate@university.edu"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="ss-field">
            Role
            <select
              className="ss-select"
              value={role}
              onChange={(event) => setRole(event.target.value as MemberRole)}
            >
              {MEMBER_ROLES.map((option) => (
                <option key={option} value={option}>
                  {ROLE_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
          <SubmitButton label="Add" />
        </form>
      )}
      {error && (
        <p className="ss-error" role="alert">
          {error}
        </p>
      )}
      {members && (
        <ul
          className="ss-list"
          aria-label="People with access"
          style={{ marginTop: "0.75rem" }}
        >
          {members.map((member) => (
            <li key={member.userId}>
              <div className="ss-list-main">
                <strong>
                  {member.name}
                  {member.userId === user?.id ? " (you)" : ""}
                </strong>
                <span>{member.email}</span>
              </div>
              {isOwner && member.role !== "owner" ? (
                <>
                  <select
                    className="ss-select"
                    style={{ width: "auto" }}
                    aria-label={`Role for ${member.name}`}
                    value={member.role}
                    onChange={(event) =>
                      run(() =>
                        api.setMemberRole(
                          board.id,
                          member.userId,
                          event.target.value as MemberRole,
                        ),
                      )
                    }
                  >
                    {MEMBER_ROLES.map((option) => (
                      <option key={option} value={option}>
                        {ROLE_LABELS[option]}
                      </option>
                    ))}
                  </select>
                  <button
                    className="ss-link-button ss-link-button--danger"
                    type="button"
                    onClick={() =>
                      run(() => api.removeMember(board.id, member.userId))
                    }
                  >
                    Remove
                  </button>
                </>
              ) : (
                <span className="ss-badge">{ROLE_LABELS[member.role]}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export const BoardShareDialog = ({
  collabAPI,
  board,
  handleClose,
}: {
  collabAPI: CollabAPI;
  board: BoardInfo;
  handleClose: () => void;
}) => {
  const user = useAtomValue(currentUserAtom);
  const openVersionHistory = useSetAtom(versionHistoryDialogAtom);
  const boardLink = getCollaborationLink({ roomId: board.id });

  return (
    <div className="ss-dialog">
      <div>
        <h2 className="ss-heading">Share “{board.title}”</h2>
        <p className="ss-muted">
          {board.role === "owner"
            ? "You own this board."
            : `You ${ROLE_LABELS[board.role].toLowerCase()} this board${
                board.linkExpiresAt
                  ? ` through an invite link (expires ${formatRelative(
                      board.linkExpiresAt,
                    )})`
                  : ""
              }.`}
        </p>
      </div>

      {!user && (
        <TextField
          defaultValue={collabAPI.getUsername()}
          placeholder="Your name"
          label="Your name (shown next to your cursor)"
          onChange={collabAPI.setUsername}
        />
      )}

      {user && (
        <section>
          <h3 className="ss-subheading">Board link</h3>
          <div className="ss-row">
            <div className="ss-grow">
              <TextField readonly fullWidth value={boardLink} />
            </div>
            <CopyButton text={boardLink} label="Copy" />
          </div>
          <p className="ss-muted" style={{ marginTop: "0.5rem" }}>
            Works for the people listed below. Use an invite link for anyone
            else.
          </p>
        </section>
      )}

      {board.role === "owner" && <InviteLinks board={board} />}
      {user && <People board={board} />}

      <div className="ss-row">
        <button
          className="ss-link-button"
          type="button"
          onClick={() => {
            handleClose();
            openVersionHistory(true);
          }}
        >
          Version history
        </button>
        <span className="ss-grow" />
        <FilledButton
          size="large"
          variant="outlined"
          color="danger"
          label="Leave board"
          icon={playerStopFilledIcon}
          onClick={() => {
            collabAPI.stopCollaboration();
            handleClose();
          }}
        />
      </div>
    </div>
  );
};

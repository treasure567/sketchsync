import { Dialog } from "@sketchsync/editor/components/Dialog";
import { useState } from "react";

import { atom, useAtom, useSetAtom } from "../app-jotai";
import { api, currentUserAtom, describeError } from "../data/sketchsyncApi";

import { SubmitButton } from "./sketchsyncUi";

import "./SketchSync.scss";

type Mode = "signIn" | "signUp";

export const accountDialogAtom = atom<{
  isOpen: boolean;
  mode?: Mode;
  reason?: string;
  onSignedIn?: () => void;
}>({ isOpen: false });

export const AccountDialog = () => {
  const [state, setState] = useAtom(accountDialogAtom);
  const setUser = useSetAtom(currentUserAtom);
  const [mode, setMode] = useState<Mode>(state.mode ?? "signIn");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!state.isOpen) {
    return null;
  }

  const close = () => {
    setState({ isOpen: false });
    setError(null);
    setPassword("");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user =
        mode === "signIn"
          ? await api.signIn(email, password)
          : await api.signUp(name, email, password);
      setUser(user);
      const { onSignedIn } = state;
      close();
      onSignedIn?.();
    } catch (failure) {
      setError(describeError(failure));
    } finally {
      setBusy(false);
    }
  };

  const isSignUp = mode === "signUp";

  return (
    <Dialog size="small" onCloseRequest={close} title={false}>
      <div className="ss-dialog">
        <h2 className="ss-heading">
          {isSignUp
            ? "Create your SketchSync account"
            : "Sign in to SketchSync"}
        </h2>
        {state.reason && <p className="ss-muted">{state.reason}</p>}

        <div className="ss-tabs" role="tablist" aria-label="Account">
          <button
            type="button"
            role="tab"
            aria-selected={!isSignUp}
            onClick={() => setMode("signIn")}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isSignUp}
            onClick={() => setMode("signUp")}
          >
            Create account
          </button>
        </div>

        <form className="ss-form" onSubmit={submit}>
          {isSignUp && (
            <label className="ss-field">
              Your name
              <input
                className="ss-input"
                autoComplete="name"
                required
                maxLength={60}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
          )}
          <label className="ss-field">
            Email
            <input
              className="ss-input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="ss-field">
            Password
            <input
              className="ss-input"
              type="password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              required
              minLength={isSignUp ? 8 : undefined}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {isSignUp && <p className="ss-muted">At least 8 characters.</p>}
          {error && (
            <p className="ss-error" role="alert">
              {error}
            </p>
          )}
          <SubmitButton
            fullWidth
            busy={busy}
            label={isSignUp ? "Create account" : "Sign in"}
          />
        </form>
      </div>
    </Dialog>
  );
};

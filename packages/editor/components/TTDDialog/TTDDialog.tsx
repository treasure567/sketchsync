import { useCallback, useEffect, useState } from "react";

import { addEventListener } from "@sketchsync/common";

import { useUIAppState } from "../../context/ui-appState";
import { t } from "../../i18n";
import { useApp } from "../App";
import { Dialog } from "../Dialog";
import { withInternalFallback } from "../hoc/withInternalFallback";

import MermaidToDiagram from "./MermaidToDiagram";
import TextToDiagram from "./TextToDiagram";
import TTDDialogTabs from "./TTDDialogTabs";
import { TTDDialogTabTriggers } from "./TTDDialogTabTriggers";
import { TTDDialogTabTrigger } from "./TTDDialogTabTrigger";
import { TTDDialogTab } from "./TTDDialogTab";
import { isModuleLoadError } from "./utils/mermaidError";

import "./TTDDialog.scss";

import { TTDWelcomeMessage } from "./TTDWelcomeMessage";

import type {
  MermaidToDiagramLibProps,
  TTDPersistenceAdapter,
  TTTDDialog,
} from "./types";

export const TTDDialog = (
  props:
    | {
        onTextSubmit: TTTDDialog.onTextSubmit;
        renderWelcomeScreen?: TTTDDialog.renderWelcomeScreen;
        renderWarning?: TTTDDialog.renderWarning;
        persistenceAdapter: TTDPersistenceAdapter;
      }
    | { __fallback: true },
) => {
  const appState = useUIAppState();

  if (appState.openDialog?.name !== "ttd") {
    return null;
  }

  return <TTDDialogBase {...props} tab={appState.openDialog.tab} />;
};

TTDDialog.WelcomeMessage = TTDWelcomeMessage;

const loadMermaidToDiagramLib = (
  onChunkLoadError: (api: MermaidToDiagramLibProps["api"]) => void,
): MermaidToDiagramLibProps["api"] => {
  const api: MermaidToDiagramLibProps["api"] = import(
    "@sketchsync/mermaid-to-diagram"
  ).then((lib) => ({
    // Pele lazy-loads a chunk per diagram type, which can fail to load
    // (e.g. offline) even though the lib itself loaded fine
    parseMermaidToDiagram: async (definition, config) => {
      try {
        return await lib.parseMermaidToDiagram(definition, config);
      } catch (error) {
        if (isModuleLoadError(error)) {
          onChunkLoadError(api);
        }
        throw error;
      }
    },
  }));
  // called from state initializers/updaters, which React may invoke more than
  // once and discard the result -> don't let a discarded promise's rejection
  // go unhandled (consumers awaiting `api` still get the rejection)
  api.catch(() => {});
  return api;
};

/**
 * Text to diagram (TTD) dialog
 */
const TTDDialogBase = withInternalFallback(
  "TTDDialogBase",
  ({
    tab,
    ...rest
  }: {
    tab: "text-to-diagram" | "mermaid";
  } & (
    | {
        onTextSubmit(
          props: TTTDDialog.OnTextSubmitProps,
        ): Promise<TTTDDialog.OnTextSubmitRetValue>;
        renderWelcomeScreen?: TTTDDialog.renderWelcomeScreen;
        renderWarning?: TTTDDialog.renderWarning;
        persistenceAdapter: TTDPersistenceAdapter;
      }
    | { __fallback: true }
  )) => {
    const app = useApp();

    const [mermaidToDiagramLib, setMermaidToDiagramLib] =
      useState<MermaidToDiagramLibProps>(() => ({
        status: "loading",
        api: loadMermaidToDiagramLib((api) => setLoadError(api)),
      }));

    // `api` (or one of the chunks it lazy-loads) failed to load
    const setLoadError = useCallback((api: MermaidToDiagramLibProps["api"]) => {
      const reloadRequired = navigator.onLine;
      setMermaidToDiagramLib((prev) =>
        prev.api === api
          ? {
              ...prev,
              status: "error",
              reloadRequired: prev.reloadRequired || reloadRequired,
            }
          : prev,
      );
    }, []);

    const retryLoadingMermaidToDiagramLib = useCallback(() => {
      setMermaidToDiagramLib((prev) =>
        prev.status === "error"
          ? {
              ...prev,
              status: "loading",
              api: loadMermaidToDiagramLib(setLoadError),
            }
          : prev,
      );
    }, [setLoadError]);

    const { api: mermaidToDiagramLibApi } = mermaidToDiagramLib;
    useEffect(() => {
      const api = mermaidToDiagramLibApi;
      api.then(
        () => {
          setMermaidToDiagramLib((prev) =>
            prev.api === api
              ? { ...prev, status: "loaded", reloadRequired: false }
              : prev,
          );
        },
        (error: any) => {
          console.error("Failed to load mermaid-to-diagram", error);
          setLoadError(api);
        },
      );
    }, [mermaidToDiagramLibApi, setLoadError]);

    // the lib chunk isn't precached, so a failed load is most likely due to
    // being offline -> retry automatically once we're back online
    useEffect(() => {
      if (mermaidToDiagramLib.status !== "error") {
        return;
      }
      return addEventListener(
        app.ownerWindow,
        "online",
        retryLoadingMermaidToDiagramLib,
      );
    }, [app, mermaidToDiagramLib.status, retryLoadingMermaidToDiagramLib]);

    return (
      <Dialog
        className="ttd-dialog"
        onCloseRequest={() => {
          app.setOpenDialog(null);
        }}
        size={1520}
        title={false}
        {...rest}
        autofocus={false}
      >
        <TTDDialogTabs dialog="ttd" tab={tab}>
          {"__fallback" in rest && rest.__fallback ? (
            <p className="dialog-mermaid-title">{t("mermaid.title")}</p>
          ) : (
            <TTDDialogTabTriggers>
              <TTDDialogTabTrigger tab="text-to-diagram">
                <div className="ttd-dialog-tab-trigger__content">
                  {t("labels.textToDiagram")}
                  <div className="ttd-dialog-tab-trigger__badge">
                    {t("chat.aiBeta")}
                  </div>
                </div>
              </TTDDialogTabTrigger>
              <TTDDialogTabTrigger tab="mermaid">
                {t("mermaid.label")}
              </TTDDialogTabTrigger>
            </TTDDialogTabTriggers>
          )}

          {!("__fallback" in rest) && (
            <TTDDialogTab className="ttd-dialog-content" tab="text-to-diagram">
              <TextToDiagram
                mermaidToDiagramLib={mermaidToDiagramLib}
                onRetryLoad={retryLoadingMermaidToDiagramLib}
                onTextSubmit={rest.onTextSubmit}
                renderWelcomeScreen={rest.renderWelcomeScreen}
                renderWarning={rest.renderWarning}
                persistenceAdapter={rest.persistenceAdapter}
              />
            </TTDDialogTab>
          )}
          <TTDDialogTab className="ttd-dialog-content" tab="mermaid">
            <MermaidToDiagram
              mermaidToDiagramLib={mermaidToDiagramLib}
              onRetryLoad={retryLoadingMermaidToDiagramLib}
              isActive={tab === "mermaid"}
            />
          </TTDDialogTab>
        </TTDDialogTabs>
      </Dialog>
    );
  },
);

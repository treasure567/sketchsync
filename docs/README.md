# SketchSync docs

SketchSync builds on an open-source whiteboard editor and adds our own server, accounts, board permissions, version history and offline merging. These docs explain what we built, why, and how to run it.

| Doc | What it covers |
| --- | --- |
| [progress.md](progress.md) | Running log of the work, newest first |
| [architecture.md](architecture.md) | System overview, data model, what we changed in the editor |
| [sync-protocol.md](sync-protocol.md) | CRDT choice, merge rule, messages, acks, reconnection, batching |
| [permissions.md](permissions.md) | Accounts, owner/editor/viewer roles, expiring links, per-message checks |
| [versions.md](versions.md) | Operation log, snapshots, version history and restore |
| [offline.md](offline.md) | Editing offline and merging when the connection returns |
| [performance.md](performance.md) | Spatial index and staying smooth with 10,000 objects |
| [export.md](export.md) | PNG, SVG and PDF export |
| [minimap.md](minimap.md) | The minimap |
| [accessibility.md](accessibility.md) | The board outline for screen-reader and keyboard users |
| [mobile.md](mobile.md) | One-handed phone layout and palm rejection |
| [onboarding.md](onboarding.md) | The first-run tour |
| [deployment.md](deployment.md) | Running locally, on a VPS, and scaling out |
| [defense.md](defense.md) | Answers to the project's "questions the group must defend" |
| [../e2e/README.md](../e2e/README.md) | Browser tests with several users in separate sessions |

# Accounts, roles and invite links

## Accounts

- Sign up with name, email and password; sign in from the main menu, the welcome screen, or when a board needs it.
- Passwords are hashed with **scrypt** (Node's built-in crypto, random salt per user). Checking a password against an unknown email still runs a full scrypt, so response times don't reveal which emails have accounts.
- A session is a random 256-bit token in an `HttpOnly`, `SameSite=Lax` cookie (marked `Secure` on HTTPS), valid for 30 days. The database stores only its SHA-256, so a database leak doesn't hand out live sessions.
- Sign-in and sign-up are rate-limited to 30 attempts per 15 minutes per IP.
- Requests that change data and come from another website (their `Origin` doesn't match) are refused, on top of `SameSite` cookies.

Not built: email verification, password reset, sign-in with Google/GitHub. They need an email provider or OAuth app credentials.

## Roles

| Role | Can |
| --- | --- |
| **Owner** | everything: edit, rename, delete the board, add/remove people and change their roles, create and turn off invite links, restore versions |
| **Editor** | draw and edit, rename, save and restore versions, see who has access |
| **Viewer** | see the board live (with everyone's cursors) and browse/preview versions; can't change anything |

Viewers get the editor's view mode in the app, but that's only for convenience. **The server is what enforces roles.**

## Two ways in

1. **As a member.** The owner adds an existing account by email with a role (Share → People with access). Members see the board under **My boards** and use the plain board link `…/#board=<id>`.
2. **With an invite link** `…/#board=<id>&invite=<token>`. The owner creates it with a role (can edit / can view) and an expiry (1 hour, 1 day, 1 week, 30 days, never). It works without an account, so a lecturer can put a view-only link or QR code on the projector. Links can be turned off at any time.

If someone has both, they get the higher role. Using an invite link does **not** make you a member, so when the link expires or is turned off, your access ends.

The invite token is sent to the server in an `X-Board-Invite` header and in the Socket.IO handshake, never in a query string, so it stays out of server logs. It sits after `#` in the URL, so the browser doesn't send it either.

## Permission checks on every message

Every Socket.IO message goes through `currentAccess()` in `server/src/collab.ts`:

- The socket must have joined this board and still hold access.
- Scene changes need **editor** or higher; a viewer's attempt is refused with `read_only` and never stored or relayed.
- Cursor, idle and viewport messages need any role. The server overwrites the sender's id and name with the real ones, so nobody can fake another person's cursor.
- If the access came from an invite link, its expiry is checked on every message.

Access changes reach open connections straight away:

- **A timer fires at the link's expiry** and disconnects the guest with "This invite link has expired or was turned off."
- **When the owner changes a role, removes someone or turns off a link**, the server re-checks every open connection to that board. If role changed, it sends the new role (a viewer promoted to editor can draw straight away). If access ended, it disconnects them. With several server processes, the re-check is broadcast to all of them through Redis.
- **Deleting a board** disconnects everyone on it.

HTTP requests (`/api/boards/...`, images) go through the same `resolveAccess()` check.

## Tests

`server/test/server.test.ts` covers these cases:

- strangers and anonymous users are refused;
- roles from membership;
- links that expire, are revoked, or never expire;
- a viewer's edits are refused while they still receive everyone else's;
- revoking a link and changing a role apply to open connections;
- a guest is cut off at the link's deadline;
- image access needs board access.

The browser test covers the same flow with three real browser sessions.

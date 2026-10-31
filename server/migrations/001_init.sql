create table users (
  id uuid primary key default gen_random_uuid(),
  -- always stored lowercased by the server, so this is case-insensitive
  email text not null unique,
  name text not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

-- Only a SHA-256 of each session token is stored, so a database leak doesn't
-- hand out live sessions.
create table sessions (
  token_hash text primary key,
  user_id uuid not null references users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index sessions_user_id on sessions (user_id);

-- `snapshot` is the compacted element list up to `snapshot_seq`; the current
-- board is the snapshot plus every op in board_ops with a higher seq.
create table boards (
  id text primary key,
  title text not null,
  owner_id uuid not null references users (id) on delete cascade,
  file_key text not null,
  snapshot jsonb not null default '[]',
  snapshot_seq bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table board_members (
  board_id text not null references boards (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (board_id, user_id)
);
create index board_members_user_id on board_members (user_id);

create table board_links (
  token text primary key,
  board_id text not null references boards (id) on delete cascade,
  role text not null check (role in ('editor', 'viewer')),
  expires_at timestamptz,
  created_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index board_links_board_id on board_links (board_id);

create table board_ops (
  seq bigserial primary key,
  board_id text not null references boards (id) on delete cascade,
  user_id uuid references users (id) on delete set null,
  elements jsonb not null,
  created_at timestamptz not null default now()
);
create index board_ops_board_seq on board_ops (board_id, seq);

create table board_versions (
  id bigserial primary key,
  board_id text not null references boards (id) on delete cascade,
  label text,
  kind text not null check (kind in ('auto', 'manual', 'before-restore')),
  elements jsonb not null,
  element_count integer not null,
  created_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index board_versions_board_created on board_versions (board_id, created_at desc);

-- `scope` is `rooms/<boardId>` (access checked against the board) or
-- `shareLinks/<linkId>` (read-only exports, end-to-end encrypted).
create table files (
  scope text not null,
  file_id text not null,
  data bytea not null,
  created_at timestamptz not null default now(),
  primary key (scope, file_id)
);

create table share_links (
  id text primary key,
  data bytea not null,
  created_at timestamptz not null default now()
);

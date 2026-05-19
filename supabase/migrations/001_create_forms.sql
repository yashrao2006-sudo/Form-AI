create table if not exists forms (
  id uuid primary key default gen_random_uuid(),
  schema jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

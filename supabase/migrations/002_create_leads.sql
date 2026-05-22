create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references forms(id) on delete cascade,
  email text not null,
  captured_at timestamptz not null default now()
);
create index leads_form_id_idx on leads(form_id);

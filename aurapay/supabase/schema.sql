create table if not exists bills (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text default 'Other',
  amount numeric default 0,
  due_date date,
  account_ref text,
  upi_vpa text,
  priority text default 'medium',
  status text default 'unpaid',
  paid_at timestamptz,
  created_at timestamptz default now()
);
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text default 'General',
  priority text default 'medium',
  due_at timestamptz,
  done boolean default false,
  completed_at timestamptz,
  created_at timestamptz default now()
);
-- Reads (and Realtime) via anon key; ALL writes go through server routes using the service role key.
alter table bills enable row level security;
alter table tasks enable row level security;
create policy "anon read bills" on bills for select using (true);
create policy "anon read tasks" on tasks for select using (true);
alter publication supabase_realtime add table bills, tasks;

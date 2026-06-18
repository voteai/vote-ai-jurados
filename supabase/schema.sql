-- Vote Ai Jurados - Supabase reference schema
-- Apply with Supabase SQL editor or convert to a CLI migration when the CLI is installed.

create extension if not exists pgcrypto;

create schema if not exists private;

create type public.contest_status as enum ('draft', 'active', 'evaluating', 'closed', 'published');
create type public.invitation_status as enum ('pending', 'accepted', 'declined');
create type public.participant_status as enum ('registered', 'approved', 'evaluating', 'disqualified', 'classified');
create type public.evaluation_status as enum ('draft', 'submitted', 'unlocked', 'canceled');

create table public.contests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  organizer_id uuid references auth.users(id) on delete set null,
  organizer_email text,
  organizer_name text,
  name text not null,
  description text,
  start_date date,
  end_date date,
  location text,
  status public.contest_status not null default 'draft',
  allow_public_vote boolean not null default false,
  public_vote_weight numeric(5,2) not null default 0 check (public_vote_weight between 0 and 100),
  rules text,
  show_partial_ranking boolean not null default false,
  result_published boolean not null default false,
  show_individual_scores boolean not null default false,
  show_comments boolean not null default true,
  participant_add_by_link boolean not null default true,
  participant_add_by_email boolean not null default true,
  participant_add_manual boolean not null default true,
  participant_name_field text not null default 'artist_name',
  judge_add_by_link boolean not null default true,
  judge_add_by_qrcode boolean not null default true,
  default_voting_control text not null default 'ruler',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.contests(id) on delete cascade,
  name text not null,
  description text,
  display_order integer not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.contests(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null,
  code text,
  email text,
  phone text,
  photo_url text,
  description text,
  support_file_url text,
  status public.participant_status not null default 'registered',
  internal_notes text,
  created_at timestamptz not null default now()
);

create table public.judges (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.contests(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  photo_url text,
  bio text,
  specialty text,
  invitation_status public.invitation_status not null default 'pending',
  active boolean not null default true,
  approved_at timestamptz,
  declined_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.judge_assignments (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.contests(id) on delete cascade,
  judge_id uuid not null references public.judges(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  participant_id uuid references public.participants(id) on delete cascade,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique (judge_id, category_id, participant_id)
);

create table public.evaluation_criteria (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.contests(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  name text not null,
  description text,
  weight numeric(5,2) not null check (weight >= 0 and weight <= 100),
  control_type text not null default 'numeric_bar',
  min_value numeric not null default 0,
  max_value numeric not null default 10,
  allow_decimal boolean not null default true,
  allow_comment boolean not null default true,
  labels text,
  display_order integer not null default 0,
  active boolean not null default true,
  required boolean not null default true,
  created_at timestamptz not null default now(),
  check (max_value > min_value)
);

create table public.evaluations (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.contests(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  judge_id uuid not null references public.judges(id) on delete cascade,
  judge_name text,
  participant_name text,
  status public.evaluation_status not null default 'draft',
  final_score numeric(8,4),
  general_comment text,
  submitted_at timestamptz,
  unlocked_by_admin boolean not null default false,
  unlock_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contest_id, category_id, participant_id, judge_id)
);

create table public.evaluation_scores (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references public.evaluations(id) on delete cascade,
  criterion_id uuid not null references public.evaluation_criteria(id) on delete restrict,
  criterion_name text,
  raw_value numeric not null,
  normalized_value numeric(8,4) not null,
  weighted_score numeric(8,4) not null,
  created_at timestamptz not null default now(),
  unique (evaluation_id, criterion_id)
);

create table public.public_votes (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.contests(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  participant_name text,
  voter_fingerprint text not null,
  voter_user_id uuid references auth.users(id) on delete set null,
  final_score numeric(8,4) not null,
  scores_json jsonb not null default '[]'::jsonb,
  status text not null default 'submitted',
  submitted_at timestamptz not null default now(),
  unique (contest_id, category_id, voter_fingerprint)
);

create table public.results (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.contests(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  participant_name text,
  category_name text,
  final_score numeric(8,4),
  judge_score numeric(8,4),
  public_score numeric(8,4),
  rank_position integer,
  total_judges integer not null default 0,
  total_public_votes integer not null default 0,
  status text not null default 'partial',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (contest_id, category_id, participant_id)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  user_name text,
  contest_id uuid references public.contests(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create or replace function private.is_contest_owner(target_contest_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.contests
    where id = target_contest_id
      and owner_id = auth.uid()
  );
$$;

create or replace function private.audit_row()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  insert into public.audit_logs (
    user_id,
    user_name,
    contest_id,
    action,
    entity_type,
    entity_id,
    old_value,
    new_value
  ) values (
    auth.uid(),
    coalesce(auth.jwt() ->> 'email', ''),
    coalesce((to_jsonb(new) ->> 'contest_id')::uuid, (to_jsonb(old) ->> 'contest_id')::uuid, case when tg_table_name = 'contests' then coalesce(new.id, old.id) else null end),
    lower(tg_table_name || '.' || tg_op),
    tg_table_name,
    coalesce(new.id, old.id),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$;

create trigger audit_contests after insert or update or delete on public.contests for each row execute function private.audit_row();
create trigger audit_participants after insert or update or delete on public.participants for each row execute function private.audit_row();
create trigger audit_judges after insert or update or delete on public.judges for each row execute function private.audit_row();
create trigger audit_assignments after insert or update or delete on public.judge_assignments for each row execute function private.audit_row();
create trigger audit_criteria after insert or update or delete on public.evaluation_criteria for each row execute function private.audit_row();
create trigger audit_evaluations after insert or update or delete on public.evaluations for each row execute function private.audit_row();
create trigger audit_public_votes after insert or update or delete on public.public_votes for each row execute function private.audit_row();
create trigger audit_results after insert or update or delete on public.results for each row execute function private.audit_row();

alter table public.contests enable row level security;
alter table public.categories enable row level security;
alter table public.participants enable row level security;
alter table public.judges enable row level security;
alter table public.judge_assignments enable row level security;
alter table public.evaluation_criteria enable row level security;
alter table public.evaluations enable row level security;
alter table public.evaluation_scores enable row level security;
alter table public.public_votes enable row level security;
alter table public.results enable row level security;
alter table public.audit_logs enable row level security;

create policy "contest owners manage contests" on public.contests
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "contest owners manage categories" on public.categories
  for all using (private.is_contest_owner(contest_id)) with check (private.is_contest_owner(contest_id));

create policy "contest owners manage participants" on public.participants
  for all using (private.is_contest_owner(contest_id)) with check (private.is_contest_owner(contest_id));

create policy "contest owners manage judges" on public.judges
  for all using (private.is_contest_owner(contest_id)) with check (private.is_contest_owner(contest_id));

create policy "judges read themselves" on public.judges
  for select using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

create policy "contest owners manage judge assignments" on public.judge_assignments
  for all using (private.is_contest_owner(contest_id)) with check (private.is_contest_owner(contest_id));

create policy "judges read assignments" on public.judge_assignments
  for select using (
    exists (
      select 1 from public.judges j
      where j.id = judge_id
        and lower(j.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        and j.invitation_status = 'accepted'
    )
  );

create policy "contest owners manage criteria" on public.evaluation_criteria
  for all using (private.is_contest_owner(contest_id)) with check (private.is_contest_owner(contest_id));

create policy "judges read criteria" on public.evaluation_criteria
  for select using (
    exists (
      select 1 from public.judge_assignments ja
      join public.judges j on j.id = ja.judge_id
      where ja.category_id = evaluation_criteria.category_id
        and ja.status = 'active'
        and j.invitation_status = 'accepted'
        and lower(j.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

create policy "judges manage own unlocked evaluations" on public.evaluations
  for all using (
    exists (
      select 1 from public.judges j
      where j.id = judge_id
        and lower(j.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        and j.invitation_status = 'accepted'
    )
    and status in ('draft', 'unlocked')
  ) with check (
    exists (
      select 1 from public.judges j
      where j.id = judge_id
        and lower(j.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        and j.invitation_status = 'accepted'
    )
  );

create policy "contest owners read evaluations" on public.evaluations
  for select using (private.is_contest_owner(contest_id));

create policy "contest owners unlock evaluations" on public.evaluations
  for update using (private.is_contest_owner(contest_id)) with check (private.is_contest_owner(contest_id));

create policy "scores follow evaluation access" on public.evaluation_scores
  for all using (
    exists (
      select 1 from public.evaluations e
      where e.id = evaluation_id
        and (
          private.is_contest_owner(e.contest_id)
          or exists (
            select 1 from public.judges j
            where j.id = e.judge_id
              and lower(j.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
              and j.invitation_status = 'accepted'
          )
        )
    )
  ) with check (
    exists (
      select 1 from public.evaluations e
      where e.id = evaluation_id
        and e.status in ('draft', 'unlocked')
    )
  );

create policy "public read open voting data contests" on public.contests
  for select using (allow_public_vote = true and status in ('active', 'evaluating'));

create policy "public read open voting data categories" on public.categories
  for select using (
    exists (select 1 from public.contests c where c.id = contest_id and c.allow_public_vote = true and c.status in ('active', 'evaluating'))
  );

create policy "public read open voting data participants" on public.participants
  for select using (
    status <> 'disqualified'
    and exists (select 1 from public.contests c where c.id = contest_id and c.allow_public_vote = true and c.status in ('active', 'evaluating'))
  );

create policy "public read open voting data criteria" on public.evaluation_criteria
  for select using (
    active = true
    and exists (select 1 from public.contests c where c.id = contest_id and c.allow_public_vote = true and c.status in ('active', 'evaluating'))
  );

create policy "public insert one vote per fingerprint" on public.public_votes
  for insert with check (
    status = 'submitted'
    and exists (select 1 from public.contests c where c.id = contest_id and c.allow_public_vote = true and c.status in ('active', 'evaluating'))
  );

create policy "contest owners read public votes" on public.public_votes
  for select using (private.is_contest_owner(contest_id));

create policy "published results visible" on public.results
  for select using (status = 'published');

create policy "contest owners manage results" on public.results
  for all using (private.is_contest_owner(contest_id)) with check (private.is_contest_owner(contest_id));

create policy "contest owners read audit logs" on public.audit_logs
  for select using (private.is_contest_owner(contest_id));

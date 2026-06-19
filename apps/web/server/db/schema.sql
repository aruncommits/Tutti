-- Tutti recipe library — Supabase Postgres schema (Phase B).
-- Idempotent: safe to re-run. Run via `npm run db:migrate` (apps/web/server/db/migrate.mts).
--
-- Model: Category → Dish → tier-variant. `dishes` holds the dish identity; `recipes` holds each
-- tier variant, with the full RecipeGraph in `graph` (jsonb) and summary columns projected out for
-- fast, server-side faceted listing. Discovery lists DISHES (one card collapsing the variants).

create extension if not exists pg_trgm;

create table if not exists dishes (
  dish_id     text primary key,
  name        text not null,
  category    text not null,
  cuisine     text,
  course      text,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists recipes (
  recipe_id     text primary key,
  dish_id       text not null references dishes(dish_id) on delete cascade,
  name          text not null,
  category      text not null,
  cuisine       text,
  course        text,
  tier          text not null check (tier in ('simple','moderate','complex')),
  variant_label text,
  servings      integer not null,
  diets         text[] not null default '{}',
  allergens     text[] not null default '{}',
  tags          text[] not null default '{}',
  total_mins    integer not null,
  kcal          integer not null default 0,
  protein       real    not null default 0,
  nutrition     jsonb,
  graph         jsonb   not null,
  verified      boolean not null default false,
  version       integer not null default 1,
  popularity    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Full-text search vector over the human-meaningful fields, kept in sync by a trigger (a generated
-- column can't use to_tsvector here — it's not flagged immutable enough for a stored expression).
alter table recipes add column if not exists search tsvector;

create or replace function recipes_search_update() returns trigger as $$
begin
  new.search := to_tsvector('simple',
    coalesce(new.name, '') || ' ' ||
    coalesce(new.category, '') || ' ' ||
    coalesce(new.cuisine, '') || ' ' ||
    array_to_string(new.tags, ' '));
  return new;
end;
$$ language plpgsql;

drop trigger if exists recipes_search_trg on recipes;
create trigger recipes_search_trg before insert or update on recipes
  for each row execute function recipes_search_update();

create index if not exists recipes_search_idx     on recipes using gin (search);
create index if not exists recipes_name_trgm_idx  on recipes using gin (name gin_trgm_ops);
create index if not exists recipes_category_idx   on recipes (category);
create index if not exists recipes_cuisine_idx    on recipes (cuisine);
create index if not exists recipes_tier_idx       on recipes (tier);
create index if not exists recipes_dish_idx       on recipes (dish_id);
create index if not exists recipes_diets_idx      on recipes using gin (diets);
create index if not exists recipes_total_mins_idx on recipes (total_mins);
create index if not exists recipes_verified_idx   on recipes (verified);

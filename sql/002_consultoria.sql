-- =========================================================
-- Módulo de Consultoria — Fase 1: fundação de banco e auth
-- =========================================================
-- As tabelas abaixo já foram criadas manualmente no Supabase
-- (SQL Editor). Este arquivo é a versão de referência/idempotente
-- do schema + a camada de segurança (função + policies), para
-- ficar versionado no repo e poder ser re-executado com segurança.
-- =========================================================

-- ---------------------------------------------------------
-- 1. Tabelas
-- ---------------------------------------------------------

create table if not exists consultorias (
  id uuid primary key default gen_random_uuid(),
  familia_id uuid not null references familias(id) on delete cascade,
  consultor_id uuid not null references profiles(id) on delete cascade,
  plano text not null,
  status text not null default 'ativo',
  data_inicio date not null default current_date,
  data_fim date,
  created_at timestamptz not null default now()
);

create table if not exists sessoes (
  id uuid primary key default gen_random_uuid(),
  consultoria_id uuid not null references consultorias(id) on delete cascade,
  tipo text not null,
  data_sessao date not null,
  status text not null default 'agendada',
  resumo text,
  proximos_passos text,
  created_at timestamptz not null default now()
);

create table if not exists diagnosticos (
  id uuid primary key default gen_random_uuid(),
  consultoria_id uuid not null references consultorias(id) on delete cascade,
  receita_media numeric,
  despesa_media numeric,
  maior_categoria_gasto text,
  dizimo_status text,
  pontos_atencao text[],
  created_at timestamptz not null default now()
);

create table if not exists planos_acao (
  id uuid primary key default gen_random_uuid(),
  consultoria_id uuid not null references consultorias(id) on delete cascade,
  sessao_id uuid references sessoes(id) on delete set null,
  descricao text not null,
  status text not null default 'pendente',
  prazo date,
  created_at timestamptz not null default now()
);

create table if not exists notas_consultor (
  id uuid primary key default gen_random_uuid(),
  consultoria_id uuid not null references consultorias(id) on delete cascade,
  autor_id uuid not null references profiles(id) on delete cascade,
  conteudo text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 2. Função is_admin_consultor()
-- ---------------------------------------------------------
-- Verifica se o e-mail autenticado é o do consultor administrador
-- do Finify. Usada em todas as policies de RLS abaixo.

create or replace function is_admin_consultor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'hudson.fix@gmail.com';
$$;

-- ---------------------------------------------------------
-- 3. RLS nas tabelas novas
-- ---------------------------------------------------------

alter table consultorias enable row level security;
alter table sessoes enable row level security;
alter table diagnosticos enable row level security;
alter table planos_acao enable row level security;
alter table notas_consultor enable row level security;

drop policy if exists "admin_consultor_full_access" on consultorias;
create policy "admin_consultor_full_access" on consultorias
  for all
  using (is_admin_consultor())
  with check (is_admin_consultor());

drop policy if exists "admin_consultor_full_access" on sessoes;
create policy "admin_consultor_full_access" on sessoes
  for all
  using (is_admin_consultor())
  with check (is_admin_consultor());

drop policy if exists "admin_consultor_full_access" on diagnosticos;
create policy "admin_consultor_full_access" on diagnosticos
  for all
  using (is_admin_consultor())
  with check (is_admin_consultor());

drop policy if exists "admin_consultor_full_access" on planos_acao;
create policy "admin_consultor_full_access" on planos_acao
  for all
  using (is_admin_consultor())
  with check (is_admin_consultor());

drop policy if exists "admin_consultor_full_access" on notas_consultor;
create policy "admin_consultor_full_access" on notas_consultor
  for all
  using (is_admin_consultor())
  with check (is_admin_consultor());

-- ---------------------------------------------------------
-- 4. Policy adicional em lancamentos e metas
-- ---------------------------------------------------------
-- O consultor admin só enxerga (SELECT) lançamentos/metas de
-- famílias que tenham uma consultoria com status = 'ativo'.

drop policy if exists "admin_consultor_select_lancamentos" on lancamentos;
create policy "admin_consultor_select_lancamentos" on lancamentos
  for select
  using (
    is_admin_consultor()
    and exists (
      select 1 from consultorias c
      where c.familia_id = lancamentos.familia_id
        and c.status = 'ativo'
    )
  );

drop policy if exists "admin_consultor_select_metas" on metas;
create policy "admin_consultor_select_metas" on metas
  for select
  using (
    is_admin_consultor()
    and exists (
      select 1 from consultorias c
      where c.familia_id = metas.familia_id
        and c.status = 'ativo'
    )
  );

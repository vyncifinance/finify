-- =========================================================
-- Vínculo de contas/cartões com empresa (CNPJ)
-- =========================================================
-- Problema: `contas` nunca teve `empresa_id`. Todas as outras tabelas
-- do fluxo (`lancamentos`, `despesas_fixas`) são filtradas por
-- empresa_id em todas as telas, mas `contas` era buscada só por
-- familia_id — então um cartão cadastrado para o CNPJ aparecia no
-- contexto Pessoal e a fatura dele entrava na comparação com o saldo
-- da conta corrente da família.
--
-- Este arquivo é idempotente: pode ser executado mais de uma vez sem
-- efeito colateral. Mesma convenção dos arquivos 002 e 003.
-- =========================================================

-- ---------------------------------------------------------
-- 1. Coluna
-- ---------------------------------------------------------
-- empresa_id null  = conta/cartão pessoal (da família)
-- empresa_id setado = conta/cartão daquela empresa
alter table contas
  add column if not exists empresa_id uuid references empresas(id) on delete cascade;

create index if not exists contas_empresa_id_idx
  on contas (empresa_id);

create index if not exists contas_familia_empresa_idx
  on contas (familia_id, empresa_id);

-- ---------------------------------------------------------
-- 2. RLS
-- ---------------------------------------------------------
-- A coluna nova não muda quem pode ler ou escrever: o isolamento
-- continua sendo por familia_id. As policies existentes de contas
-- seguem valendo sem alteração. Este bloco só confirma que as quatro
-- operações estão cobertas — esquecer UPDATE/DELETE é a causa mais
-- comum de "editei e não salvou" neste projeto.
do $$
declare
  faltando text;
begin
  select string_agg(op, ', ')
    into faltando
  from (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) as esperado(op)
  where not exists (
    select 1
      from pg_policies
     where schemaname = 'public'
       and tablename  = 'contas'
       and (cmd = esperado.op or cmd = 'ALL')
  );

  if faltando is not null then
    raise warning 'contas: sem policy de RLS para %. Revise antes de usar em producao.', faltando;
  end if;
end $$;

-- ---------------------------------------------------------
-- 3. Backfill
-- ---------------------------------------------------------
-- Nada é movido automaticamente: toda conta existente permanece
-- pessoal (empresa_id null), que é o comportamento atual. Cada cartão
-- de CNPJ precisa ser apontado para a sua empresa explicitamente.
--
-- Para ver o que existe hoje:
--
--   select c.id, c.nome, c.tipo, c.empresa_id
--     from contas c
--    where c.familia_id = '<ID_DA_FAMILIA>'
--    order by c.created_at;
--
--   select id, nome from empresas
--    where familia_id = '<ID_DA_FAMILIA>';
--
-- E para vincular um cartão à empresa (ajuste os dois nomes):
--
--   update contas
--      set empresa_id = (
--            select id from empresas
--             where familia_id = contas.familia_id
--               and nome = '<NOME_DA_EMPRESA>'
--          )
--    where familia_id = '<ID_DA_FAMILIA>'
--      and nome = 'Inter empresas';
--
-- Confira o resultado antes de sair do SQL Editor:
--
--   select c.nome as conta, e.nome as empresa
--     from contas c
--     left join empresas e on e.id = c.empresa_id
--    where c.familia_id = '<ID_DA_FAMILIA>'
--    order by c.created_at;

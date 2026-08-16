-- =========================================================
-- Módulo de Consultoria — Fase 6: saúde financeira da família
-- =========================================================
-- View com o % da receita do mês comprometido com despesas, por família.
--
-- Ajustes em relação ao SQL original enviado:
-- 1. `l.empresa_id is null` — a view mede a saúde financeira PESSOAL da
--    família (mesmo escopo do dashboard/movimentos), não misturando com
--    lançamentos de empresas (CNPJ) cadastradas.
-- 2. Exclusão do lançamento consolidado "Pagamento de fatura" (categoria
--    'Cartão de Crédito' debitado de uma conta que não é cartão) — mesma
--    regra de regime de competência já usada no dashboard da família e em
--    todas as telas do consultor (Fases 3–5): a compra no cartão já virou
--    despesa na hora, então o pagamento da fatura não pode ser contado de
--    novo, senão o percentual_comprometido fica inflado.
-- 3. Limite superior explícito do mês (`< próximo mês`), não só `>= início
--    do mês`, por clareza e segurança.
-- Ver a regra "Consistência entre Telas" no CLAUDE.md do projeto.

create or replace view saude_financeira_familia
with (security_invoker = true)
as
select
  f.id as familia_id,
  coalesce(sum(case when l.tipo = 'despesa' then l.valor else 0 end), 0) as despesa_mes,
  coalesce(sum(case when l.tipo = 'receita' then l.valor else 0 end), 0) as receita_mes,
  case
    when sum(case when l.tipo = 'receita' then l.valor else 0 end) = 0 then null
    else round(
      100.0 * sum(case when l.tipo = 'despesa' then l.valor else 0 end)
      / sum(case when l.tipo = 'receita' then l.valor else 0 end)
    , 1)
  end as percentual_comprometido
from familias f
join lancamentos l on l.familia_id = f.id
left join contas c on c.id = l.conta_id
where l.data >= date_trunc('month', current_date)
  and l.data <  date_trunc('month', current_date) + interval '1 month'
  and l.empresa_id is null
  and not (l.categoria = 'Cartão de Crédito' and c.tipo is distinct from 'cartao_credito')
group by f.id;

-- security_invoker = true é OBRIGATÓRIO aqui: sem isso, a view roda com o
-- privilégio de quem CRIOU a view (o dono do schema), ignorando por completo
-- a RLS de `lancamentos` — qualquer pessoa (inclusive anônima, via anon key)
-- conseguiria ler o percentual_comprometido de TODAS as famílias. Com
-- security_invoker, a view respeita a RLS de quem está consultando de
-- verdade: o consultor só vê famílias com consultoria ativa (policy
-- `admin_consultor_select_lancamentos` da Fase 1), e cada família só vê a
-- própria linha.
grant select on saude_financeira_familia to authenticated;

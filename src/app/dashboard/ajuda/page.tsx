'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import {
  HelpCircle, ChevronDown, Wallet, Shield, Church, TrendingUp,
  LineChart, Target, Route, Info,
} from 'lucide-react'

type Pergunta = { pergunta: string; resposta: React.ReactNode }
type Secao = { titulo: string; Icon: any; cor: string; bg: string; perguntas: Pergunta[] }

const SECOES: Secao[] = [
  {
    titulo: 'Fluxo de caixa',
    Icon: Wallet,
    cor: '#145A45',
    bg: '#D1FAE5',
    perguntas: [
      {
        pergunta: 'Por que meu aporte em Investimentos ou numa Meta não aparece como despesa no meu resultado do mês?',
        resposta: (
          <>
            <p>Aportar dinheiro numa meta ou investimento não é <strong>gastar</strong> — é guardar. O dinheiro continua seu, só muda de lugar (do seu caixa disponível para o seu patrimônio investido).</p>
            <p>Por isso, o Finify não conta esses aportes como "despesa" na hora de calcular sua Economia do mês. Se contasse, seu resultado cairia toda vez que você tomasse a decisão de guardar dinheiro — o que não faz sentido: guardar dinheiro deveria ser bom pra esse número, não ruim.</p>
            <p>Você ainda vê esses aportes normalmente na lista de Movimentos e no gráfico de "Despesas por categoria" — eles não desaparecem, só não entram na conta de "quanto sobrou pra mim esse mês".</p>
          </>
        ),
      },
      {
        pergunta: 'Por que os números de Receitas e Despesas parecem diferentes entre as telas?',
        resposta: (
          <p>Eles não deveriam. Dashboard, Movimentos e Linha do Tempo usam a mesma regra de cálculo. Se você notar uma diferença, pode ser um lançamento categorizado de forma diferente do esperado, ou uma tela desatualizada no seu navegador — nesse caso, um recarregamento da página costuma resolver.</p>
        ),
      },
    ],
  },
  {
    titulo: 'Reserva de Emergência',
    Icon: Shield,
    cor: '#0B3B2E',
    bg: '#ECFDF5',
    perguntas: [
      {
        pergunta: 'Como o Finify calcula minha meta de Reserva de Emergência?',
        resposta: (
          <>
            <p>Sua Reserva de Emergência é calculada automaticamente como <strong>6 vezes a média das suas despesas mensais de consumo</strong> (sem contar aportes em investimentos ou metas) dos últimos meses com dados.</p>
            <p>Isso significa que ela não é um valor fixo — se seu padrão de gastos aumentar, a meta sobe; se você reduzir despesas, ela desce. A ideia é sempre representar "quanto eu precisaria pra cobrir 6 meses do meu custo de vida real, se minha renda parasse".</p>
          </>
        ),
      },
    ],
  },
  {
    titulo: 'Dízimo',
    Icon: Church,
    cor: '#BA7517',
    bg: '#FAEEDA',
    perguntas: [
      {
        pergunta: 'Como o valor do dízimo do mês é calculado?',
        resposta: (
          <p>É 10% da soma das suas receitas marcadas para dízimo naquele mês. Receitas como reembolsos, devoluções ou transferências entre contas podem ser desmarcadas na hora do lançamento, já que normalmente não entram nesse cálculo. O valor "pago" reflete o que você já lançou como despesa na categoria Dízimo — quando os dois batem, o card mostra "Completo".</p>
        ),
      },
    ],
  },
  {
    titulo: 'Investimentos — Renda Fixa',
    Icon: TrendingUp,
    cor: '#145A45',
    bg: '#D1FAE5',
    perguntas: [
      {
        pergunta: 'Como funciona o rendimento das minhas posições de Renda Fixa (CDI)?',
        resposta: (
          <>
            <p>Quando você cadastra uma posição de Renda Fixa com um percentual do CDI (por exemplo, 130%), o Finify busca a taxa oficial do CDI publicada pelo Banco Central e aplica juros compostos, dia útil por dia útil, desde a data em que você aplicou o dinheiro.</p>
            <p>Sábados, domingos e feriados não contam como dia de rendimento — o CDI só "roda" em dia útil, do jeito que funciona no mercado de verdade.</p>
            <p><strong>Importante:</strong> esse número é uma estimativa bruta. Ele não desconta Imposto de Renda, e é uma referência pra você acompanhar sua evolução — o valor exato oficial é sempre o que aparece no extrato da sua corretora ou banco.</p>
          </>
        ),
      },
    ],
  },
  {
    titulo: 'Investimentos — Ações e FIIs',
    Icon: LineChart,
    cor: '#3B82F6',
    bg: '#EFF6FF',
    perguntas: [
      {
        pergunta: 'De onde vem a cotação das minhas ações e fundos imobiliários?',
        resposta: (
          <p>O Finify busca a cotação mais recente direto da bolsa, usando o código (ticker) que você informa ao cadastrar a posição — por exemplo, PETR4 ou HGLG11. O valor da posição é sempre <strong>quantidade × cotação atual</strong>. Se, por algum motivo, a cotação não estiver disponível no momento, o sistema usa o último valor que você informou manualmente até conseguir buscar de novo.</p>
        ),
      },
      {
        pergunta: 'O que são "proventos" e como registro?',
        resposta: <p>Proventos são dividendos, JCP ou rendimentos que uma ação ou FII te paga. Você pode registrar esses valores diretamente em cada posição — eles somam ao seu rendimento total, além da valorização do preço do ativo.</p>,
      },
    ],
  },
  {
    titulo: 'Investimentos — Comparação com o mercado',
    Icon: LineChart,
    cor: '#8B5CF6',
    bg: '#F5F3FF',
    perguntas: [
      {
        pergunta: 'O que são os indexadores que aparecem no gráfico de evolução?',
        resposta: (
          <>
            <p>São referências de mercado que você pode ligar ou desligar pra comparar com sua carteira real: <strong>CDI</strong>, <strong>IPCA</strong> (inflação), <strong>Ibovespa</strong>, <strong>IFIX</strong> e <strong>S&P 500</strong>.</p>
            <p>A ideia é simples: "se eu tivesse investido esse mesmo dinheiro 100% num desses índices, em vez da minha estratégia atual, eu estaria melhor ou pior?" A linha tracejada de cada indexador mostra essa resposta.</p>
            <p>Com posições muito recentes, as linhas podem parecer quase idênticas — é normal, a diferença entre os índices só fica visível de verdade com algumas semanas ou meses de histórico acumulado.</p>
          </>
        ),
      },
    ],
  },
  {
    titulo: 'Metas',
    Icon: Target,
    cor: '#145A45',
    bg: '#D1FAE5',
    perguntas: [
      {
        pergunta: 'Como funciona um aporte numa meta?',
        resposta: <p>Ao aportar, o valor guardado da meta aumenta na hora, e um registro correspondente aparece em Movimentos (pra você manter visibilidade de tudo que sai do seu caixa). Se precisar corrigir um aporte, use o histórico "Ver aportes" dentro da própria meta — editar ou excluir por lá mantém tudo sincronizado automaticamente.</p>,
      },
    ],
  },
  {
    titulo: 'Linha do Tempo',
    Icon: Route,
    cor: '#145A45',
    bg: '#D1FAE5',
    perguntas: [
      {
        pergunta: 'O que significa "Patrimônio estimado"?',
        resposta: (
          <>
            <p>É a soma de duas partes: o que sobrou do seu fluxo de caixa nos últimos meses, mais o valor atual da sua carteira de investimentos.</p>
            <p>Vale um alerta importante: a parte do fluxo de caixa é reconstruída só com base no que está lançado no Finify. Se você começou a usar o app recentemente, ou já tinha dinheiro guardado antes de começar a lançar tudo, esse número tende a ficar menor do que o seu patrimônio real — porque ele não "sabe" do que existia antes.</p>
          </>
        ),
      },
      {
        pergunta: 'Como funciona a projeção de quando vou atingir minha próxima meta?',
        resposta: <p>É uma estimativa baseada na sua economia média dos últimos meses, projetada pra frente com crescimento composto. Não considera mudanças futuras de renda, inflação ou eventos inesperados — é um norte, não uma promessa. Quanto mais tempo você usar o app, mais precisa essa projeção fica.</p>,
      },
    ],
  },
]

export default function AjudaPage() {
  const [aberto, setAberto] = useState<string | null>(null)

  function toggle(key: string) {
    setAberto(prev => prev === key ? null : key)
  }

  return (
    <div style={{ backgroundColor: '#F7F9FB', minHeight: '100vh' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '32px 20px 64px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <HelpCircle size={20} color="#145A45" strokeWidth={1.75} />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0B1F18', letterSpacing: '-0.4px', margin: 0 }}>Central de Ajuda</h1>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0' }}>Como o Finify calcula cada número que você vê</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', backgroundColor: '#F0FDF4', border: '1px solid #D1FAE5', borderRadius: '14px', padding: '14px 16px', margin: '24px 0 32px' }}>
          <Info size={16} color="#145A45" strokeWidth={1.75} style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{ fontSize: '13px', color: '#0B3B2E', margin: 0, lineHeight: 1.5 }}>
            Transparência é importante pra gente. Toda estimativa (rendimento de investimentos, projeções futuras) é calculada com a melhor informação disponível, mas nunca substitui o extrato oficial da sua corretora ou banco.
          </p>
        </div>

        {SECOES.map(secao => (
          <div key={secao.titulo} style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '9px', backgroundColor: secao.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <secao.Icon size={15} color={secao.cor} strokeWidth={1.75} />
              </div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0B1F18', margin: 0, letterSpacing: '-0.2px' }}>{secao.titulo}</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {secao.perguntas.map((p, i) => {
                const key = `${secao.titulo}-${i}`
                const estaAberto = aberto === key
                return (
                  <div key={key} style={{ backgroundColor: '#fff', border: '1px solid #ECEFF3', borderRadius: '14px', overflow: 'hidden' }}>
                    <button onClick={() => toggle(key)} style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      gap: '12px', padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                    }}>
                      <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#0F172A' }}>{p.pergunta}</span>
                      <ChevronDown size={16} color="#94A3B8" strokeWidth={2}
                        style={{ flexShrink: 0, transform: estaAberto ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                    </button>
                    {estaAberto && (
                      <div style={{ padding: '0 18px 16px', fontSize: '13px', color: '#475569', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {p.resposta}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        <p style={{ fontSize: '12px', color: '#94A3B8', textAlign: 'center', marginTop: '40px' }}>
          Não achou o que procurava? Fale com a gente pelo suporte dentro do app.
        </p>
      </div>
    </div>
  )
}

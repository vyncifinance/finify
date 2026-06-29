@AGENTS.md

# Finify — Regras do Projeto

## Visão Geral
Finify é uma plataforma de gestão patrimonial familiar com foco em famílias cristãs dizimistas.
Stack: Next.js 15, Tailwind CSS, Supabase, Lucide React, Recharts.
Deploy: Vercel. Repositório: github.com/vyncifinance/finify.

---

## Padrão de Design — REGRA PRINCIPAL

**A versão WEB (desktop) é sempre a referência visual.**
Toda tela mobile deve replicar o mesmo visual da web, adaptado para tela pequena.
Nunca criar um estilo diferente para mobile — apenas adaptar o layout.

### Referências de design obrigatórias
Sempre seguir o padrão visual de: **Copilot Money, Monarch Money, Stripe Dashboard, Linear, Notion e Nubank.**

### O que isso significa na prática:
- Cards brancos com borda `#E2E8F0` e sombra sutil
- Ícones circulares coloridos (igual ao desktop) — NUNCA emojis
- Tipografia limpa, sem elementos genéricos
- Label cinza pequeno em cima, valor colorido embaixo
- Ícones: **Lucide React outline apenas** — nunca emojis, nunca outros ícones

---

## Cores
```
Primary (verde escuro):  #0E3B2E / #0B4D3B
Gold (dourado):          #C7A15A
Success (verde):         #10B981
Danger (vermelho):       #EF4444
Warning (amarelo):       #F59E0B
Text primary:            #0F172A
Text secondary:          #64748B
Text muted:              #94A3B8
Border:                  #E2E8F0
Background:              #F8FAFC
Surface (cards):         #FFFFFF
```

---

## Responsividade

### Regra geral
- `lg:hidden` → versão mobile
- `hidden lg:block` ou `hidden lg:flex` → versão desktop
- Desktop e mobile no mesmo arquivo, separados por essas classes

### Layout mobile
- Sidebar some completamente no mobile
- Navegação fica na **bottom nav** (como Nubank) com 4 itens: Dashboard, Movimentos, Metas, Perfil
- Conteúdo ocupa 100% da tela
- Padding bottom de `pb-20` no conteúdo para não ficar atrás da bottom nav
- Botão flutuante (FAB) fica a `bottom: 80px` para ficar acima da bottom nav

### Cards no mobile
- Mesmos cards brancos do desktop com ícone circular colorido
- Flutuam sobre o header verde com `margin-top: -20px` (sobreposição sutil)
- Mesma estrutura: ícone circular → label → valor

### Header mobile
- Fundo verde `#0E3B2E`
- Título + seletor de mês
- Cards brancos flutuando abaixo

### Modal mobile
- Abre de baixo (bottom sheet) com `rounded-t-[28px]`
- Drag handle no topo
- `paddingBottom: 100px` para o botão de confirmar aparecer acima da bottom nav
- Valor em destaque grande e colorido

---

## Banco de Dados (Supabase)

### Tabelas principais
- `familias` — id, nome, codigo_convite, dizimista (boolean), created_at
- `profiles` — id, nome, email, familia_id, created_at
- `lancamentos` — id, familia_id, user_id, tipo (receita/despesa), valor, categoria, membro, data, hora, dizimar (boolean), descricao, created_at
- `metas` — id, familia_id, user_id, nome, valor_alvo, valor_atual, prazo, icone, cor, created_at

### RLS ativa em todas as tabelas
- Usuário lê/escreve apenas dados da própria família
- Busca por código de convite usa policy `for select using (true)` na tabela familias

---

## Feature de Dízimo
- Campo `dizimar: boolean` em `lancamentos` — default `true` para receitas
- Campo `dizimista: boolean` em `familias` — habilita/desabilita a feature
- Cálculo: base = receitas com `dizimar = true` × 10%
- Pago = despesas com `categoria = 'Dízimo'`
- Card no dashboard só aparece se `dizimista = true`
- Toggle no modal de receita para marcar se dizima ou não
- Receitas que NÃO dizimam: devoluções, reembolsos, transferências

---

## Categorias
**Despesa:** Alimentação, Moradia, Transporte, Lazer, Saúde, Educação, Compras, Dízimo, Outros
**Receita:** Salário, Renda Extra, Freelance, Investimento, Outros

## Ícones das categorias (Lucide)
```
Alimentação → UtensilsCrossed
Moradia → Home
Transporte → Car
Lazer → Smile
Saúde → Heart
Educação → BookOpen
Compras → ShoppingBag
Dízimo → Church
Outros → MoreHorizontal
Salário → Briefcase
Renda Extra → DollarSign
Freelance → Laptop
Investimento → TrendingUp
```

---

## Autenticação
- Supabase Auth com email/senha
- Middleware protege `/dashboard/*` — redireciona para `/` se não autenticado
- Usuário autenticado em `/` ou `/cadastro` → redireciona para `/dashboard`
- `export const dynamic = 'force-dynamic'` obrigatório em todas as pages

## Cadastro
- Fluxo em tela única com toggle: "Criar família" ou "Entrar com código"
- Código de convite formato: `XXX-0000` (3 letras do nome + 4 números)
- Admin vê o código no Perfil e compartilha com familiares

## API Routes
- `/api/membros` — busca membros da família via service role (sem RLS)
- Usa `src/lib/supabase-admin.ts` com `SUPABASE_SERVICE_ROLE_KEY`

---

## PWA
- `public/manifest.json` configurado
- Ícones: `icon-192.svg`, `icon-512.svg`, `apple-touch-icon.svg`
- Ícone: fundo verde `#0E3B2E` + letra F dourada `#C7A15A` + borda dourada
- Nome: "Finify"
- `theme_color: #0E3B2E`

---

## O que NUNCA fazer
- ❌ Emojis na interface
- ❌ Ícones que não sejam Lucide React outline
- ❌ Estilo visual diferente entre mobile e desktop (mobile é adaptação do desktop)
- ❌ Classes Tailwind dinâmicas (ex: `grid-cols-${n}`) — usar inline style
- ❌ RLS recursiva na tabela profiles (causa loop infinito)
- ❌ Hardcode de valores que mudam (usar variáveis de estado)
- ❌ `position: fixed` sem considerar a bottom nav no mobile

---

## UI Premium — Regras de Aparência

O Finify é um produto financeiro premium. Cada elemento visual deve transmitir confiança, sofisticação e qualidade.

### Ícones — REGRA CRÍTICA
- **NUNCA usar emojis** em nenhum lugar da interface — nem em botões, inputs, labels ou mensagens
- **SEMPRE usar Lucide React outline** — é a única biblioteca de ícones permitida
- Exemplos de substituições obrigatórias:
  - 👁️ / 🙈 (mostrar/ocultar senha) → `Eye` / `EyeOff` do Lucide
  - ✓ (confirmação) → `Check` ou `CheckCircle2` do Lucide
  - ✕ (fechar) → `X` do Lucide
  - 🗑️ (deletar) → `Trash2` do Lucide
  - ✏️ (editar) → `Pencil` do Lucide
  - 📋 (copiar) → `Copy` do Lucide
  - 🔔 (notificação) → `Bell` do Lucide
  - 📊 (gráfico) → `TrendingUp` do Lucide
  - 💰 (dinheiro) → `DollarSign` ou `Wallet` do Lucide

### Padrão de qualidade visual
- Inputs com `height: 52px`, `border-radius: 16px`, borda verde ao focar
- Botões principais: fundo `#0E3B2E`, `height: 52-56px`, `border-radius: 16px`, sombra sutil
- Botões secundários: fundo transparente com borda, nunca cinza genérico
- Mensagens de erro: fundo `#FEF2F2`, texto `#DC2626`, `border-radius: 12px`
- Nunca usar `alert()` nativo do browser — usar componentes visuais no próprio layout
- Transições suaves em hover: `hover:opacity-90` ou `transition-all`
- Textos de suporte: `#6B7280` ou `#94A3B8`, nunca preto puro

### O que torna um app genérico (PROIBIDO)
- Emojis como ícones funcionais
- Botões quadrados sem border-radius
- Inputs sem estilo de foco
- Cores padrão do browser (azul de link, cinza de botão)
- Alertas nativos do browser (`alert()`, `confirm()`)
- Ícones de fontes externas (Font Awesome, Material Icons)
- Gradientes excessivos ou cores neon

@AGENTS.md

# Finify — Regras do Projeto

## Visão Geral
Finify é uma plataforma de gestão patrimonial familiar com foco em famílias cristãs dizimistas, com público de renda média/alta. A interface deve transmitir sofisticação, confiança, patrimônio, estabilidade, tecnologia e simplicidade — nível SaaS premium (Stripe, Linear, Vercel, Mercury, Wealthfront).
Stack: Next.js 15, Tailwind CSS, Supabase, Lucide React, Recharts.
Deploy: Vercel. Repositório: github.com/vyncifinance/finify.

---

## Padrão de Design — REGRA PRINCIPAL

**A versão WEB (desktop) é sempre a referência visual.**
Toda tela mobile deve replicar o mesmo visual da web, adaptado para tela pequena.
Nunca criar um estilo diferente para mobile — apenas adaptar o layout.

A interface precisa parecer um produto de milhões de dólares. Não deve parecer um template genérico de IA. Priorize hierarquia visual, espaçamento impecável (grid de 8px), microinterações elegantes, consistência de cores e sensação de luxo discreto.

### Referências de design obrigatórias
Sempre seguir o padrão visual de: **Stripe, Linear, Vercel, Mercury, Wealthfront, Raycast, Copilot Money, Monarch Money e Nubank.**

---

## Paleta de Cores OFICIAL

### Verdes (cor principal: #0B3B2E)
```
#07271F   — verde mais escuro (gradientes, hover de botões escuros)
#0B3B2E   — verde principal (textos de marca, ícones escuros)
#0F4737   — verde escuro médio (gradientes, ícones)
#145A45   — verde médio (gradientes de logo e botões)
#2FB36A   — verde vibrante de destaque (CTAs, links, badges, "para famílias.")
#58D68D   — verde claro de destaque (ícones sobre fundo escuro, micro-badges)
```

### Neutros
```
Branco:           #FFFFFF
Cinza muito claro: #F7F8FA   (fundos sutis, separadores)
Cinza claro:       #ECEFF3   (bordas sutis, dividers)
Borda padrão:      #E5E7EB
Texto secundário:  #6B7280 / #64748B
Texto muted:       #94A3B8 / #9CA3AF
Texto primário:    #0F172A / #111827
```

### Estados (mantidos do sistema anterior)
```
Success: #10B981
Danger:  #EF4444
Warning: #F59E0B
```

### Gradiente de fundo escuro (heroes, sidebar, cards de destaque)
```css
linear-gradient(180deg, #06261F 0%, #0A342A 50%, #0D3F31 100%)
```

### Gradiente de logo / botões principais
```css
linear-gradient(135deg, #145A45 0%, #2FB36A 100%)        /* logo */
linear-gradient(135deg, #07271F 0%, #145A45 100%)        /* botão CTA principal */
linear-gradient(135deg, #07271F 0%, #0F4737 100%)        /* botão secundário escuro */
```

---

## Logo

O símbolo "F" é um ícone geométrico minimalista — NUNCA a letra F tipográfica comum. Inspirado em Linear/Raycast/Stripe: formas geométricas dentro de um quadrado arredondado com gradiente verde (`#145A45 → #2FB36A`).

```jsx
<div style={{
  width: 36, height: 36, borderRadius: 10,
  background: 'linear-gradient(135deg, #145A45 0%, #2FB36A 100%)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: '0 2px 8px rgba(47,179,106,0.35)',
}}>
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M4 4h12v3H7.5v2.5H13v3H7.5V16H4V4z" fill="white" fillOpacity="0.95"/>
  </svg>
</div>
<span style={{ fontWeight: 700, color: '#fff', letterSpacing: '-0.4px' }}>Finify</span>
```
Em fundo claro, trocar a cor do texto para `#0B3B2E`.

---

## Tokens de Estilo Premium

### Inputs
- Altura: `52-58px`
- Border-radius: `13-14px`
- Borda padrão: `1.5px solid #E5E7EB`
- Background: `#FAFAFA` (estado normal) → `#fff` (foco)
- Foco: borda `#2FB36A` + glow `box-shadow: 0 0 0 3px rgba(47,179,106,0.12)`

### Botões principais (CTA)
- Altura: `52-60px`
- Border-radius: `14-16px`
- Background: `linear-gradient(135deg, #07271F 0%, #145A45 100%)`
- Shadow: `0 4px 16px rgba(11,59,46,0.3)`
- Hover: shadow mais forte + `translateY(-1px)`

### Botões secundários (outline)
- Borda: `1.5px solid #E5E7EB`
- Hover: borda `#2FB36A` + background `#F0FDF4`

### Cards
- Border-radius: `18-28px` dependendo do tamanho (cards pequenos 14-18px, cards de container 24-28px)
- Shadow sutil: `0 4px 6px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.07)`
- Borda: `1px solid #ECEFF3` ou `#E2E8F0`

### Glassmorphism (usar em heroes escuros e mockups flutuantes)
```css
background-color: rgba(255,255,255,0.06);
border: 1px solid rgba(255,255,255,0.1);
backdrop-filter: blur(12-16px);
```

### Badges (pills)
```css
padding: 5-6px 14px;
border-radius: 999px;
background-color: rgba(47,179,106,0.12);
border: 1px solid rgba(47,179,106,0.25);
color: #58D68D (em fundo escuro) ou #2FB36A (em fundo claro);
```

### Tipografia
- Fonte: Inter (ou system font equivalente: `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`)
- Pesos usados: 400, 500, 600, 700, 800
- Títulos hero: `48-56px / 800 / letter-spacing -2px a -2.5px`
- Títulos de seção: `26-28px / 700 / letter-spacing -0.5px a -0.7px`
- Labels uppercase: `10.5-11px / 700 / letter-spacing 0.08-0.09em`

### Microinterações
- Fade-in sutil ao montar a página (`opacity` + `transition`)
- Hover em botões: leve `translateY(-1px)` + intensifica shadow
- Hover em cards/links: borda muda para verde + background `#F0FDF4`
- Transições: `transition: all 0.15-0.2s`

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
- Padding bottom de `pb-20` (ou `paddingBottom: 100px`) no conteúdo para não ficar atrás da bottom nav
- Botão flutuante (FAB) fica a `bottom: 80px` para ficar acima da bottom nav

### Telas de autenticação (Login/Cadastro)
- Desktop: duas colunas (55% hero escuro / 45% formulário branco)
- Mobile: primeiro mostrar login/formulário, depois conteúdo institucional (ou ocultar a coluna institucional)

### Cards no mobile
- Mesmos cards brancos do desktop com ícone circular colorido
- Flutuam sobre o header verde com `margin-top: -20px` a `-48px` (sobreposição sutil)
- Mesma estrutura: ícone circular → label → valor

### Header mobile (telas internas)
- Fundo com gradiente escuro (`linear-gradient(135deg, #0B4D3B 0%, #0F766E 100%)` ou tokens novos equivalentes)
- Título + seletor de mês
- Cards brancos flutuando abaixo

### Modal mobile
- Abre de baixo (bottom sheet) com `rounded-t-[28px]`
- Drag handle no topo
- Botão de ação sempre visível, fora da área de scroll, com padding inferior suficiente para não ficar atrás da bottom nav

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
- TODA tabela precisa de policies de SELECT, INSERT, UPDATE e DELETE — esquecer UPDATE/DELETE é a causa mais comum de "editei/deletei mas não salvou"

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
**Despesa:** Alimentação, Moradia, Transporte, Lazer, Saúde, Educação, Compras, Cartão de Crédito, Dízimo, Outros
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
Cartão de Crédito → CreditCard
Dízimo → Church
Outros → MoreHorizontal
Salário → Briefcase
Renda Extra → DollarSign
Freelance → Laptop
Investimento → TrendingUp
```

---

## Funcionalidades de Lançamento
- **Observação**: campo de texto opcional. Na lista mobile mostrar apenas um ícone discreto (`AlignLeft`) quando preenchido, nunca o texto completo (evita poluição visual). No desktop pode mostrar o texto truncado.
- **Compra parcelada**: toggle "Compra parcelada" disponível apenas em despesas novas (não em edição). Campos: número de parcelas (2-48x) e dia de vencimento. O valor informado é o TOTAL, dividido automaticamente pelo número de parcelas. Cria N lançamentos com datas mensais sequenciais e descrição "Parcela X/N".
- **Editar/Deletar**: todo lançamento e toda meta devem ter ícone de lápis (`Pencil`) visível na listagem, indicando que são editáveis. Modal de edição sempre com botão "Deletar" com confirmação dupla (primeiro clique pede confirmação, segundo clique executa).

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
- Segue o mesmo padrão visual premium da tela de login (duas colunas, hero escuro à esquerda, formulário branco à direita)

## API Routes
- `/api/membros` — busca membros da família via service role (sem RLS)
- Usa `src/lib/supabase-admin.ts` com `SUPABASE_SERVICE_ROLE_KEY`

---

## PWA
- `public/manifest.json` configurado
- Ícones: `icon-192.svg`, `icon-512.svg`, `apple-touch-icon.svg`
- Ícone: usa o novo símbolo geométrico do "F" com gradiente verde (`#145A45 → #2FB36A`), fundo com cantos arredondados
- Nome: "Finify"
- `theme_color: #0B3B2E`

---

## UI Premium — Regras de Aparência

O Finify é um produto financeiro premium. Cada elemento visual deve transmitir confiança, sofisticação e qualidade — o usuário deve sentir que está entrando em uma plataforma financeira sofisticada e confiável, nunca em um template genérico.

### Ícones — REGRA CRÍTICA
- **NUNCA usar emojis** em nenhum lugar da interface — nem em botões, inputs, labels, badges ou mensagens
- **SEMPRE usar Lucide React outline** — é a única biblioteca de ícones permitida
- Exemplos de substituições obrigatórias:
  - 👁️ / 🙈 (mostrar/ocultar senha) → `Eye` / `EyeOff` do Lucide
  - ✓ (confirmação) → `Check` ou `CheckCircle2` do Lucide
  - ✕ (fechar) → `X` do Lucide
  - 🗑️ (deletar) → `Trash2` do Lucide
  - ✏️ (editar) → `Pencil` do Lucide
  - 📋 (copiar) → `Copy` do Lucide
  - 🔔 (notificação) → `Bell` do Lucide
  - 📊 (gráfico) → `TrendingUp` ou `BarChart2` do Lucide
  - 💰 (dinheiro) → `DollarSign` ou `Wallet` do Lucide
  - 🔒 (segurança) → `Lock` ou `Shield` do Lucide
  - 👥 (família/pessoas) → `Users` do Lucide
  - 🏠 (casa) → `Home` do Lucide
  - 📱 (celular) → `Smartphone` do Lucide
  - 🔄 (sincronizar) → `RefreshCw` do Lucide
  - 👋 (acenar/saudação) → remover completamente, não substituir por ícone

### Padrão de qualidade visual
- Sempre usar os tokens de cor e estilo da seção "Tokens de Estilo Premium" acima
- Nunca usar `alert()` nativo do browser — usar componentes visuais no próprio layout
- Transições suaves em hover: `hover:opacity-90` ou `transition: all 0.15-0.2s`
- Textos de suporte: `#6B7280` ou `#94A3B8`, nunca preto puro

### O que torna um app genérico (PROIBIDO)
- Emojis como ícones funcionais ou decorativos
- Botões quadrados sem border-radius
- Inputs sem estilo de foco (glow/borda colorida)
- Cores padrão do browser (azul de link, cinza de botão)
- Alertas nativos do browser (`alert()`, `confirm()`)
- Ícones de fontes externas (Font Awesome, Material Icons)
- Gradientes excessivos ou cores neon fora da paleta oficial
- Sombras muito duras/escuras sem suavização (`box-shadow` cru tipo `0 0 10px black`)

---

## Encoding — REGRA CRÍTICA
Todos os arquivos `.tsx` devem ser salvos em UTF-8 real. PowerShell e VS Code às vezes corrompem acentos (`ç`, `ã`, `é`, `ó` viram sequências como `Ã§`, `Ã£`). Antes de considerar um arquivo pronto, revisar visualmente se há sequências `Ã` seguidas de caractere estranho — isso indica encoding quebrado e precisa ser corrigido antes do commit.

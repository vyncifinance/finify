# Como integrar — Fase 1 (CNPJ)

## 1. Banco
Rodar `sql/001_empresas.sql` no SQL Editor do Supabase (Dashboard → SQL Editor → colar → Run).

## 2. Copiar arquivos pro projeto
- `lib/contexto.ts` → `src/lib/contexto.ts`
- `lib/categorias-empresa.ts` → `src/lib/categorias-empresa.ts`
- `components/ContextSwitcher.tsx` → `src/components/ContextSwitcher.tsx`

## 3. Em `movimentos-page.tsx`

**Import + estado:**
```tsx
import ContextSwitcher from '@/components/ContextSwitcher'
import { lerContexto, salvarContexto, type ContextoAtivo } from '@/lib/contexto'
import { CATEGORIAS_DESPESA_EMPRESA, CATEGORIAS_RECEITA_EMPRESA, ICONES_CAT_EMPRESA } from '@/lib/categorias-empresa'

const [contexto, setContexto] = useState<ContextoAtivo>({ tipo: 'pessoal', empresaId: null })
const [empresas, setEmpresas] = useState<Empresa[]>([])
```

**No `init()`**, depois de carregar o profile:
```tsx
setContexto(lerContexto())

const { data: empresasData } = await supabase
  .from('empresas').select('*').eq('familia_id', fid)
if (empresasData) setEmpresas(empresasData)
```

**Em `carregarLancamentos`**, adicionar filtro por contexto:
```tsx
let query = supabase.from('lancamentos').select('*')
  .eq('familia_id', fid).gte('data', ini).lte('data', fim)

if (contexto.tipo === 'empresa') {
  query = query.eq('empresa_id', contexto.empresaId)
} else {
  query = query.is('empresa_id', null)
}
```
⚠️ Adicionar `contexto` como dependência do `useEffect` que chama `carregarLancamentos`.

**Função de troca de contexto:**
```tsx
function trocarContexto(novo: ContextoAtivo) {
  setContexto(novo)
  salvarContexto(novo)
}
```

**No header (mobile e desktop)**, colocar o switcher no lugar do título estático:
```tsx
<ContextSwitcher
  familiaNome={familiaNome}
  empresas={empresas}
  contextoAtivo={contexto}
  onTrocar={trocarContexto}
  onAdicionarEmpresa={() => setModalEmpresaOpen(true)}
/>
```

**Categorias dinâmicas** — trocar a linha `const categorias = tipo === 'despesa' ? CATEGORIAS_DESPESA : CATEGORIAS_RECEITA`:
```tsx
const categorias = contexto.tipo === 'empresa'
  ? (tipo === 'despesa' ? CATEGORIAS_DESPESA_EMPRESA : CATEGORIAS_RECEITA_EMPRESA)
  : (tipo === 'despesa' ? CATEGORIAS_DESPESA : CATEGORIAS_RECEITA)
```
Mesma troca no `ICONES_CAT` usado pra renderizar o ícone da categoria.

**Dízimo com default diferente por contexto** — em `handleTipo` e `abrirModalNovo`:
```tsx
setDizimar(t === 'receita' && contexto.tipo === 'pessoal')
```

**No `handleSalvar`**, incluir `empresa_id` nos inserts/updates:
```tsx
empresa_id: contexto.tipo === 'empresa' ? contexto.empresaId : null,
```

**Mini-seletor dentro do modal** (herdando o contexto global, com opção de trocar):
Colocar o mesmo `<ContextSwitcher variant="compact" .../>` logo no topo do `modalContent`, antes do bloco "Tipo".

## 4. No Perfil
Criar seção "Minhas empresas": lista as empresas da família (`select * from empresas`) + botão
"+ Adicionar CNPJ" que abre um modal simples (nome + campo de CNPJ com máscara) e faz
`insert` em `empresas`. Depois do insert, dar refresh na lista de `empresas` que alimenta o
`ContextSwitcher`.

## 5. Não esquecer
- [ ] Rodar o SQL antes de testar qualquer coisa
- [ ] Conferir se `familiaNome` já existe no estado (já existe em `movimentos-page.tsx` como `familiaNome`)
- [ ] Testar troca de contexto → confirma que os lançamentos filtram corretamente
- [ ] Testar lançamento novo em contexto empresa → confirma `empresa_id` salvo certo
- [ ] Rodar o checklist premium do CLAUDE.md no `ContextSwitcher` antes de considerar pronto

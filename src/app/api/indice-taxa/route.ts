import { NextRequest, NextResponse } from 'next/server'

// Converte a performance recente de um índice/ETF numa taxa diária equivalente,
// pro mesmo formato de comparação usado com CDI/IPCA. Usa os últimos 3 meses
// (interval mensal) pra suavizar oscilação de curto prazo.
// Uso: GET /api/indice-taxa?ticker=^BVSP
export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get('ticker')
  if (!ticker) {
    return NextResponse.json({ error: 'Parâmetro "ticker" é obrigatório' }, { status: 400 })
  }

  const token = process.env.BRAPI_TOKEN
  const url = `https://brapi.dev/api/quote/${encodeURIComponent(ticker)}?range=3mo&interval=1mo`

  try {
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      next: { revalidate: 3600 }, // performance de 3 meses não precisa recalcular toda hora
    })

    if (!res.ok) {
      return NextResponse.json({ error: `brapi.dev retornou ${res.status}` }, { status: res.status })
    }

    const data = await res.json()
    const resultado = data.results?.[0]
    const historico = resultado?.historicalDataPrice

    if (!historico || historico.length < 2) {
      return NextResponse.json({ error: 'Sem histórico suficiente' }, { status: 502 })
    }

    const precoInicial = historico[0].close
    const precoFinal = historico[historico.length - 1].close
    const diasCorridos = Math.round((historico[historico.length - 1].date - historico[0].date) / 86400)
    const diasUteisAprox = Math.max(Math.round(diasCorridos * (5 / 7)), 1) // aproximação simples de dias úteis

    const retornoTotal = precoFinal / precoInicial - 1
    const taxaDiaria = Math.pow(1 + retornoTotal, 1 / diasUteisAprox) - 1

    return NextResponse.json({ taxaDiaria, retornoTotal })
  } catch (e) {
    return NextResponse.json({ error: 'Falha ao buscar histórico do índice' }, { status: 502 })
  }
}

import { NextRequest, NextResponse } from 'next/server'

// Busca ativos (ações/FIIs) por parte do ticker ou nome, pra autocompletar.
// Uso: GET /api/tickers?search=ITUB&tipo=acao
export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get('search')
  const tipo = req.nextUrl.searchParams.get('tipo') // 'acao' | 'fii'
  if (!search || search.length < 2) {
    return NextResponse.json({ resultados: [] })
  }

  const token = process.env.BRAPI_TOKEN
  const tipoBrapi = tipo === 'fii' ? 'fund' : 'stock'
  const url = `https://brapi.dev/api/quote/list?search=${encodeURIComponent(search)}&type=${tipoBrapi}&limit=8`

  try {
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })

    if (!res.ok) {
      const corpo = await res.text()
      return NextResponse.json({ resultados: [], error: `brapi.dev retornou ${res.status}`, detalhe: corpo }, { status: 200 })
    }

    const data = await res.json()
    const resultados = (data.stocks || []).map((s: any) => ({
      ticker: s.stock || s.symbol,
      nome: s.name || s.shortName || '',
    })).filter((r: any) => r.ticker)

    return NextResponse.json({ resultados })
  } catch (e) {
    return NextResponse.json({ resultados: [], error: 'Falha ao buscar' }, { status: 200 })
  }
}

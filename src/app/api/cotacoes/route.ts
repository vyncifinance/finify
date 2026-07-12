import { NextRequest, NextResponse } from 'next/server'

// Proxy interno pra brapi.dev — o token fica só no servidor, nunca é exposto pro navegador.
// Uso: GET /api/cotacoes?tickers=PETR4,VALE3,HGLG11
export async function GET(req: NextRequest) {
  const tickers = req.nextUrl.searchParams.get('tickers')
  if (!tickers) {
    return NextResponse.json({ error: 'Parâmetro "tickers" é obrigatório' }, { status: 400 })
  }

  const token = process.env.BRAPI_TOKEN
  const url = `https://brapi.dev/api/quote/${encodeURIComponent(tickers)}`

  try {
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      // brapi atualiza a cada poucos minutos no plano gratuito — não precisa buscar a cada request
      next: { revalidate: 120 },
    })

    if (!res.ok) {
      return NextResponse.json({ error: `brapi.dev retornou ${res.status}` }, { status: res.status })
    }

    const data = await res.json()
    const cotacoes = (data.results || []).reduce((acc: Record<string, number>, r: any) => {
      if (r.symbol && typeof r.regularMarketPrice === 'number') acc[r.symbol] = r.regularMarketPrice
      return acc
    }, {})

    return NextResponse.json({ cotacoes })
  } catch (e) {
    return NextResponse.json({ error: 'Falha ao buscar cotações' }, { status: 502 })
  }
}

import { NextRequest, NextResponse } from 'next/server'

// Busca o histórico de proventos (dividendos/JCP) de um ticker na brapi.dev.
// Uso: GET /api/proventos?ticker=PETR4
export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get('ticker')
  if (!ticker) {
    return NextResponse.json({ error: 'Parâmetro "ticker" é obrigatório' }, { status: 400 })
  }

  const token = process.env.BRAPI_TOKEN
  const url = `https://brapi.dev/api/quote/${encodeURIComponent(ticker)}?dividends=true`

  try {
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      next: { revalidate: 3600 }, // proventos não mudam a cada minuto
    })

    if (!res.ok) {
      return NextResponse.json({ error: `brapi.dev retornou ${res.status}` }, { status: res.status })
    }

    const data = await res.json()
    const cash = data.results?.[0]?.dividendsData?.cashDividends || []

    // Campos exatos da brapi podem variar (paymentDate/approvedOn, rate/value) — cobre as
    // variações conhecidas em vez de assumir um único nome de campo.
    const proventos = cash
      .map((d: any) => ({
        data: d.paymentDate || d.approvedOn || d.lastDatePrior || null,
        valorPorAcao: Number(d.rate ?? d.value ?? 0),
        label: d.label || (d.relatedTo ? `Provento — ${d.relatedTo}` : 'Provento'),
      }))
      .filter((p: any) => p.data && p.valorPorAcao > 0)

    return NextResponse.json({ proventos })
  } catch (e) {
    return NextResponse.json({ error: 'Falha ao buscar proventos' }, { status: 502 })
  }
}

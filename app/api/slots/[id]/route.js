import { THEME_FETCHER } from '@/lib/registry'

// GitHub Actions cron 주기(4분)에 맞춰 캐시 TTL 설정
const TTL_MS = 4 * 60 * 1000
const cache  = {}  // { [themeId]: { data, cachedAt } }

export async function GET(_, { params }) {
  const { id } = await params
  const fetcher = THEME_FETCHER[id]
  if (!fetcher) return Response.json({ error: `Unknown theme: ${id}` }, { status: 404 })

  const now = Date.now()
  if (cache[id] && now - cache[id].cachedAt < TTL_MS) {
    return Response.json(cache[id].data)
  }

  try {
    const slots = await fetcher(id)
    const data  = { theme_id: id, slots, checked_at: new Date().toISOString() }
    cache[id]   = { data, cachedAt: now }
    return Response.json(data)
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

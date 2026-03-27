import { THEME_FETCHER } from '@/lib/registry'
import { getCached, setCached } from '@/lib/slotCache'

export async function GET(_, { params }) {
  const { id } = await params
  const fetcher = THEME_FETCHER[id]
  if (!fetcher) return Response.json({ error: `Unknown theme: ${id}` }, { status: 404 })

  const cached = getCached(id)
  if (cached) return Response.json(cached)

  try {
    const slots = await fetcher(id)
    const data  = { theme_id: id, slots, checked_at: new Date().toISOString() }
    setCached(id, data)
    return Response.json(data)
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

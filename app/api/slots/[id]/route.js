import { THEME_FETCHER } from '@/lib/registry'

export async function GET(_, { params }) {
  const { id } = await params
  const fetcher = THEME_FETCHER[id]
  if (!fetcher) return Response.json({ error: `Unknown theme: ${id}` }, { status: 404 })
  try {
    const slots = await fetcher(id)
    return Response.json({ theme_id: id, slots, checked_at: new Date().toISOString() })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

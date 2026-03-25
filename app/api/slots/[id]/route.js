import { fetchThemeSlots } from '@/lib/keyescape'

export async function GET(_, { params }) {
  const { id } = await params
  try {
    const slots = await fetchThemeSlots(id)
    return Response.json({ theme_id: id, slots, checked_at: new Date().toISOString() })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

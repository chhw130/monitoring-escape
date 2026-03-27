import { fetchThemeSlots } from '@/lib/keyescape'
import { fetchOasisThemeSlots, OASIS_THEMES } from '@/lib/oasismuseum'

export async function GET(_, { params }) {
  const { id } = await params
  try {
    const isOasis = OASIS_THEMES.some(t => t.id === id)
    const slots = isOasis ? await fetchOasisThemeSlots(id) : await fetchThemeSlots(id)
    return Response.json({ theme_id: id, slots, checked_at: new Date().toISOString() })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

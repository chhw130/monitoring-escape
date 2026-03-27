import { fetchAllSlots } from '@/lib/keyescape'
import { fetchAllOasisSlots } from '@/lib/oasismuseum'

export const maxDuration = 30  // Vercel 최대 실행 시간 30초

export async function GET() {
  try {
    const [keyescape, oasis] = await Promise.all([fetchAllSlots(), fetchAllOasisSlots()])
    return Response.json({ ...keyescape, ...oasis })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

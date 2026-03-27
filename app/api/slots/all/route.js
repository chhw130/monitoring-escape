import { fetchAllSlots } from '@/lib/keyescape'
import { fetchAllOasisSlots } from '@/lib/oasismuseum'
import { fetchAllFrankSlots } from '@/lib/frank'

export const maxDuration = 30  // Vercel 최대 실행 시간 30초

export async function GET() {
  try {
    const [keyescape, oasis, frank] = await Promise.all([fetchAllSlots(), fetchAllOasisSlots(), fetchAllFrankSlots()])
    return Response.json({ ...keyescape, ...oasis, ...frank })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

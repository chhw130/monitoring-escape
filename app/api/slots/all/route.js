import { fetchAllSlots } from '@/lib/keyescape'

export const maxDuration = 30  // Vercel 최대 실행 시간 30초

export async function GET() {
  try {
    const data = await fetchAllSlots()
    return Response.json(data)
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

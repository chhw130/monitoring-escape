import { ALL_FETCHERS } from '@/lib/registry'

export const maxDuration = 30  // Vercel 최대 실행 시간 30초

export async function GET() {
  try {
    const results = await Promise.all(ALL_FETCHERS.map(f => f()))
    return Response.json(Object.assign({}, ...results))
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

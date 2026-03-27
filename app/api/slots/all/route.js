import { ALL_FETCHERS, ALL_THEMES } from '@/lib/registry'
import { setCached } from '@/lib/slotCache'

export const maxDuration = 30  // Vercel 최대 실행 시간 30초

export async function GET() {
  try {
    const results = await Promise.all(ALL_FETCHERS.map(f => f()))
    const merged  = Object.assign({}, ...results)

    // 테마별로 캐시 갱신 → 이후 브라우저의 /api/slots/[id] 요청은 캐시 히트
    for (const theme of ALL_THEMES) {
      if (merged[theme.id]) {
        setCached(theme.id, {
          theme_id:   theme.id,
          slots:      merged[theme.id].slots,
          checked_at: merged[theme.id].checked_at,
        })
      }
    }

    return Response.json(merged)
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

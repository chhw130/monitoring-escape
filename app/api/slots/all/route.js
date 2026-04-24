import { THEME_FETCHER, ALL_THEMES } from '@/lib/registry'
import { setCached } from '@/lib/slotCache'

export const maxDuration = 30  // Vercel 최대 실행 시간 30초

async function getEnabledThemeIds() {
  const token = process.env.GH_PAT
  const repo  = process.env.GH_REPO
  try {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/actions/variables/NOTIFY_THEMES`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' } }
    )
    if (res.ok) {
      const data = await res.json()
      return data.value.split(',').map(s => s.trim()).filter(Boolean)
    }
  } catch {}
  return ALL_THEMES.map(t => t.id)  // fallback: 전체 테마
}

export async function GET() {
  try {
    const enabledIds    = await getEnabledThemeIds()
    const enabledThemes = ALL_THEMES.filter(t => enabledIds.includes(t.id))

    const results = await Promise.all(
      enabledThemes.map(async (theme) => {
        const slots = await THEME_FETCHER[theme.id](theme.id)
        return [theme.id, {
          slots,
          checked_at:   new Date().toISOString(),
          name:         theme.name,
          emoji:        theme.emoji,
          branch:       theme.branch,
          openDaysAhead: theme.openDaysAhead,
          openHour:     theme.openHour,
          reserveUrl:   theme.reserveUrl,
        }]
      })
    )

    const merged = Object.fromEntries(results)

    for (const [id, data] of Object.entries(merged)) {
      setCached(id, { theme_id: id, ...data })
    }

    return Response.json(merged)
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

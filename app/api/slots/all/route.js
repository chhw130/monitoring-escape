import { THEME_FETCHER, ALL_THEMES } from '@/lib/registry'
import { setCached } from '@/lib/slotCache'
import { buildThemeResult } from '@/lib/slotUtils'

export const maxDuration = 30  // Vercel 최대 실행 시간 30초

async function fetchEnabledThemeIds() {
  const token = process.env.GH_PAT
  const repo  = process.env.GH_REPO
  try {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/actions/variables/NOTIFY_THEMES`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' } }
    )
    if (!res.ok) { return [] }
    const data = await res.json()
    return data.value.split(',').map(s => s.trim()).filter(Boolean)
  } catch {
    return []
  }
}

function getDaysToSkip(dayMinByDow) {
  return new Set(
    dayMinByDow.reduce((acc, minHour, dowIndex) => {
      if (minHour === -1) { acc.push(dowIndex) }
      return acc
    }, [])
  )
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const dayMinByDow    = (searchParams.get('dayMin') || '0,17,17,17,17,17,0').split(',').map(Number)
    const themeSettings  = JSON.parse(searchParams.get('themeSettings') || '{}')
    const globalSkipDows = getDaysToSkip(dayMinByDow)

    const enabledIds    = await fetchEnabledThemeIds()
    const enabledThemes = enabledIds.length > 0
      ? ALL_THEMES.filter(t => enabledIds.includes(t.id))
      : []

    const results = await Promise.all(
      enabledThemes.map(async (theme) => {
        const themeDayMin = themeSettings[theme.id]?.dayMin
        const skipDows    = themeDayMin ? getDaysToSkip(themeDayMin) : globalSkipDows
        const slots       = await THEME_FETCHER[theme.id](theme.id, skipDows)
        return [theme.id, buildThemeResult(theme, slots)]
      })
    )

    const resultMap = Object.fromEntries(results)
    for (const [id, data] of Object.entries(resultMap)) {
      setCached(id, { theme_id: id, ...data })
    }

    return Response.json(resultMap)
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

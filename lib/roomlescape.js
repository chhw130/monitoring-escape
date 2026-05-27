import { buildThemeResult } from './slotUtils'

const BASE_URL = 'https://www.roomlescape.com'

export const ROOMLESCAPE_BRANCHES = [
  { id: 'roomlescape-hongdae1', name: '홍대1호점', brand: '룸이스케이프', location: '홍대' },
]

export const ROOMLESCAPE_THEMES = [
  {
    id: 'roomlescape-hongdae1-commute', name: '퇴근길', emoji: '🚇',
    branchId: 'roomlescape-hongdae1', branch: '홍대1호점',
    themeSeq: 6,
    openDaysAhead: 6, openHour: 0, openMinute: 0,
    reserveUrl: `${BASE_URL}/home.php?go=rev.make&showroomSeq=2&themeSeq=6`,
  },
]

/**
 * GitHub Actions에서 저장한 ROOMLESCAPE_SLOTS Variable을 읽어서 반환
 * Vercel IP → roomlescape.com 봇 차단을 우회하기 위한 구조
 */
async function fetchSlotsFromGitHubVariable() {
  const token = process.env.GH_PAT
  const repo  = process.env.GH_REPO
  try {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/actions/variables/ROOMLESCAPE_SLOTS`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        cache: 'no-store',
      }
    )
    if (!res.ok) return {}
    const data = await res.json()
    return JSON.parse(data.value || '{}')
  } catch (e) {
    console.error('[roomlescape] GitHub Variable 읽기 오류:', e.message)
    return {}
  }
}

export async function fetchRoomlescapeThemeSlots(themeId, skipDows = new Set()) {
  const theme = ROOMLESCAPE_THEMES.find(t => t.id === themeId)
  if (!theme) { throw new Error(`Unknown roomlescape theme: ${themeId}`) }

  const allSlots   = await fetchSlotsFromGitHubVariable()
  const themeSlots = allSlots[themeId] ?? {}

  if (skipDows.size === 0) return themeSlots

  return Object.fromEntries(
    Object.entries(themeSlots).filter(([dateStr]) => {
      const dow = new Date(dateStr + 'T00:00:00').getDay()
      return !skipDows.has(dow)
    })
  )
}

export async function fetchAllRoomlescapeSlots() {
  const results = await Promise.all(
    ROOMLESCAPE_THEMES.map(async (theme) => {
      const slots = await fetchRoomlescapeThemeSlots(theme.id)
      return [theme.id, buildThemeResult(theme, slots)]
    })
  )
  return Object.fromEntries(results)
}

import { isBookable, getDateRange, filterSkipDays, buildThemeResult } from './slotUtils'

const BASE_URL = 'https://xdungeon.net/layout/res/home.php'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36'
const ZIZUM = '9'
const RANGE_DAYS = 60

export const XDUNGEON_BRANCHES = [
  { id: 'dungeon-stella', name: '던전스텔라', brand: '비트포비아 던전', location: '강남' },
]

export const XDUNGEON_THEMES = [
  {
    id: 'xdungeon-destiny', name: '데스티니 앤드 타로', emoji: '🔮',
    branchId: 'dungeon-stella', branch: '던전스텔라',
    themeNum: '50',
    openDaysAhead: 60, openHour: 0,
    reserveUrl: 'https://xdungeon.net/layout/res/home.php?go=rev.main&s_zizum=9',
  },
  {
    id: 'xdungeon-hyang', name: '響 : 향', emoji: '🎵',
    branchId: 'dungeon-stella', branch: '던전스텔라',
    themeNum: '51',
    openDaysAhead: 60, openHour: 0,
    reserveUrl: 'https://xdungeon.net/layout/res/home.php?go=rev.main&s_zizum=9',
  },
  {
    id: 'xdungeon-tientang', name: 'TIENTANG CITY', emoji: '🏙️',
    branchId: 'dungeon-stella', branch: '던전스텔라',
    themeNum: '59',
    openDaysAhead: 60, openHour: 0,
    reserveUrl: 'https://xdungeon.net/layout/res/home.php?go=rev.main&s_zizum=9',
  },
]

function parseAvailableTimesForTheme(html, themeNum) {
  const sectionRe = new RegExp(
    `_fun_theme_view\\('${themeNum}'\\).*?class="time_box">(.*?)</ul>`,
    's'
  )
  const sectionMatch = html.match(sectionRe)
  if (!sectionMatch) return []

  const timeBox = sectionMatch[1]
  const saleBlocks = [...timeBox.matchAll(/<li class="sale">(.*?)<\/li>/gs)].map(m => m[1])

  return saleBlocks
    .map(block => {
      const m = block.match(/-->\s*(?:<span>[^<]*<\/span>)?\s*(\d{2}:\d{2})/)
      return m ? m[1] : null
    })
    .filter(Boolean)
}

async function fetchAvailableTimesForDate(theme, dateStr) {
  try {
    const res = await fetch(
      `${BASE_URL}?go=rev.main&s_zizum=${ZIZUM}&rev_days=${dateStr}`,
      { headers: { 'User-Agent': UA } }
    )
    const html = await res.text()
    return parseAvailableTimesForTheme(html, theme.themeNum)
  } catch {
    return []
  }
}

export async function fetchXdungeonThemeSlots(themeId, skipDows = new Set()) {
  const theme = XDUNGEON_THEMES.find(t => t.id === themeId)
  if (!theme) throw new Error(`Unknown xdungeon theme: ${themeId}`)

  const dates = filterSkipDays(
    getDateRange(RANGE_DAYS).filter(d => isBookable(d, theme.openDaysAhead, theme.openHour)),
    skipDows
  )
  const results = await Promise.all(
    dates.map(async (dateStr) => [dateStr, await fetchAvailableTimesForDate(theme, dateStr)])
  )
  return Object.fromEntries(results.filter(([, times]) => times.length > 0))
}

export async function fetchAllXdungeonSlots() {
  const results = await Promise.all(
    XDUNGEON_THEMES.map(async (theme) => {
      const slots = await fetchXdungeonThemeSlots(theme.id)
      return [theme.id, buildThemeResult(theme, slots)]
    })
  )
  return Object.fromEntries(results)
}

import { ALL_BRANCHES, ALL_THEMES } from '@/lib/registry'
import MainPage from '@/components/MainPage'

const BRAND_STORE_MAP: Record<string, string[]> = {
  '키이스케이프':     ['후즈데어'],
  '프랭크':          ['프랭크'],
  '지구별방탈출':     ['지구별'],
  'play33':          ['플레이33'],
  '서울이스케이프룸': ['서울 이스케이프'],
  '둠이스케이프':     ['둠 이스케이프'],
  '오아시스뮤지엄':   ['오아시스'],
  '더 챕터':         ['더챕터'],
  '룸이스케이프':     ['룸엘이스케이프'],
  '파노라마':        ['파노라마'],
  '채널27':          ['채널27'],
  '넥스트에디션':     ['넥스트에디션'],
  '제로홍대':         ['제로홍대'],
}

function normalizeTheme(name: string) {
  return name.replace(/\s*\([^)]*\)/g, '').trim()
}

async function fetchRankedThemes() {
  try {
    const res = await fetch('https://colory.mooo.com/bba/ranking', {
      next: { revalidate: 3600 },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
      },
    })
    const html = await res.text()

    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g
    const rows: { store: string; theme: string; score: number }[] = []
    let rowMatch
    while ((rowMatch = rowRegex.exec(html)) !== null) {
      const row = rowMatch[1]
      const cells: string[] = []
      const cellRe = /class="rank-\d+">([\s\S]*?)<\/td>/g
      let cellMatch
      while ((cellMatch = cellRe.exec(row)) !== null) {
        cells.push(cellMatch[1].replace(/<[^>]+>/g, '').trim())
      }
      if (cells.length >= 4) {
        const isRanked = /^\d+$/.test(cells[0]) || row.includes('gold.svg') || row.includes('silver.svg') || row.includes('bronze.svg')
        const score = parseFloat(cells[3])
        if (isRanked && !isNaN(score)) {
          rows.push({ store: cells[1], theme: cells[2], score })
        }
      }
    }

    const branchBrandMap = Object.fromEntries(ALL_BRANCHES.map((b: any) => [b.id, b.brand]))
    const branchLocationMap = Object.fromEntries(ALL_BRANCHES.map((b: any) => [b.id, b.location]))
    const seen = new Set<string>()
    const matched: { themeId: string; themeName: string; themeEmoji: string; branchId: string; branch: string; location: string; score: number }[] = []

    for (const row of rows) {
      const normalizedColory = normalizeTheme(row.theme)
      for (const theme of ALL_THEMES as any[]) {
        if (seen.has(theme.id)) continue
        const brand: string = branchBrandMap[theme.branchId] || ''
        const keywords = BRAND_STORE_MAP[brand] || [brand]
        if (!keywords.some((kw: string) => row.store.includes(kw))) continue
        const normalizedOurs = normalizeTheme(theme.name)
        const nameMatches =
          theme.name === 'PINOCCHIO'
            ? normalizedColory.includes('피노키오')
            : normalizedColory.includes(normalizedOurs) || normalizedOurs.includes(normalizedColory)
        if (nameMatches) {
          matched.push({ themeId: theme.id, themeName: theme.name, themeEmoji: theme.emoji, branchId: theme.branchId, branch: theme.branch, location: branchLocationMap[theme.branchId] || '', score: row.score })
          seen.add(theme.id)
          break
        }
      }
    }

    return matched.sort((a, b) => b.score - a.score)
  } catch {
    return []
  }
}

export default async function Home() {
  const branches = ALL_BRANCHES.map((b: any) => ({
    id: b.id,
    brand: b.brand,
    name: b.name,
    location: b.location,
    themes: (ALL_THEMES as any[])
      .filter((t: any) => t.branchId === b.id)
      .map(({ id, name, emoji }: any) => ({ id, name, emoji })),
  }))

  const rankedThemes = await fetchRankedThemes()

  return <MainPage branches={branches} rankedThemes={rankedThemes} />
}

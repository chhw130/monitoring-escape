import { ALL_BRANCHES, ALL_THEMES } from '@/lib/registry'
import { buildBranchList, filterBranches, paginateBranches } from '@/lib/branchCatalog'
import MainPage from '@/components/MainPage'

const BRAND_STORE_MAP: Record<string, string[]> = {
  '키이스케이프':     ['후즈데어', 'LOG_IN 1', 'LOG_IN 2', '스테이션'],
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
  '제로월드':         ['제로월드'],
  '드림이스케이프':   ['드림이스케이프'],
}

function normalizeTheme(name: string) {
  return name.replace(/\s*\([^)]*\)/g, '').trim()
}

type ColoryRegions = {
  regions: { region: { area2: string }; shops: { shop: string; themes: { theme: string; rating: number; difficulty: number; fear: number }[] }[] }[]
}

// 코로리(colory.dev)는 전체 지역 데이터를 단일 JSON(/data/regions.json)으로 제공한다
async function fetchColoryRows(locations: string[]): Promise<{ store: string; theme: string; score: number; difficulty: number; fear: number }[]> {
  const res = await fetch('https://colory.dev/data/regions.json', { next: { revalidate: 3600 } })
  const data: ColoryRegions = await res.json()

  const locationSet = new Set(locations)
  return data.regions
    .filter(r => locationSet.has(r.region.area2))
    .flatMap(r => r.shops.flatMap(shop =>
      shop.themes.map(t => ({ store: shop.shop, theme: t.theme, score: t.rating, difficulty: t.difficulty, fear: t.fear }))
    ))
}

async function fetchRankedThemes() {
  try {
    const locations = ALL_BRANCHES.map((b: any) => b.location)
    const rows = await fetchColoryRows(locations)

    const branchBrandMap = Object.fromEntries(ALL_BRANCHES.map((b: any) => [b.id, b.brand]))
    const branchLocationMap = Object.fromEntries(ALL_BRANCHES.map((b: any) => [b.id, b.location]))
    const seen = new Set<string>()
    const matched: { themeId: string; themeName: string; themeEmoji: string; branchId: string; branch: string; location: string; score: number; difficulty: number; fear: number }[] = []

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
          matched.push({ themeId: theme.id, themeName: theme.name, themeEmoji: theme.emoji, branchId: theme.branchId, branch: theme.branch, location: branchLocationMap[theme.branchId] || '', score: row.score, difficulty: row.difficulty, fear: row.fear })
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

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; location?: string; page?: string }>
}) {
  const { q = '', location = '전체', page: pageParam } = await searchParams

  const allBranches = buildBranchList()

  const locations = ['전체', ...new Set(allBranches.map((b: any) => b.location))]
  const totalThemes = allBranches.reduce((sum: number, b: any) => sum + b.themes.length, 0)

  const filtered = filterBranches(allBranches, q, location)
  const { page, totalPages, pageBranches } = paginateBranches(filtered, pageParam)

  const rankedThemes = await fetchRankedThemes()

  return (
    <MainPage
      branches={pageBranches}
      rankedThemes={rankedThemes}
      locations={locations}
      totalThemes={totalThemes}
      page={page}
      totalPages={totalPages}
      query={q}
      location={location}
    />
  )
}

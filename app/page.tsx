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

type ColoryManifest = { areas: { area2: { name: string; slug: string }[] }[] }
type ColoryRegion = { shops: { shop: string; themes: { theme: string; rating: number }[] }[] }

// 코로리(colory.dev)는 지역명을 slug로 매핑해야 지역별 테마 데이터(JSON)를 조회할 수 있다
async function fetchColoryRegionSlugs(locations: string[]): Promise<string[]> {
  const res = await fetch('https://colory.dev/data/manifest.json', { next: { revalidate: 3600 } })
  const manifest: ColoryManifest = await res.json()

  const slugByName = new Map<string, string>()
  for (const area1 of manifest.areas) {
    for (const area2 of area1.area2) slugByName.set(area2.name, area2.slug)
  }

  return [...new Set(locations)]
    .map(location => slugByName.get(location))
    .filter((slug): slug is string => Boolean(slug))
}

// 일부 지역 데이터 fetch가 실패해도 나머지 지역 랭킹은 정상 노출되도록 allSettled로 처리
async function fetchColoryRows(locations: string[]): Promise<{ store: string; theme: string; score: number }[]> {
  const slugs = await fetchColoryRegionSlugs(locations)
  const results = await Promise.allSettled(
    slugs.map(slug =>
      fetch(`https://colory.dev/data/regions/${slug}.json`, { next: { revalidate: 3600 } })
        .then(res => res.json() as Promise<ColoryRegion>)
    )
  )

  return results.flatMap(result => {
    if (result.status !== 'fulfilled') {
      console.error('코로리 지역 데이터 fetch 실패:', result.reason)
      return []
    }
    return result.value.shops.flatMap(shop =>
      shop.themes.map(t => ({ store: shop.shop, theme: t.theme, score: t.rating }))
    )
  })
}

async function fetchRankedThemes() {
  try {
    const locations = ALL_BRANCHES.map((b: any) => b.location)
    const rows = await fetchColoryRows(locations)

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

import { BRANCHES, THEMES, fetchThemeSlots, fetchAllSlots } from './keyescape'
import { OASIS_BRANCHES, OASIS_THEMES, fetchOasisThemeSlots, fetchAllOasisSlots } from './oasismuseum'
import { FRANK_BRANCHES, FRANK_THEMES, fetchFrankThemeSlots, fetchAllFrankSlots } from './frank'

// 새 벤뉴 추가 시 이 파일만 수정하면 됩니다.
// VENUES 배열에 { branches, themes, fetchSlots, fetchAll } 형태로 추가하세요.
const VENUES = [
  { branches: BRANCHES,       themes: THEMES,       fetchSlots: fetchThemeSlots,      fetchAll: fetchAllSlots },
  { branches: OASIS_BRANCHES, themes: OASIS_THEMES, fetchSlots: fetchOasisThemeSlots, fetchAll: fetchAllOasisSlots },
  { branches: FRANK_BRANCHES, themes: FRANK_THEMES, fetchSlots: fetchFrankThemeSlots, fetchAll: fetchAllFrankSlots },
]

// { themeId: fetchSlotsFn } — 단일 테마 조회용
export const THEME_FETCHER = Object.fromEntries(
  VENUES.flatMap(({ themes, fetchSlots }) => themes.map(t => [t.id, fetchSlots]))
)

// 전체 지점 목록
export const ALL_BRANCHES = VENUES.flatMap(v => v.branches)

// 전체 테마 목록
export const ALL_THEMES = VENUES.flatMap(v => v.themes)

// 전체 슬롯 일괄 조회 함수 목록
export const ALL_FETCHERS = VENUES.map(v => v.fetchAll)

import { ALL_BRANCHES, ALL_THEMES } from '@/lib/registry'

export const BRANCHES_PER_PAGE = 10

export function buildBranchList() {
  return ALL_BRANCHES.map(b => ({
    id: b.id,
    brand: b.brand,
    name: b.name,
    location: b.location,
    themes: ALL_THEMES
      .filter(t => t.branchId === b.id)
      .map(({ id, name, emoji }) => ({ id, name, emoji })),
  }))
}

export function filterBranches(branches, query, location) {
  const q = query.trim().toLowerCase()
  return branches.filter(b => {
    if (location !== '전체' && b.location !== location) return false
    if (!q) return true
    return (
      b.brand.toLowerCase().includes(q) ||
      b.name.toLowerCase().includes(q) ||
      b.location.toLowerCase().includes(q) ||
      b.themes.some(t => t.name.toLowerCase().includes(q))
    )
  })
}

export function paginateBranches(branches, pageParam) {
  const totalPages = Math.max(1, Math.ceil(branches.length / BRANCHES_PER_PAGE))
  const parsed = parseInt(pageParam ?? '1', 10)
  const page = Math.min(Math.max(1, isNaN(parsed) ? 1 : parsed), totalPages)
  const start = (page - 1) * BRANCHES_PER_PAGE
  return { page, totalPages, pageBranches: branches.slice(start, start + BRANCHES_PER_PAGE) }
}

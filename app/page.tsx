import { ALL_BRANCHES, ALL_THEMES } from '@/lib/registry'
import MainPage from '@/components/MainPage'

export default function Home() {
  const branches = ALL_BRANCHES.map(b => ({
    id: b.id,
    brand: b.brand,
    name: b.name,
    location: b.location,
    themes: ALL_THEMES
      .filter(t => t.branchId === b.id)
      .map(({ id, name, emoji }) => ({ id, name, emoji })),
  }))
  return <MainPage branches={branches} />
}

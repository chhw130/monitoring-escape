import { notFound } from 'next/navigation'
import { ALL_BRANCHES, ALL_THEMES } from '@/lib/registry'
import Monitor from '@/components/Monitor'

interface Props {
  params: Promise<{ branchId: string }>
}

export default async function BranchPage({ params }: Props) {
  const { branchId } = await params
  const branch = ALL_BRANCHES.find(b => b.id === branchId)
  if (!branch) notFound()

  const themes = ALL_THEMES
    .filter(t => t.branchId === branchId)
    .map(({ id, name, emoji, reserveUrl }) => ({ id, name, emoji, reserveUrl }))

  return (
    <Monitor
      branchId={branch.id}
      branchName={`${branch.brand} ${branch.name}`}
      themes={themes}
    />
  )
}

export function generateStaticParams() {
  return ALL_BRANCHES.map(b => ({ branchId: b.id }))
}

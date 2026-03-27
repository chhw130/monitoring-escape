import { notFound } from 'next/navigation'
import { BRANCHES } from '@/lib/keyescape'
import { OASIS_BRANCHES } from '@/lib/oasismuseum'
import { FRANK_BRANCHES } from '@/lib/frank'
import Monitor from '@/components/Monitor'

const ALL_BRANCHES = [...BRANCHES, ...OASIS_BRANCHES, ...FRANK_BRANCHES]

interface Props {
  params: Promise<{ branchId: string }>
}

export default async function BranchPage({ params }: Props) {
  const { branchId } = await params
  const branch = ALL_BRANCHES.find(b => b.id === branchId)
  if (!branch) notFound()

  return (
    <Monitor
      branchId={branch.id}
      branchName={`${branch.brand} ${branch.name}`}
    />
  )
}

export function generateStaticParams() {
  return ALL_BRANCHES.map(b => ({ branchId: b.id }))
}

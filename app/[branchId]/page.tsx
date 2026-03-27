import { notFound } from 'next/navigation'
import { BRANCHES } from '@/lib/keyescape'
import Monitor from '@/components/Monitor'

interface Props {
  params: { branchId: string }
}

export default function BranchPage({ params }: Props) {
  const branch = BRANCHES.find(b => b.id === params.branchId)
  if (!branch) notFound()

  return (
    <Monitor
      branchId={branch.id}
      branchName={`${branch.brand} ${branch.name}`}
    />
  )
}

export function generateStaticParams() {
  return BRANCHES.map(b => ({ branchId: b.id }))
}

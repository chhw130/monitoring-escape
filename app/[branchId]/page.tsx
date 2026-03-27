import { notFound } from 'next/navigation'
import { BRANCHES } from '@/lib/keyescape'
import Monitor from '@/components/Monitor'

interface Props {
  params: Promise<{ branchId: string }>
}

export default async function BranchPage({ params }: Props) {
  const { branchId } = await params
  const branch = BRANCHES.find(b => b.id === branchId)
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

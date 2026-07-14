import { buildBranchList } from '@/lib/branchCatalog'

// 알림 설정 모달 등 전체 지점 목록이 필요한 곳에서 사용 (메인 페이지는 페이지네이션된 목록만 받는다)
export function GET() {
  return Response.json(buildBranchList())
}

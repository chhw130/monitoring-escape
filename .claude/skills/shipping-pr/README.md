> 이 파일은 ship/SKILL.md의 인간용 보조 문서입니다.

# Ship 스킬

## 실행 흐름

```
/ship 입력
  │
  ├─ Step 1   사전 점검
  │           ✋ /review PASS 여부 확인 (하드 게이트 — 미통과 시 즉시 종료)
  │           ✋ type-check · build 확인
  │           gh pr view → PR 존재 여부 감지
  │
  │           ┌── PR 없음 ──────────────────────────────────────┐
  │           │                                                  │
  ├─ Step 2   PR 메타 자료                                       │
  │   ├─ 2-0  pull-request.md 있으면 바로 사용                   │
  │   ├─ 2-1  제목 자동 생성 — gh issue view → "{이슈 제목} (#{번호})"│
  │   ├─ 2-2  PR 타입 확인 — progress.md 타입 필드 참조          │
  │   ├─ 2-3  description 초안 작성 — pr-body.md 기반            │
  │   └─ 2-4  미리보기 + confirm  ✋ OK 받을 때까지 대기          │
  │           │                                                  │
  ├─ Step 3   Push + PR 생성                        PR 있음 → Push + PR 업데이트
  │           git push -u origin {branch}           git push
  │           gh pr create --title "..." --body "..." gh pr edit (description 수정 여부 선택)
  │           Closes #{이슈번호} 자동 추가
  │
  └─ 완료
              ✅ Push + PR 생성 / 업데이트 완료
              PR URL: {url}
```

## PR Description 톤 예시

- ❌ "~한 상태였음. 본 PR로 N단계 완성."
- ✅ "CLI에서 개발부터 PR 생성까지 한 번에 처리해서 DX 향상."
